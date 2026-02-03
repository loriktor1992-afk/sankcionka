#!/usr/bin/env python3
"""
Скрипт для перемещения Mercedes моделей в mercedes.json
и моделей NV200 и Aura в nissan.json
"""

import json
import os
from pathlib import Path

def migrate_mercedes_and_nissan():
    print("🚀 Запуск миграции Mercedes -> mercedes и других моделей...")
    
    models_dir = Path("data/models")
    
    # Список файлов для миграции Mercedes
    mercedes_files = ["gclass.json", "c.json", "s.json", "gt.json", "glcclass.json"]
    mercedes_target_file = models_dir / "mercedes.json"
    
    # Список файлов для миграции Nissan
    nissan_files = ["nv200vanette.json", "aura.json"]
    nissan_target_file = models_dir / "nissan.json"
    
    # Мигрируем Mercedes модели
    all_mercedes_cars = []
    
    for file_name in mercedes_files:
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
        
        # Обновляем make на 'mercedes' и добавляем к общему списку
        for car in cars:
            car['make'] = 'mercedes'
            all_mercedes_cars.append(car)
        
        print(f"✅ Обработан {file_name}, автомобилей: {len(cars)}")
        
        # Очищаем исходный файл
        with open(source_file, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=2)
        
        print(f"🧹 Файл {file_name} очищен")
    
    print(f"\n📊 Всего найдено {len(all_mercedes_cars)} Mercedes автомобилей для миграции")
    
    # Загружаем существующие автомобили из mercedes.json (если файл существует)
    existing_mercedes_cars = []
    if mercedes_target_file.exists():
        with open(mercedes_target_file, 'r', encoding='utf-8') as f:
            existing_mercedes_cars = json.load(f)
            if not isinstance(existing_mercedes_cars, list):
                existing_mercedes_cars = []
    
    print(f"📦 Найдено {len(existing_mercedes_cars)} существующих Mercedes автомобилей в mercedes.json")
    
    # Добавляем перемещенные Mercedes автомобили к существующим
    migrated_mercedes_count = 0
    for car in all_mercedes_cars:
        # Проверяем, не существует ли уже такой автомобиль (по instanceId или slug)
        existing_instance_ids = {c.get('instanceId') for c in existing_mercedes_cars if c.get('instanceId')}
        existing_slugs = {c.get('slug') for c in existing_mercedes_cars if c.get('slug')}
        
        car_instance_id = car.get('instanceId')
        car_slug = car.get('slug')
        
        # Если нет instanceId или slug, или они не существуют, добавляем
        if (not car_instance_id or car_instance_id not in existing_instance_ids) and \
           (not car_slug or car_slug not in existing_slugs):
            existing_mercedes_cars.append(car)
            migrated_mercedes_count += 1
        else:
            print(f"⚠️  Mercedes автомобиль с instanceId '{car_instance_id}' или slug '{car_slug}' уже существует, пропускаем")
    
    # Сохраняем обновленный файл mercedes.json
    with open(mercedes_target_file, 'w', encoding='utf-8') as f:
        json.dump(existing_mercedes_cars, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ {migrated_mercedes_count} новых Mercedes автомобилей добавлено в mercedes.json")
    print(f"📊 Всего Mercedes автомобилей в mercedes.json: {len(existing_mercedes_cars)}")
    
    # Мигрируем Nissan модели
    all_nissan_cars = []
    
    for file_name in nissan_files:
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
        
        # Обновляем make на 'nissan' и добавляем к общему списку
        for car in cars:
            car['make'] = 'nissan'
            all_nissan_cars.append(car)
        
        print(f"✅ Обработан {file_name}, автомобилей: {len(cars)}")
        
        # Очищаем исходный файл
        with open(source_file, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=2)
        
        print(f"🧹 Файл {file_name} очищен")
    
    print(f"\n📊 Всего найдено {len(all_nissan_cars)} Nissan автомобилей для миграции")
    
    # Загружаем существующие автомобили из nissan.json (если файл существует)
    existing_nissan_cars = []
    if nissan_target_file.exists():
        with open(nissan_target_file, 'r', encoding='utf-8') as f:
            existing_nissan_cars = json.load(f)
            if not isinstance(existing_nissan_cars, list):
                existing_nissan_cars = []
    
    print(f"📦 Найдено {len(existing_nissan_cars)} существующих Nissan автомобилей в nissan.json")
    
    # Добавляем перемещенные Nissan автомобили к существующим
    migrated_nissan_count = 0
    for car in all_nissan_cars:
        # Проверяем, не существует ли уже такой автомобиль (по instanceId или slug)
        existing_instance_ids = {c.get('instanceId') for c in existing_nissan_cars if c.get('instanceId')}
        existing_slugs = {c.get('slug') for c in existing_nissan_cars if c.get('slug')}
        
        car_instance_id = car.get('instanceId')
        car_slug = car.get('slug')
        
        # Если нет instanceId или slug, или они не существуют, добавляем
        if (not car_instance_id or car_instance_id not in existing_instance_ids) and \
           (not car_slug or car_slug not in existing_slugs):
            existing_nissan_cars.append(car)
            migrated_nissan_count += 1
        else:
            print(f"⚠️  Nissan автомобиль с instanceId '{car_instance_id}' или slug '{car_slug}' уже существует, пропускаем")
    
    # Сохраняем обновленный файл nissan.json
    with open(nissan_target_file, 'w', encoding='utf-8') as f:
        json.dump(existing_nissan_cars, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ {migrated_nissan_count} новых Nissan автомобилей добавлено в nissan.json")
    print(f"📊 Всего Nissan автомобилей в nissan.json: {len(existing_nissan_cars)}")
    
    print("\n🎉 Миграция Mercedes и Nissan моделей завершена!")

if __name__ == "__main__":
    migrate_mercedes_and_nissan()