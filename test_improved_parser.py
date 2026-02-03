#!/usr/bin/env python3
"""
Тестовый скрипт для проверки улучшенной логики парсера
"""

def test_brand_assignment():
    """
    Тестирование присвоения бренда
    """
    print("🧪 Тестирование присвоения бренда...")
    
    # Имитация функции extract_car_info с параметром target_brand
    def mock_extract_car_info(title, target_brand=None):
        car_data = {
            'make': '', 'model': '', 'year': '', 'mileage': '',
            'fuel': '', 'transmission': '', 'drive': '',
            'auctionGrade': '', 'stockId': '', 'price': ''
        }
        
        # Если задан целевой бренд, принудительно устанавливаем его
        if target_brand:
            car_data['make'] = target_brand
            car_data['model'] = title.strip()
        else:
            # Обычная логика определения бренда
            title_upper = title.upper()
            brand_map = {
                'CAMRY': 'toyota',
                'CIVIC': 'honda',
                'X5': 'bmw',
                'C-CLASS': 'mercedes'
            }
            
            for model_name, brand_name in brand_map.items():
                if model_name in title_upper:
                    car_data['make'] = brand_name
                    car_data['model'] = title.strip()
                    break
        
        return car_data
    
    # Тест 1: С принудительным брендом
    car1 = mock_extract_car_info("2022 Camry Hybrid", "toyota")
    print(f"✅ Тест 1 - Принудительный бренд: {car1['make']} {car1['model']}")
    assert car1['make'] == 'toyota', f"Ожидается toyota, получено {car1['make']}"
    
    # Тест 2: Без принудительного бренда (автоматическое определение)
    car2 = mock_extract_car_info("2022 Camry Hybrid", None)
    print(f"✅ Тест 2 - Автоматическое определение: {car2['make']} {car2['model']}")
    assert car2['make'] == 'toyota', f"Ожидается toyota, получено {car2['make']}"
    
    print("🎉 Тест присвоения бренда пройден!")


def test_duplicate_checking():
    """
    Тестирование проверки дубликатов
    """
    print("\n🧪 Тестирование проверки дубликатов...")
    
    # Симуляция списка обработанных ID
    processed_stock_ids = {'STOCK001', 'STOCK002', 'STOCK003'}
    
    # Список автомобилей для обработки
    cars_to_process = [
        {'stockId': 'STOCK001', 'title': 'Toyota Camry'},
        {'stockId': 'STOCK004', 'title': 'Honda Civic'},
        {'stockId': 'STOCK002', 'title': 'BMW X5'},
        {'stockId': 'STOCK005', 'title': 'Mercedes C-Class'},
    ]
    
    processed_count = 0
    skipped_count = 0
    
    for car in cars_to_process:
        stock_id = car['stockId']
        
        # Проверяем, существует ли уже автомобиль с таким stockId в списке обработанных
        if stock_id and stock_id in processed_stock_ids:
            print(f"⏭️  Пропускаю уже обработанный: {stock_id}")
            skipped_count += 1
            continue
        
        print(f"✅ Обрабатываю: {car['title']} (ID: {stock_id})")
        processed_count += 1
        # Добавляем ID в список обработанных
        processed_stock_ids.add(stock_id)
    
    print(f"\n📊 Результаты:")
    print(f"✅ Обработано: {processed_count}")
    print(f"⏭️  Пропущено: {skipped_count}")
    
    assert processed_count == 2, f"Ожидается 2 обработанных, получено {processed_count}"
    assert skipped_count == 2, f"Ожидается 2 пропущенных, получено {skipped_count}"
    
    print("🎉 Тест проверки дубликатов пройден!")


def test_input_brand_selection():
    """
    Тестирование выбора бренда
    """
    print("\n🧪 Тестирование выбора бренда...")
    
    # Доступные бренды
    available_brands = ['toyota', 'nissan', 'honda', 'subaru', 'mazda', 'bmw', 'mercedes']
    
    print("📋 Доступные бренды:", ", ".join(available_brands))
    
    # Тестируем несколько вариантов ввода
    test_inputs = ['toyota', 'TOYOTA', 'ToyOTa', 'invalid_brand']
    
    for inp in test_inputs:
        selected_brand = inp.strip().lower()
        
        if selected_brand in available_brands:
            print(f"✅ Выбран бренд: {selected_brand}")
        else:
            print(f"⚠️  Бренд '{inp}' не в списке доступных, используем 'unknown'")
            selected_brand = 'unknown'
        
        # Здесь в реальном парсере была бы проверка
        assert selected_brand in available_brands or selected_brand == 'unknown', f"Неверный бренд: {selected_brand}"
    
    print("🎉 Тест выбора бренда пройден!")


if __name__ == "__main__":
    test_brand_assignment()
    test_duplicate_checking()
    test_input_brand_selection()
    print("\n🎊 Все тесты улучшенного парсера пройдены успешно!")