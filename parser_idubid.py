#!/usr/bin/env python3
"""
Улучшенный парсер для idubid.com
- Проверяет STOCK ID перед открытием карточки
- Спрашивает бренд перед началом парсинга
- Пропускает уже обработанные автомобили
- Правильно распознает бренды
"""

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import time
import json
import os
import requests
from urllib.parse import urljoin
import re
from datetime import datetime

# Настройки
API_URL = "http://localhost:3000/api/admin/add-car"
PHOTOS_DIR = "downloaded_photos"
MAX_CARS = 1500
MAX_PHOTOS_PER_CAR = 20
MAX_RETRIES = 3  # Максимальное количество попыток перезапуска
RETRY_DELAY = 10  # Задержка перед перезапуском (секунды)
PROGRESS_FILE = "parser_progress.json"

# Настройки браузера
options = Options()
options.add_argument("--start-maximized")
options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

# Создаём папку для фото
try:
    os.makedirs(PHOTOS_DIR, exist_ok=True)
    print(f"📁 Папка для фото создана: {PHOTOS_DIR}")
except Exception as e:
    print(f"❌ Ошибка создания папки {PHOTOS_DIR}: {e}")
    exit(1)


def save_progress(processed_ids, added, failed, url):
    """Сохраняет прогресс парсинга"""
    try:
        progress = {
            'processed_stock_ids': list(processed_ids),
            'added_count': added,
            'failed_count': failed,
            'current_url': url,
            'timestamp': datetime.now().isoformat()
        }
        with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
            json.dump(progress, f, ensure_ascii=False, indent=2)
        print(f"💾 Прогресс сохранен: {added} новых авто")
    except Exception as e:
        print(f"⚠️  Ошибка сохранения прогресса: {e}")


def load_progress():
    """Загружает сохраненный прогресс"""
    try:
        if os.path.exists(PROGRESS_FILE):
            with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
                progress = json.load(f)
                print(f"📂 Загружен прогресс: {progress['added_count']} новых авто")
                return (
                    set(progress['processed_stock_ids']),
                    progress['added_count'],
                    progress['failed_count'],
                    progress['current_url']
                )
    except Exception as e:
        print(f"⚠️  Ошибка загрузки прогресса: {e}")
    return set(), 0, 0, None


def get_full_quality_image_url(img_tag):
    """Ищет URL фото в полном качестве"""
    if not img_tag:
        return None
    
    possible_attrs = [
        'data-src', 'data-original', 'data-zoom', 'data-large', 
        'data-full', 'data-image', 'src', 'data-lazy-src', 'data-srcset'
    ]
    
    for attr in possible_attrs:
        url = img_tag.get(attr)
        if url:
            if attr == 'data-srcset':
                urls = url.split(',')
                url = urls[0].split()[0] if urls else None
                if not url:
                    continue
            
            if any(word in url.lower() for word in ['thumb', 'small', 'thumbnail', 'medium']):
                replacements = [('thumb', 'large'), ('small', 'large'), ('thumbnail', 'original'), ('medium', 'large')]
                for old, new in replacements:
                    if old in url.lower():
                        url = url.replace(old, new).replace(old.upper(), new.upper())
                        break
            
            if url and not url.startswith('http'):
                url = "https://www.idubid.com" + url
            
            return url
    
    return None


def download_image(url, save_path):
    """Скачивает изображение"""
    try:
        if not url or not url.startswith("http"):
            if url:
                url = "https://www.idubid.com" + url
            else:
                return False
        
        response = requests.get(url, timeout=15, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.idubid.com/'
        })
        
        if response.status_code == 200 and 'image' in response.headers.get('content-type', ''):
            with open(save_path, 'wb') as f:
                f.write(response.content)
            return True
    except Exception as e:
        print(f"   ✗ Ошибка: {e}")
    return False


def clean_description(text):
    """Удаляет номера телефонов и контакты из описания"""
    if not text:
        return ''
    
    text = re.sub(r'\+?[7-8][-\s]?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{2}[-\s]?\d{2}', '', text)
    text = re.sub(r'\+\d{1,3}[-\s]?\(?\d{2,4}\)?[-\s]?\d{2,4}[-\s]?\d{2,4}[-\s]?\d{2,4}', '', text)
    
    lines = text.split('\n')
    cleaned_lines = []
    skip_keywords = ['контакт', 'телефон', 'phone', 'manager', 'менеджер', 'связаться', 'whatsapp', 'telegram', 'email', '@', 'mail']
    
    for line in lines:
        if any(keyword in line.lower() for keyword in skip_keywords):
            continue
        if re.match(r'^[\d\s\-\(\)\+]+$', line.strip()):
            continue
        cleaned_lines.append(line)
    
    text = '\n'.join(cleaned_lines)
    text = re.sub(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', '', text)
    text = re.sub(r'\n\s*\n', '\n', text)
    text = ' '.join(text.split())
    
    return text.strip()


def extract_car_info(title, details, description, detail_soup, target_brand=None):
    """Извлекает структурированные данные"""
    car_data = {
        'make': '', 'model': '', 'year': '', 'yearMonth': '', 'mileage': '',
        'fuel': '', 'engineVolume': '', 'transmission': '', 'drive': '',
        'auctionGrade': '', 'stockId': '', 'price': ''
    }
    
    full_text = detail_soup.get_text()
    
    # STOCK ID
    stock_match = re.search(r'STOCK\s+ID[:\s]*(\d+)', full_text, re.IGNORECASE)
    if stock_match:
        car_data['stockId'] = stock_match.group(1)
    
    # Год и месяц
    date_match = re.search(r'(?:ВЫПУСКА|Release|Date)[:\s]*(\d{4})[-\/](\d{2})', full_text, re.IGNORECASE)
    if date_match:
        car_data['year'] = date_match.group(1)
        car_data['yearMonth'] = date_match.group(2)
    else:
        year_match = re.search(r'(20\d{2})', title + ' ' + details)
        if year_match:
            car_data['year'] = year_match.group(1)
    
    # Объем двигателя и топливо
    engine_fuel_match = re.search(r'(?:ДВИГАТЕЛЯ|Engine)[^:]*[:\s]*(\d{3,4})\s*/\s*([A-Z]+)', full_text, re.IGNORECASE)
    if engine_fuel_match:
        car_data['engineVolume'] = f"{engine_fuel_match.group(1)} CC"
        fuel_raw = engine_fuel_match.group(2).upper()
        fuel_map = {'GASOLINE': 'бензин', 'PETROL': 'бензин', 'DIESEL': 'дизель', 
                    'HYBRID': 'гибрид', 'ELECTRIC': 'электро', 'LPG': 'газ'}
        car_data['fuel'] = fuel_map.get(fuel_raw, fuel_raw.lower())
    
    # Пробег
    mileage = ''
    mileage_block = detail_soup.find(string=re.compile(r'(?:MILEAGE|Пробег)', re.IGNORECASE))
    if mileage_block:
        mileage_text = mileage_block.parent.get_text()
        m_match = re.search(r'(\d[\d\s,]{1,8})\s*(?:km|KM)', mileage_text, re.IGNORECASE)
        if m_match:
            val = re.sub(r'\D', '', m_match.group(1))
            if val and 100 < int(val) < 1000000:
                mileage = val
    car_data['mileage'] = mileage
    
    # Цена - улучшенное извлечение
    # Ищем цену в рублях (точно есть)
    price_patterns = [
        r'(?:Цена|Price|PRICE)[:\s]*([\d\s,]{4,12})\s*(?:₽|RUB|руб|руб\.|RUB\.)',  # Цена: 123456 ₽
        r'([\d\s,]{4,12})\s*(?:₽|RUB|руб|руб\.|RUB\.)',  # 123456 ₽
        r'(?:\₽|RUB|руб)\s*([\d\s,]{4,12})',             # ₽ 123456
        r'(?:Цена|Price|PRICE)[:\s]*([\d\s,]{4,12})',     # Цена: 123456 (без валюты)
        r'([\d\s,]{6,12})\s*(?:₽|RUB|руб)',               # Просто большое число + рубль
    ]
    
    price_found = False
    for pattern in price_patterns:
        matches = re.findall(pattern, full_text, re.IGNORECASE)
        for m in matches:
            val = re.sub(r'\D', '', str(m))
            if val and int(val) > 10000:
                car_data['price'] = val
                price_found = True
                print(f"💰 Найдена цена: {val}")
                break
        if price_found:
            break
    
    # Если не нашли цену, ищем просто большие числа
    if not price_found:
        print("🔍 Цена не найдена по паттернам, ищу большие числа...")
        number_matches = re.findall(r'([\d,]{5,12})', full_text)
        print(f"📊 Найдено чисел: {len(number_matches)}")
        for i, m in enumerate(number_matches[:10]):  # Покажем первые 10
            val = re.sub(r'\D', '', m)
            if val:
                num_val = int(val)
                print(f"   Число {i+1}: {val} ({num_val:,})")
                if 100000 < num_val < 10000000:  # Разумный диапазон цен
                    car_data['price'] = val
                    print(f"💰 Найдена цена (предположительно): {val}")
                    price_found = True
                    break
    
    # Бренд и модель
    brand_map = {
        # Toyota models
        'AQUA': 'toyota', 'PRIUS': 'toyota', 'ALPHARD': 'toyota', 'VELLFIRE': 'toyota',
        'HARRIER': 'toyota', 'CAMRY': 'toyota', 'COROLLA': 'toyota', 'RAV4': 'toyota',
        'LAND CRUISER': 'toyota', 'HILUX': 'toyota', 'YARIS': 'toyota', 'YARIS CROS': 'toyota',
        'RAIZE': 'toyota', 'CROWN': 'toyota', 'PRADO': 'toyota', 'YARIS CROSS': 'toyota',
        
        # Nissan models
        'NOTE': 'nissan', 'LEAF': 'nissan', 'SERENA': 'nissan', 'X-TRAIL': 'nissan',
        
        # Honda models
        'FIT': 'honda', 'VEZEL': 'honda', 'CIVIC': 'honda', 'CR-V': 'honda',
        
        # Subaru models
        'IMPREZA': 'subaru', 'FORESTER': 'subaru', 'OUTBACK': 'subaru', 'WRX': 'subaru',
        
        # Mazda models
        'CX-5': 'mazda', 'MAZDA3': 'mazda', 'MAZDA6': 'mazda',
        
        # BMW models
        'X3': 'bmw', 'X4': 'bmw', 'X5': 'bmw', 'X6': 'bmw', 'X7': 'bmw',
        'I3': 'bmw', 'I8': 'bmw', 'M3': 'bmw', 'M4': 'bmw', 'M5': 'bmw',
        'M6': 'bmw', 'M8': 'bmw',
        
        # Mercedes models
        'C': 'mercedes', 'E': 'mercedes', 'S': 'mercedes', 'G': 'mercedes',
        'GLC': 'mercedes', 'GLE': 'mercedes', 'GLA': 'mercedes',
        'CLA': 'mercedes', 'CLS': 'mercedes', 'AMG': 'mercedes',
        'EQ': 'mercedes',
        
        # Keywords for Land Cruiser and Prado
        'LAND': 'toyota', 'CRUISER': 'toyota', 'PRADO': 'toyota',
    }
    
    title_upper = title.upper()
    
    # Сначала проверяем полные совпадения названий моделей
    full_model_matches = {
        'YARIS CROSS': 'toyota',
        'YARIS CROS': 'toyota',
        'LAND CRUISER': 'toyota',
        'LAND CRUISER PRADO': 'toyota',
        'PRADO': 'toyota',
    }
    
    # Если задан целевой бренд, принудительно устанавливаем его
    if target_brand:
        car_data['make'] = target_brand
        car_data['model'] = title.strip()
    else:
        for full_model_name, brand_name in full_model_matches.items():
            if full_model_name in title_upper:
                car_data['make'] = brand_name
                car_data['model'] = title.strip()
                break
        else:
            # Если нет полного совпадения, ищем по частям
            for model_name, brand_name in brand_map.items():
                if model_name in title_upper:
                    car_data['make'] = brand_name
                    car_data['model'] = title.strip()
                    break
        
        if not car_data['make']:
            parts = title.strip().split()
            if parts:
                car_data['make'] = parts[0].lower()
                car_data['model'] = ' '.join(parts[1:]) if len(parts) > 1 else parts[0]
    
    # Характеристики
    text_lower = full_text.lower()
    if 'hybrid' in text_lower or 'гибрид' in text_lower:
        car_data['fuel'] = 'гибрид'
    elif 'diesel' in text_lower or 'дизель' in text_lower:
        car_data['fuel'] = 'дизель'
    
    if 'cvt' in text_lower or 'вариатор' in text_lower:
        car_data['transmission'] = 'вариатор'
    elif 'automatic' in text_lower or 'автомат' in text_lower:
        car_data['transmission'] = 'автомат'
    
    if '4wd' in text_lower or 'awd' in text_lower or 'полный' in text_lower:
        car_data['drive'] = 'полный'
    elif 'fwd' in text_lower or 'передний' in text_lower:
        car_data['drive'] = 'передний'
    
    grade_match = re.search(r'(?:Grade|Оценка)[:\s]*([SRA\d\.]{1,3})', full_text, re.IGNORECASE)
    if grade_match:
        car_data['auctionGrade'] = grade_match.group(1)
    
    return car_data


def upload_car_to_api(car_data, photo_paths):
    """Отправляет машину на сервер"""
    try:
        data_json = {
            'brand': car_data['make'],
            'model': car_data['model'],
            'year': car_data['year'],
            'yearMonth': car_data.get('yearMonth', ''),
            'mileage': car_data['mileage'],
            'price': car_data.get('price', ''),
            'fuel': car_data['fuel'],
            'transmission': car_data['transmission'],
            'drive': car_data['drive'],
            'auctionGrade': car_data['auctionGrade'],
            'description': car_data.get('description', ''),
            'status': 'available',
            'isTop': False,
            'slug': car_data.get('stockId', ''),
            'instanceId': car_data.get('stockId', ''),
            'engineVolume': car_data.get('engineVolume', ''),
        }
        
        files = [('photos', (os.path.basename(p), open(p, 'rb'), 'image/jpeg')) 
                 for p in photo_paths if os.path.exists(p)]
        
        response = requests.post(
            API_URL,
            data={'data': json.dumps(data_json)},
            files=files,
            timeout=30
        )
        
        for _, file_tuple in files:
            file_tuple[1].close()
        
        if response.status_code == 200:
            result = response.json()
            # Проверяем, является ли машина новой по наличию isNew в ответе или по другим признакам
            is_new = result.get('isNew', False)
            if is_new:
                print(f"✅ НОВАЯ машина добавлена")
            else:
                print(f"🔄 Существующая машина обновлена")
            return True, is_new
        else:
            print(f"❌ Ошибка API: {response.status_code}")
            return False, False
    except Exception as e:
        print(f"💥 Ошибка отправки: {e}")
        return False, False


def run_parser():
    """Основная функция парсера"""
    global processed_stock_ids
    
    # Запрашиваем бренд перед началом парсинга
    print("🔧 Добро пожаловать в улучшенный парсер!")
    print("📋 Доступные бренды: toyota, nissan, honda, subaru, mazda, bmw, mercedes")
    target_brand = input("Введите бренд для парсинга (например, toyota): ").strip().lower()
    
    if not target_brand:
        print("❌ Бренд не указан, используем 'unknown'")
        target_brand = 'unknown'
    
    print(f"🎯 Парсим автомобили бренда: {target_brand}")

    # Загружаем прогресс
    processed_stock_ids, added_count, failed_count, saved_url = load_progress()
    
    print(f"📊 Начальный прогресс: {added_count} добавлено, {failed_count} ошибок")
    print(f"🔄 Возобновляем с URL: {saved_url if saved_url else 'https://www.idubid.com'}")
    
    # Инициализируем Selenium
    options = webdriver.ChromeOptions()
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)
    
    # Добавляем юзер-агент
    options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
    
    driver = webdriver.Chrome(options=options)
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    
    current_url = saved_url if saved_url else "https://www.idubid.com"
    page = 1
    
    try:
        driver.get(current_url)
        time.sleep(5)
        
        # Проверяем капчу
        if "captcha" in driver.page_source.lower() or "robot" in driver.page_source.lower():
            print("⚠️  Обнаружена капча. Решите вручную и нажмите Enter для продолжения...")
            input()
            
        while added_count < MAX_CARS:
            print(f"\n{'='*60}")
            print(f"🔍 СТРАНИЦА {page} | НАЙДЕНО: {added_count}/{MAX_CARS}")
            print(f"{'='*60}")
            
            try:
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "[data-testid='car-card']"))
                )
            except:
                print("⚠️  Карточки не найдены на странице")
                # Попробуем другие возможные селекторы
                possible_selectors = [
                    "article", ".car-item", ".vehicle-card", ".listing-item",
                    "[class*='car'], [class*='vehicle'], [class*='listing']"
                ]
                car_blocks = []
                for selector in possible_selectors:
                    car_blocks = driver.find_elements(By.CSS_SELECTOR, selector)
                    if car_blocks:
                        print(f"✅ Найдено по селектору: {selector}")
                        break
                
                if not car_blocks:
                    print("❌ Ничего не найдено")
                    break
            else:
                car_blocks = driver.find_elements(By.CSS_SELECTOR, "[data-testid='car-card']")
            
            print(f"📋 Найдено карточек: {len(car_blocks)}")
            
            new_cars_found = 0
            
            for idx, block in enumerate(car_blocks, 1):
                # Ищем STOCK ID
                block_html = block.get_attribute("outerHTML")
                soup_block = BeautifulSoup(block_html, "html.parser")
                
                # Ищем текст STOCK ID или Stock ID
                stock_text = None
                for text_elem in soup_block.find_all(string=True):
                    if 'stock' in text_elem.lower() and ('id:' in text_elem.lower() or ':' in text_elem.lower()):
                        stock_text = text_elem
                        break
                
                if stock_text:
                    # Извлекаем ID после двоеточия
                    stock_match = re.search(r'[Ss][Tt][Oo][Cc][Kk]\s*[Ii][Dd]\s*:\s*(\w+)', stock_text)
                    if stock_match:
                        stock_id = stock_match.group(1)
                        if stock_id in processed_stock_ids:
                            print(f"⏭️  Пропускаю уже обработанный: {stock_id}")
                            continue
                        processed_stock_ids.add(stock_id)
                        new_cars_found += 1
                    else:
                        print(f"⏭️  Нет STOCK ID в тексте: {stock_text[:50]}")
                        continue
                else:
                    # Попробуем найти STOCK ID другим способом
                    stock_elements = soup_block.find_all(['span', 'div', 'p'], string=re.compile(r'[Ss][Tt][Oo][Cc][Kk].*[Ii][Dd]', re.IGNORECASE))
                    if stock_elements:
                        for elem in stock_elements:
                            # Ищем ID после найденного элемента
                            parent = elem.parent
                            full_text = parent.get_text(strip=True)
                            stock_match = re.search(r'[Ss][Tt][Oo][Cc][Kk]\s*[Ii][Dd]\s*:\s*(\w+)', full_text)
                            if stock_match:
                                stock_id = stock_match.group(1)
                                if stock_id in processed_stock_ids:
                                    print(f"⏭️  Пропускаю уже обработанный: {stock_id}")
                                    continue
                                processed_stock_ids.add(stock_id)
                                new_cars_found += 1
                                break
                    else:
                        print(f"⏭️  Нет STOCK ID, пропускаем")
                        continue
                
                print(f"\n🚗 [{idx}/{len(car_blocks)}] Обрабатываю: {stock_id}")
                
                # Базовая информация
                title_tag = block.find("h6") or block.find("h2") or block.find("h3")
                title = title_tag.get_text(strip=True) if title_tag else "Неизвестная модель"
                
                details_tags = block.find_all("div", recursive=True)
                details = " | ".join([t.get_text(strip=True) for t in details_tags 
                                     if t.get_text(strip=True) and len(t.get_text(strip=True)) < 100])
                
                # Ссылка на детали
                link_tag = block.find("a", href=True)
                detail_url = link_tag["href"] if link_tag else ""
                if detail_url and not detail_url.startswith("http"):
                    detail_url = "https://www.idubid.com" + detail_url
                
                if not detail_url:
                    print("⚠️  Нет ссылки, пропускаю")
                    continue
                
                print(f"📋 {title}")
                
                try:
                    driver.get(detail_url)
                    time.sleep(3)
                    
                    detail_soup = BeautifulSoup(driver.page_source, "html.parser")
                    
                    # Описание
                    desc_tags = detail_soup.find_all("p")
                    description = " ".join([t.get_text(strip=True) for t in desc_tags 
                                           if t.get_text(strip=True) and len(t.get_text(strip=True)) > 20])[:2000]
                    description = clean_description(description)
                    
                    # Собираем фото
                    all_imgs = detail_soup.find_all("img")
                    photo_urls = []
                    
                    for img in all_imgs:
                        src = get_full_quality_image_url(img)
                        if src:
                            skip_keywords = ['logo', 'icon', 'favicon', 'banner', 'header', 'sprite', 'button']
                            if not any(skip in src.lower() for skip in skip_keywords):
                                photo_urls.append(src)
                    
                    photo_urls = list(dict.fromkeys(photo_urls))[:MAX_PHOTOS_PER_CAR]
                    print(f"📸 Найдено фото: {len(photo_urls)}")
                    
                    # Скачиваем фото
                    downloaded_photos = []
                    for i, photo_url in enumerate(photo_urls, 1):
                        if not os.path.exists(PHOTOS_DIR):
                            os.makedirs(PHOTOS_DIR, exist_ok=True)
                        
                        photo_filename = f"{PHOTOS_DIR}/car_{added_count}_{i}.jpg"
                        if download_image(photo_url, photo_filename):
                            downloaded_photos.append(photo_filename)
                    
                    # Извлекаем данные
                    car_info = extract_car_info(title, details, description, detail_soup, target_brand)
                    car_info['description'] = description
                    
                    if stock_id:
                        car_info['stockId'] = stock_id
                        car_info['instanceId'] = stock_id
                    
                    print(f"🏷️  {car_info['make']} {car_info['model']} | Год: {car_info['year']}")
                    print(f"💰 Цена: {car_info.get('price', 'НЕ НАЙДЕНА')}")
                    print(f"📏 Пробег: {car_info.get('mileage', 'НЕ НАЙДЕН')}")
                    print(f"⛽ Топливо: {car_info.get('fuel', 'НЕ НАЙДЕНО')}")
                    
                    # Отправляем на сервер
                    if downloaded_photos and car_info['make'] and car_info['model']:
                        # Проверяем, существует ли уже автомобиль с таким stockId в списке обработанных
                        stock_id_check = car_info.get('stockId', '')
                        if stock_id_check and stock_id_check in processed_stock_ids:
                            print(f"⏭️  Автомобиль с ID {stock_id_check} уже обработан, пропускаем")
                            # Удаляем временные фото
                            for photo in downloaded_photos:
                                try:
                                    os.remove(photo)
                                except:
                                    pass
                            continue
                        
                        success, is_new = upload_car_to_api(car_info, downloaded_photos)
                        if success:
                            # Добавляем ID в список обработанных независимо от того, был ли он новым или обновлением
                            if stock_id_check:
                                processed_stock_ids.add(stock_id_check)
                            
                            if is_new:
                                added_count += 1
                                print(f"✨ НОВЫХ машин: {added_count}/{MAX_CARS}")
                                
                                # Сохраняем прогресс каждые 5 авто
                                if added_count % 5 == 0:
                                    save_progress(processed_stock_ids, added_count, failed_count, current_url)
                            else:
                                print(f"🔄 Автомобиль с ID {stock_id_check} обновлён")
                        else:
                            failed_count += 1
                        
                        # Удаляем временные фото
                        for photo in downloaded_photos:
                            try:
                                os.remove(photo)
                            except:
                                pass
                    else:
                        print("⚠️  Недостаточно данных")
                        failed_count += 1
                    
                    driver.get(current_url)
                    time.sleep(2)
                
                except Exception as e:
                    print(f"❌ Ошибка обработки карточки: {e}")
                    failed_count += 1
                    continue
            
            # Переход на следующую страницу
            if new_cars_found == 0:
                print("🏁 Больше новых лотов нет")
                break
            
            try:
                print(f"\n🔄 Загружаю следующую страницу...")
                next_btn = driver.find_element(By.XPATH, "//a[contains(text(), 'Next') or contains(text(), 'Следующая')]")
                if next_btn.is_displayed() and next_btn.is_enabled():
                    next_btn.click()
                    time.sleep(5)
                    page += 1
                else:
                    break
            except:
                print("⚠️  Кнопка Next не найдена")
                break
        
        print("\n" + "="*60)
        print("🎉 ПАРСИНГ ЗАВЕРШЁН!")
        print("="*60)
        print(f"✅ Успешно добавлено: {added_count}")
        print(f"❌ Ошибок: {failed_count}")
        print("="*60)
        
        save_progress(processed_stock_ids, added_count, failed_count, driver.current_url)

    except Exception as e:
        print(f"\n💥 Критическая ошибка: {e}")
        import traceback
        traceback.print_exc()
        try:
            save_progress(processed_stock_ids, added_count, failed_count, driver.current_url)
        except:
            pass
        raise

    finally:
        print("\n🔒 Закрываю браузер...")
        try:
            driver.quit()
        except:
            pass
        
        # Чистим временные файлы
        try:
            for file in os.listdir(PHOTOS_DIR):
                os.remove(os.path.join(PHOTOS_DIR, file))
            os.rmdir(PHOTOS_DIR)
        except:
            pass


def main():
    """Главная функция с перезапуском при ошибках"""
    retry_count = 0
    
    while retry_count < MAX_RETRIES:
        try:
            print(f"\n{'='*60}")
            if retry_count == 0:
                print("🚀 ЗАПУСК ПАРСЕРА")
            else:
                print(f"🔄 ПЕРЕЗАПУСК #{retry_count}/{MAX_RETRIES}")
            print(f"{'='*60}\n")
            
            run_parser()
            
            # Удаляем файл прогресса при успехе
            if os.path.exists(PROGRESS_FILE):
                os.remove(PROGRESS_FILE)
                print("✅ Файл прогресса удален")
            
            print("\n✨ ВСЕ ГОТОВО!")
            break
        
        except KeyboardInterrupt:
            print("\n⚠️  Прервано пользователем")
            break
        
        except Exception as e:
            retry_count += 1
            print(f"\n💥 Ошибка: {e}")
            
            if retry_count < MAX_RETRIES:
                print(f"⏳ Повторная попытка через {RETRY_DELAY} секунд...")
                time.sleep(RETRY_DELAY)
            else:
                print(f"\n❌ Превышено максимальное количество попыток ({MAX_RETRIES})")
                print("💾 Прогресс сохранен. Запустите скрипт снова, чтобы продолжить.")


if __name__ == "__main__":
    main()