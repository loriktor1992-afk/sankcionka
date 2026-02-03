'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Car = {
  make: string;
  model: string;
  slug: string;
};

export default function Header() {
  const [query, setQuery] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [drive, setDrive] = useState('');
  const [transmission, setTransmission] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  const [brands, setBrands] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [allCars, setAllCars] = useState<Car[]>([]);

  const router = useRouter();

  // Загрузка всех автомобилей при монтировании
  useEffect(() => {
    async function loadCars() {
      try {
        const res = await fetch('/api/cars');
        const data: Car[] = await res.json();
        setAllCars(data);

        // Извлекаем уникальные бренды
        const uniqueBrands = Array.from(new Set(data.map(c => c.make))).sort();
        setBrands(uniqueBrands);
      } catch (err) {
        console.error('Ошибка загрузки автомобилей:', err);
      }
    }
    loadCars();
  }, []);

  // Обновление списка моделей при выборе бренда
  useEffect(() => {
    if (selectedBrand) {
      const brandCars = allCars.filter(c => c.make === selectedBrand);
      const uniqueModels = Array.from(new Set(brandCars.map(c => c.model))).sort();
      setModels(uniqueModels);
      setSelectedModel(''); // Сбрасываем выбранную модель
    } else {
      setModels([]);
      setSelectedModel('');
    }
  }, [selectedBrand, allCars]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams();

    // Используем selectedBrand/selectedModel если выбраны, иначе текстовый query
    if (selectedBrand) {
      params.set('q', selectedBrand);
    } else if (query) {
      params.set('q', query);
    }

    if (selectedModel) {
      params.set('q', selectedModel);
    }

    if (yearFrom) params.set('yearFrom', yearFrom);
    if (yearTo) params.set('yearTo', yearTo);
    if (priceFrom) params.set('priceFrom', priceFrom);
    if (priceTo) params.set('priceTo', priceTo);
    if (fuelType) params.set('fuel', fuelType);
    if (drive) params.set('drive', drive);
    if (transmission) params.set('transmission', transmission);

    router.push(`/search?${params.toString()}`);
  };

  return (
    <header className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-4 shadow-xl border-b border-gray-700">
      <div className="container mx-auto px-4">

        
        {/* Нижняя строка: логотип */}
        <div className="flex justify-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300 transform rotate-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 18.5c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V12H5v6.5zm12.5-9c.8 0 1.5-.7 1.5-1.5S18.3 6.5 17.5 6.5 16 7.2 16 8s.7 1.5 1.5 1.5zM7.5 9C8.3 9 9 8.3 9 7.5S8.3 6 7.5 6 6 6.7 6 7.5 6.7 9 7.5 9z" />
                  <circle cx="17.5" cy="8" r="1.5" />
                  <circle cx="7.5" cy="8" r="1.5" />
                </svg>
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl opacity-0 group-hover:opacity-30 blur transition-opacity duration-300"></div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black tracking-tight group-hover:text-yellow-300 transition-colors duration-300">
                TachkiMarket<span className="text-yellow-300">.ru</span>
              </div>

            </div>
          </Link>
        </div>

        {/* Поисковая форма на всю ширину */}
        <form onSubmit={handleSearch} className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Первый ряд */}
            <div className="md:col-span-2 lg:col-span-1">
              <select
                value={selectedBrand}
                onChange={e => setSelectedBrand(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:border-blue-500 hover:border-gray-500 transition-all duration-300"
              >
                <option value="">Выберите бренд</option>
                {brands.map(brand => (
                  <option key={brand} value={brand}>
                    {brand.charAt(0).toUpperCase() + brand.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="md:col-span-2 lg:col-span-1">
              {selectedBrand ? (
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:border-blue-500 hover:border-gray-500 transition-all duration-300"
                >
                  <option value="">Выберите модель</option>
                  {models.map(model => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Или введите марку/модель..."
                  className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:border-blue-500 hover:border-gray-500 transition-all duration-300"
                />
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 md:col-span-2 lg:col-span-2">
              <select
                value={yearFrom}
                onChange={e => setYearFrom(e.target.value)}
                className="px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:border-blue-500 hover:border-gray-500 transition-all duration-300"
              >
                <option value="">Год от</option>
                {Array.from({ length: 31 }, (_, i) => 2026 - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              
              <select
                value={yearTo}
                onChange={e => setYearTo(e.target.value)}
                className="px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:border-blue-500 hover:border-gray-500 transition-all duration-300"
              >
                <option value="">Год до</option>
                {Array.from({ length: 31 }, (_, i) => 2026 - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Второй ряд */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                value={priceFrom}
                onChange={e => setPriceFrom(e.target.value)}
                placeholder="Цена от"
                className="px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:border-blue-500 hover:border-gray-500 transition-all duration-300"
              />
              
              <input
                type="number"
                value={priceTo}
                onChange={e => setPriceTo(e.target.value)}
                placeholder="Цена до"
                className="px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:border-blue-500 hover:border-gray-500 transition-all duration-300"
              />
            </div>
            
            <select
              value={fuelType}
              onChange={e => setFuelType(e.target.value)}
              className="px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:border-blue-500 hover:border-gray-500 transition-all duration-300"
            >
              <option value="">Топливо</option>
              <option value="гибрид">Гибрид</option>
              <option value="электро">Электро</option>
              <option value="бензин">Бензин</option>
              <option value="дизель">Дизель</option>
            </select>
            
            <select
              value={drive}
              onChange={e => setDrive(e.target.value)}
              className="px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:border-blue-500 hover:border-gray-500 transition-all duration-300"
            >
              <option value="">Привод</option>
              <option value="передний">Передний</option>
              <option value="полный">Полный</option>
              <option value="задний">Задний</option>
            </select>
            
            <select
              value={transmission}
              onChange={e => setTransmission(e.target.value)}
              className="px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:border-blue-500 hover:border-gray-500 transition-all duration-300"
            >
              <option value="">Коробка</option>
              <option value="вариатор">Вариатор</option>
              <option value="автомат">Автомат</option>
              <option value="робот">Робот</option>
              <option value="механика">Механика</option>
            </select>
          </div>
          
          {/* Кнопка поиска на всю ширину */}
          <div className="mt-6">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-6 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <span>🔍</span>
              <span>Найти автомобили</span>
            </button>
          </div>
        </form>
      </div>
    </header>
  );
}