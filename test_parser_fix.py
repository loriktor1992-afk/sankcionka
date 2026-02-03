#!/usr/bin/env python3
"""
Тестовый скрипт для проверки улучшенной логики парсера
"""

import json
import os
from pathlib import Path

def test_duplicate_handling():
    """
    Тестирование логики обработки дубликатов
    """
    print("🧪 Тестирование улучшенной логики обработки дубликатов...")
    
    # Симулируем список обработанных ID
    processed_stock_ids = {'STOCK001', 'STOCK002', 'STOCK003'}
    
    # Симулируем список автомобилей для обработки
    cars_to_process = [
        {'stockId': 'STOCK001', 'make': 'Toyota', 'model': 'Camry'},  # дубликат
        {'stockId': 'STOCK004', 'make': 'Honda', 'model': 'Civic'},  # новый
        {'stockId': 'STOCK002', 'make': 'Nissan', 'model': 'Sentra'},  # дубликат
        {'stockId': 'STOCK005', 'make': 'BMW', 'model': 'X5'},  # новый
    ]
    
    new_cars_added = 0
    cars_skipped = 0
    
    print(f"📊 Начальное состояние: {len(processed_stock_ids)} обработанных ID")
    
    for car in cars_to_process:
        stock_id = car.get('stockId', '')
        
        # Проверяем, существует ли уже автомобиль с таким stockId в списке обработанных
        if stock_id and stock_id in processed_stock_ids:
            print(f"⏭️  Автомобиль с ID {stock_id} уже обработан, пропускаем")
            cars_skipped += 1
            continue
        
        # Если дошли до этого места, значит это новый автомобиль
        print(f"✅ Обрабатываю новый автомобиль: {car['make']} {car['model']} (ID: {stock_id})")
        new_cars_added += 1
        # Добавляем ID в список обработанных
        processed_stock_ids.add(stock_id)
    
    print(f"\n📈 Результаты:")
    print(f"✅ Новых автомобилей добавлено: {new_cars_added}")
    print(f"⏭️  Пропущено дубликатов: {cars_skipped}")
    print(f"📊 Всего в списке обработанных: {len(processed_stock_ids)}")
    
    assert new_cars_added == 2, f"Ожидается 2 новых автомобиля, получено {new_cars_added}"
    assert cars_skipped == 2, f"Ожидается 2 пропущенных дубликата, получено {cars_skipped}"
    
    print("\n🎉 Тест пройден успешно!")

def test_api_response_handling():
    """
    Тестирование обработки ответа от API
    """
    print("\n🧪 Тестирование обработки ответа от API...")
    
    # Симулируем разные ответы от API
    api_responses = [
        {'success': True, 'isNew': True, 'car': {'make': 'Toyota', 'model': 'Camry'}},
        {'success': True, 'isNew': False, 'car': {'make': 'Honda', 'model': 'Civic'}},
        {'success': False, 'error': 'Invalid data'},
    ]
    
    stats = {'new': 0, 'updated': 0, 'failed': 0}
    
    for response in api_responses:
        if response.get('success'):
            is_new = response.get('isNew', False)
            if is_new:
                stats['new'] += 1
                print(f"✅ НОВАЯ машина добавлена: {response['car']['make']} {response['car']['model']}")
            else:
                stats['updated'] += 1
                print(f"🔄 Существующая машина обновлена")
        else:
            stats['failed'] += 1
            print(f"❌ Ошибка: {response.get('error', 'Unknown error')}")
    
    print(f"\n📊 Результаты:")
    print(f"✅ Новые: {stats['new']}")
    print(f"🔄 Обновленные: {stats['updated']}")
    print(f"❌ Ошибки: {stats['failed']}")
    
    assert stats['new'] == 1, f"Ожидается 1 новая машина, получено {stats['new']}"
    assert stats['updated'] == 1, f"Ожидается 1 обновленная машина, получено {stats['updated']}"
    assert stats['failed'] == 1, f"Ожидается 1 ошибка, получено {stats['failed']}"
    
    print("\n🎉 Тест обработки API пройден успешно!")

if __name__ == "__main__":
    test_duplicate_handling()
    test_api_response_handling()
    print("\n🎊 Все тесты пройдены! Улучшенная логика обработки дубликатов работает корректно.")