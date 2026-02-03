#!/usr/bin/env python3
"""
Скрипт для перемещения всех BMW моделей в один файл bmw.json
с обновлением бренда на 'bmw'
"""

import json
import os
from pathlib import Path

def migrate_bmw_models():
    print("🚀 Запуск миграции BMW моделей -> bmw...")
    
    models_dir = Path("data/models")
    
    # Список файлов для миграции
    source_files = ["x3.json", "x5.json", "x6.json", "x7.json", "7.json", "8.json", "bike(bmw).json"]
    target_file = models_dir / "bmw.json"
    
    all_bmw_cars = []
    
    for file_name in source_files:
        source_file = models_dir / file_name
        
        if not source_file.exists():
            print(f"⚠️  Файл {file_name} не найден, пропускаем")
            continue
        
        # Загружаем автомобили из исходного файла
        with open(source_file, 'r', encoding='utf-8') as f:
            cars = json.load(f)
        
        print(f"📦 Найдено {len(cars)} автомобилей в {file_name}")
        
        if not cars:
            print(f"✅ Файл {file_name} пуст")
            continue
        
        # Обновляем make на 'bmw' и добавляем к общему списку
        for car in cars:
            original_make = car.get('make', '')
            original_model = car.get('model', '')
            
            car['make'] = 'bmw'
            
            # Если модель не содержит информацию о серии BMW, можно обновить
            # но оставим оригинальное название модели
            all_bmw_cars.append(car)
        
        print(f"✅ Обработан {file_name}, автомобилей: {len(cars)}")
        
        # Очищаем исходный файл
        with open(source_file, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=2)
        
        print(f"🧹 Файл {file_name} очищен")
    
    print(f"\n📊 Всего найдено {len(all_bmw_cars)} автомобилей для миграции")
    
    if not all_bmw_cars:
        print("✅ Нет автомобилей для миграции")
        return
    
    # Загружаем существующие автомобили из bmw.json (если файл существует)
    existing_bmw_cars = []
    if target_file.exists():
        with open(target_file, 'r', encoding='utf-8') as f:
            existing_bmw_cars = json.load(f)
            if not isinstance(existing_bmw_cars, list):
                existing_bmw_cars = []
    
    print(f"📦 Найдено {len(existing_bmw_cars)} существующих автомобилей в bmw.json")
    
    # Добавляем перемещенные автомобили к существующим
    migrated_count = 0
    for car in all_bmw_cars:
        # Проверяем, не существует ли уже такой автомобиль (по instanceId или slug)
        existing_instance_ids = {c.get('instanceId') for c in existing_bmw_cars if c.get('instanceId')}
        existing_slugs = {c.get('slug') for c in existing_bmw_cars if c.get('slug')}
        
        car_instance_id = car.get('instanceId')
        car_slug = car.get('slug')
        
        # Если нет instanceId или slug, или они не существуют, добавляем
        if (not car_instance_id or car_instance_id not in existing_instance_ids) and \
           (not car_slug or car_slug not in existing_slugs):
            existing_bmw_cars.append(car)
            migrated_count += 1
        else:
            print(f"⚠️  Автомобиль с instanceId '{car_instance_id}' или slug '{car_slug}' уже существует, пропускаем")
    
    # Сохраняем обновленный файл bmw.json
    with open(target_file, 'w', encoding='utf-8') as f:
        json.dump(existing_bmw_cars, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ {migrated_count} новых автомобилей добавлено в bmw.json")
    print(f"📊 Всего автомобилей в bmw.json: {len(existing_bmw_cars)}")
    print("🎉 Миграция BMW моделей завершена!")

if __name__ == "__main__":
    migrate_bmw_models()