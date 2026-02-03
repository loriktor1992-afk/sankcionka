'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

type Car = {
  make: string;
  model: string;
  slug: string;
  year?: string;
  yearMonth?: string;
  mileage?: string;
  price?: string;
  fuel?: string;
  transmission?: string;
  drive?: string;
  auctionGrade?: string;
  status?: string;
  isTop?: boolean;
  description?: string;
  photos?: string[];
};

function slugify(value: string) {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s-]/gi, '')
    .replace(/\s+/g, '-');
}

function toNumber(value: string | undefined | null): number | null {
  if (!value) return null;
  const digits = value.toString().replace(/[^0-9]/g, '');
  if (!digits) return null;
  const num = parseInt(digits, 10);
  return Number.isNaN(num) ? null : num;
}

type Brand = {
  slug: string;
  name: string;
  modelsCount: number;
  // grades убраны с главной страницы
};

export default function Home() {
  const [search, setSearch] = useState({
    brand: '',
    model: '',
    mileageFrom: '',
    mileageTo: '',
    priceFrom: '',
    priceTo: '',
    transmission: '',
    drive: '',
  });

  const [cars, setCars] = useState<Car[]>([]);
  const [topCars, setTopCars] = useState<Car[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [carsRes, topRes, brandsRes] = await Promise.all([
          fetch('/api/cars'),
          fetch('/api/top-cars'),
          fetch('/api/get-makes'), // Нам нужно убедиться что этот эндпоинт есть или возвращает makes.json
        ]);

        const carsData: Car[] = await carsRes.json();
        const topData: Car[] = await topRes.json();
        const brandsData: Brand[] = await brandsRes.json();

        setCars(carsData);
        setTopCars(topData);
        setAllBrands(brandsData);
      } catch (e) {
        console.error(e);
        setError('Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const brands = useMemo(
    () => Array.from(new Set(cars.map(car => car.make))).sort(),
    [cars]
  );

  const modelsForBrand = useMemo(() => {
    const subset = search.brand ? cars.filter(car => car.make === search.brand) : cars;
    return Array.from(new Set(subset.map(car => car.model))).sort();
  }, [cars, search.brand]);

  const handleSearchChange = (e: any) => {
    const { name, value } = e.target;
    setSearch(prev => ({ ...prev, [name]: value }));
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const amount = container.clientWidth * 0.8;
    const delta = direction === 'left' ? -amount : amount;
    container.scrollBy({ left: delta, behavior: 'smooth' });
  };

  // Подсчет общего количества авто
  const totalCars = cars.length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Градиентный хедер с логотипом и счетчиком */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 shadow-2xl">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Логотип */}
            <div className="flex items-center gap-4 group">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg group-hover:shadow-2xl group-hover:scale-110 transition-all duration-300 transform rotate-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 18.5c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V12H5v6.5zm12.5-9c.8 0 1.5-.7 1.5-1.5S18.3 6.5 17.5 6.5 16 7.2 16 8s.7 1.5 1.5 1.5zM7.5 9C8.3 9 9 8.3 9 7.5S8.3 6 7.5 6 6 6.7 6 7.5 6.7 9 7.5 9z" />
                    <circle cx="17.5" cy="8" r="1.5" />
                    <circle cx="7.5" cy="8" r="1.5" />
                  </svg>
                </div>
                <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl opacity-0 group-hover:opacity-30 blur transition-opacity duration-300"></div>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight group-hover:text-yellow-300 transition-colors duration-300">
                  TachkiMarket<span className="text-yellow-300">.ru</span>
                </h1>
                <p className="text-blue-100 text-sm font-medium mt-1 max-w-lg">
                  Автомобили с нашей стоянки в Японии без пробега по России и под заказ с аукционов Японии
                </p>

              </div>
            </div>
            
            {/* Счетчик авто */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl px-8 py-5 border border-white/20 shadow-lg transform hover:scale-105 transition-transform duration-300">
              <div className="text-center">
                <div className="text-4xl font-bold text-white">{totalCars.toLocaleString()}</div>
                <div className="text-blue-100 text-sm font-medium mt-1">авто в наличии</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-12">
        <div className="w-full">
          {/* Карусель топовых авто */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-6 text-gray-900 flex items-center gap-3">
              <span className="bg-gradient-to-r from-red-500 to-orange-500 text-transparent bg-clip-text">🔥</span>
              Самые выгодные предложения
            </h2>
            {topCars.length === 0 ? (
              <div className="bg-white/50 backdrop-blur rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
                <p className="text-gray-500 text-lg">Администратор пока не добавил авто в карусель.</p>
              </div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => scrollCarousel('left')}
                  className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200"
                >
                  <span className="text-3xl text-gray-700">‹</span>
                </button>
                <div
                  ref={carouselRef}
                  className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth scrollbar-hide"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {topCars.map(car => (
                    <Link
                      key={car.slug}
                      href={`/instance/${car.make}/${slugify(car.model)}/${car.slug}`}
                      className="flex-shrink-0 w-[280px] bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden snap-start group"
                    >
                      {car.photos && car.photos[0] && (
                        <div className="relative overflow-hidden aspect-video">
                          <img
                            src={car.photos[0]}
                            alt={car.model}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute top-3 right-3 bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                            ХИТ!
                          </div>
                        </div>
                      )}
                      <div className="p-5">
                        <p className="text-3xl font-bold text-green-600 mb-2">
                          {car.price ? `${toNumber(car.price)?.toLocaleString()} ₽` : 'Цена по запросу'}
                        </p>
                        <p className="text-sm text-gray-500 mb-1">{car.make?.toUpperCase()}</p>
                        <p className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition">
                          {car.model}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                          {car.year || car.yearMonth || ''} {car.mileage ? `• ${toNumber(car.mileage)?.toLocaleString()} км` : ''}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => scrollCarousel('right')}
                  className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200"
                >
                  <span className="text-3xl text-gray-700">›</span>
                </button>
              </div>
            )}
          </div>

          {/* Основная сетка брендов */}
          <h2 className="text-3xl font-bold mb-6 text-gray-900 flex items-center gap-3 mt-16">
            <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">🚗</span>
            Популярные бренды
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
            {allBrands.map(brand => (
              <Link
                key={brand.slug}
                href={`/marka/${brand.slug}`}
                className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 p-6 text-center overflow-hidden border border-gray-100 hover:border-blue-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all duration-500" />
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                <p className="relative text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors duration-300 mb-2">
                  {brand.name}
                </p>
                <p className="relative text-xs text-gray-500 font-medium group-hover:text-gray-700 transition-colors">
                  {brand.modelsCount.toLocaleString()} предложений
                </p>
                <div className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
