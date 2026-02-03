#!/usr/bin/env python3
"""
Скрипт для перемещения всех автомобилей из yaris.json в toyota.json
с переименованием моделей на 'yaris cross'
"""

import json
import os
from pathlib import Path

def migrate_yaris_to_toyota():
    print("🚀 Запуск миграции yaris -> toyota...")
    
    models_dir = Path("data/models")
    yaris_file = models_dir / "yaris.json"
    toyota_file = models_dir / "toyota.json"
    
    # Проверяем существование файла yaris.json
    if not yaris_file.exists():
        print("❌ Файл yaris.json не найден")
        return
    
    # Загружаем автомобили из yaris.json
    with open(yaris_file, 'r', encoding='utf-8') as f:
        yaris_cars = json.load(f)
    
    print(f"📦 Найдено {len(yaris_cars)} автомобилей в yaris.json")
    
    if not yaris_cars:
        print("✅ Файл yaris.json пуст, миграция не требуется")
        return
    
    # Загружаем существующие автомобили из toyota.json
    toyota_cars = []
    if toyota_file.exists():
        with open(toyota_file, 'r', encoding='utf-8') as f:
            toyota_cars = json.load(f)
            if not isinstance(toyota_cars, list):
                toyota_cars = []
    
    print(f"📦 Найдено {len(toyota_cars)} автомобилей в toyota.json")
    
    # Модифицируем автомобили из yaris: меняем make на 'toyota' и model на 'yaris cross'
    migrated_count = 0
    for car in yaris_cars:
        # Обновляем make и model
        original_model = car.get('model', '')
        car['make'] = 'toyota'
        car['model'] = 'yaris cross'
        
        # Обновляем slug и instanceId, чтобы они соответствовали новой модели
        if 'slug' in car:
            car['slug'] = car['slug'].replace('yaris', 'yaris-cross')
        if 'instanceId' in car:
            car['instanceId'] = car['instanceId'].replace('yaris', 'yaris-cross')
        
        # Добавляем в список toyota автомобилей
        toyota_cars.append(car)
        migrated_count += 1
    
    # Сохраняем обновленный файл toyota.json
    with open(toyota_file, 'w', encoding='utf-8') as f:
        json.dump(toyota_cars, f, ensure_ascii=False, indent=2)
    
    print(f"✅ {migrated_count} автомобилей перемещено в toyota.json")
    
    # Сохраняем пустой массив в yaris.json
    with open(yaris_file, 'w', encoding='utf-8') as f:
        json.dump([], f, ensure_ascii=False, indent=2)
    
    print("✅ Файл yaris.json очищен")
    print("🎉 Миграция завершена!")

if __name__ == "__main__":
    migrate_yaris_to_toyota()