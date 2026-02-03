#!/usr/bin/env python3
"""
Скрипт для исправления неправильно распределенных брендов и моделей
в существующих JSON файлах автомобилей.
"""

import json
import os
from pathlib import Path

def load_models_data():
    """Загружает все JSON файлы с моделями"""
    models_dir = Path("data/models")
    all_files = list(models_dir.glob("*.json"))
    
    print(f"🔍 Найдено файлов: {len(all_files)}")
    return all_files

def fix_brand_mapping():
    """Правила исправления брендов"""
    corrections = {
        # Правильные соответствия
        'land': 'toyota',
        'cruiser': 'toyota', 
        'prado': 'toyota',
        'yaris': 'toyota',
        'raize': 'toyota',
        'crown': 'toyota',
        
        # Полные названия моделей
        'yaris cros': 'toyota',
        'land cruiser': 'toyota',
        'land cruiser prado': 'toyota',
    }
    
    # Правила по модели
    model_corrections = {
        'land cruiser': 'toyota',
        'land cruiser prado': 'toyota',
        'prado': 'toyota',
        'yaris cros': 'toyota',
        'yaris cross': 'toyota',  # Альтернативное написание
        'yaris': 'toyota',
        'raize': 'toyota',
        'crown': 'toyota',
        'harrier': 'toyota',
        'alphard': 'toyota',
        'vellfire': 'toyota',
        'rav4': 'toyota',
        'hilux': 'toyota',
    }
    
    return corrections, model_corrections

def fix_car_data(car):
    """Исправляет данные одного автомобиля"""
    original_make = car.get('make', '')
    original_model = car.get('model', '').lower()
    
    _, model_corrections = fix_brand_mapping()
    
    # Проверяем модель на предмет корректировки
    corrected_make = original_make.lower()
    
    # Сначала проверяем полные совпадения
    for model_key, correct_brand in model_corrections.items():
        if model_key in original_model:
            corrected_make = correct_brand
            print(f"🔧 Исправлено: '{original_model}' -> '{corrected_make}' (было: '{original_make}')")
            break
    
    # Если не найдено полное совпадение, проверяем частичные
    if corrected_make == original_make.lower():
        for partial_key, correct_brand in model_corrections.items():
            if partial_key in original_model and len(partial_key) >= 3:  # Минимум 3 символа
                corrected_make = correct_brand
                print(f"🔧 Исправлено: '{original_model}' -> '{corrected_make}' (было: '{original_make}')")
                break
    
    car['make'] = corrected_make
    return car

def move_car_to_correct_file(car, all_files):
    """Перемещает автомобиль в правильный файл"""
    target_make = car['make']
    target_file = Path(f"data/models/{target_make}.json")
    
    # Загружаем целевой файл
    target_data = []
    if target_file.exists():
        with open(target_file, 'r', encoding='utf-8') as f:
            try:
                target_data = json.load(f)
                if not isinstance(target_data, list):
                    target_data = []
            except:
                target_data = []
    
    # Добавляем автомобиль, если его там еще нет
    existing_slugs = {c.get('slug', '') for c in target_data}
    car_slug = car.get('slug', '')
    
    if car_slug and car_slug not in existing_slugs:
        target_data.append(car)
        
        # Сохраняем целевой файл
        with open(target_file, 'w', encoding='utf-8') as f:
            json.dump(target_data, f, ensure_ascii=False, indent=2)
        print(f"📦 Автомобиль '{car.get('model', '')}' перемещен в {target_file}")
    elif car_slug:
        # Если автомобиль уже существует, обновляем его данные
        for i, existing_car in enumerate(target_data):
            if existing_car.get('slug') == car_slug:
                target_data[i] = car
                with open(target_file, 'w', encoding='utf-8') as f:
                    json.dump(target_data, f, ensure_ascii=False, indent=2)
                print(f"✏️  Автомобиль '{car.get('model', '')}' обновлен в {target_file}")
                break
    
    return target_file

def main():
    print("🚀 Запуск скрипта исправления брендов...")
    
    files = load_models_data()
    corrections_made = 0
    cars_moved = 0
    
    for file_path in files:
        print(f"\n📁 Обработка файла: {file_path.name}")
        
        # Загружаем данные
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                cars = json.load(f)
                if not isinstance(cars, list):
                    cars = []
            except:
                print(f"❌ Ошибка чтения файла: {file_path}")
                continue
        
        cars_to_remove = []
        cars_to_add = []
        
        for i, car in enumerate(cars):
            original_make = car.get('make', '')
            original_model = car.get('model', '')
            
            # Исправляем бренд
            fixed_car = fix_car_data(car.copy())
            new_make = fixed_car['make']
            
            if new_make != original_make:
                corrections_made += 1
                
                # Добавляем в список для перемещения
                cars_to_add.append(fixed_car)
                
                # Отмечаем для удаления из старого файла
                cars_to_remove.append(i)
                
                # Перемещаем в правильный файл
                move_car_to_correct_file(fixed_car, files)
        
        # Удаляем исправленные автомобили из старого файла
        if cars_to_remove:
            cars = [car for i, car in enumerate(cars) if i not in cars_to_remove]
            
            # Сохраняем обновленный файл
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(cars, f, ensure_ascii=False, indent=2)
            
            print(f"🗑️  Удалено {len(cars_to_remove)} автомобилей из {file_path.name}")
    
    print(f"\n✅ Исправления завершены!")
    print(f"🔧 Сделано корректировок: {corrections_made}")
    print(f"📦 Перемещено автомобилей: {cars_moved}")

if __name__ == "__main__":
    main()