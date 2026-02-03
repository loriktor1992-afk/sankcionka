'use client';

import { useEffect, useMemo, useState, use, useRef } from 'react';
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

export default function ModelPage({ params }: { params: Promise<{ brand: string; model: string }> }) {
  const { brand, model } = use(params);

  const [cars, setCars] = useState<Car[]>([]);
  const [filteredCars, setFilteredCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState({
    mileageFrom: '',
    mileageTo: '',
    priceFrom: '',
    priceTo: '',
    transmission: '',
    drive: '',
  });

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/cars');
        const all: Car[] = await res.json();

        const normalizedBrand = brand.toLowerCase();
        const normalizedModel = model.toLowerCase();

        const modelCars = all.filter(car => {
          if ((car.make || '').toLowerCase() !== normalizedBrand) return false;
          const carModelSlug = slugify(car.model || '');
          return carModelSlug === normalizedModel;
        });

        setCars(modelCars);
        setFilteredCars(modelCars);
      } catch (e) {
        console.error(e);
        setError('Не удалось загрузить автомобили этой модели');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [brand, model]);

  const title = useMemo(() => {
    if (cars.length > 0) return cars[0].model;
    return model.replace(/-/g, ' ');
  }, [cars, model]);

  const handleSearchChange = (e: any) => {
    const { name, value } = e.target;
    setSearch(prev => ({ ...prev, [name]: value }));
  };

  const applySearch = () => {
    let result = cars;

    const mileageFrom = toNumber(search.mileageFrom);
    const mileageTo = toNumber(search.mileageTo);
    if (mileageFrom !== null) {
      result = result.filter(car => {
        const value = toNumber(car.mileage || '');
        return value === null ? true : value >= mileageFrom;
      });
    }
    if (mileageTo !== null) {
      result = result.filter(car => {
        const value = toNumber(car.mileage || '');
        return value === null ? true : value <= mileageTo;
      });
    }

    const priceFrom = toNumber(search.priceFrom);
    const priceTo = toNumber(search.priceTo);
    if (priceFrom !== null) {
      result = result.filter(car => {
        const value = toNumber(car.price || '');
        return value === null ? true : value >= priceFrom;
      });
    }
    if (priceTo !== null) {
      result = result.filter(car => {
        const value = toNumber(car.price || '');
        return value === null ? true : value <= priceTo;
      });
    }

    if (search.transmission) {
      result = result.filter(car => (car.transmission || '').toLowerCase() === search.transmission.toLowerCase());
    }

    if (search.drive) {
      result = result.filter(car => (car.drive || '').toLowerCase() === search.drive.toLowerCase());
    }

    setFilteredCars(result);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <Link
          href={`/marka/${brand}`}
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6 font-medium transition group"
        >
          <span className="group-hover:-translate-x-1 transition-transform mr-2">←</span>
          Назад к маркам {brand}
        </Link>

        <h1 className="text-4xl font-bold mb-8 capitalize text-gray-900">{title}</h1>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Фильтр - Sticky sidebar */}
          <aside className="w-full lg:w-80 lg:sticky lg:top-8 transition-all duration-300">
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Фильтр</h2>
                <button 
                  onClick={() => setSearch({
                    mileageFrom: '', mileageTo: '',
                    priceFrom: '', priceTo: '',
                    transmission: '', drive: ''
                  })}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Сбросить
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Пробег, км</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      name="mileageFrom"
                      value={search.mileageFrom}
                      onChange={handleSearchChange}
                      placeholder="От"
                      className="w-full p-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    />
                    <input
                      type="number"
                      name="mileageTo"
                      value={search.mileageTo}
                      onChange={handleSearchChange}
                      placeholder="До"
                      className="w-full p-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Цена, ₽</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      name="priceFrom"
                      value={search.priceFrom}
                      onChange={handleSearchChange}
                      placeholder="От"
                      className="w-full p-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    />
                    <input
                      type="number"
                      name="priceTo"
                      value={search.priceTo}
                      onChange={handleSearchChange}
                      placeholder="До"
                      className="w-full p-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Коробка (КПП)</label>
                  <select
                    name="transmission"
                    value={search.transmission}
                    onChange={handleSearchChange}
                    className="w-full p-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-sm appearance-none cursor-pointer"
                  >
                    <option value="">Любая</option>
                    <option value="вариатор">Вариатор</option>
                    <option value="автомат">Автомат</option>
                    <option value="робот">Робот</option>
                    <option value="механика">Механика</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Привод</label>
                  <select
                    name="drive"
                    value={search.drive}
                    onChange={handleSearchChange}
                    className="w-full p-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-sm appearance-none cursor-pointer"
                  >
                    <option value="">Любой</option>
                    <option value="передний">Передний</option>
                    <option value="полный">Полный</option>
                    <option value="задний">Задний</option>
                  </select>
                </div>

                <button
                  onClick={applySearch}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all duration-300 shadow-lg shadow-blue-200 active:scale-[0.98]"
                >
                  Показать результаты
                </button>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-2xl border border-blue-100 hidden lg:block">
              <p className="text-xs text-blue-700 leading-relaxed">
                Параметры применяются мгновенно ко всему списку автомобилей данной модели.
              </p>
            </div>
          </aside>

          {/* Список авто */}
          <div className="flex-1">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 p-6 rounded-2xl text-red-600 font-medium border border-red-100 text-center">
                {error}
              </div>
            ) : filteredCars.length === 0 ? (
              <div className="bg-white p-20 rounded-3xl shadow-sm border border-gray-100 text-center">
                <p className="text-gray-400 text-xl font-medium mb-2">Ничего не найдено</p>
                <p className="text-gray-500">Попробуйте изменить параметры фильтра</p>
              </div>
            ) : (
            <div className="grid grid-cols-3 gap-3 md:gap-6">
                {filteredCars.map(car => (
                  <CarCard key={car.slug} car={car} brand={brand} model={model} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

// Mini carousel component for car cards
function CarCard({ car, brand, model }: { car: Car; brand: string; model: string }) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const photos = car.photos || [];

  const nextPhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (photos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
    }
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (photos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
    }
  };

  return (
    <Link
      href={`/instance/${brand}/${model}/${car.slug}`}
      className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group"
    >
      {/* Photo carousel */}
      {photos.length > 0 ? (
        <div className="relative aspect-video overflow-hidden bg-gray-100">
          <img
            src={photos[currentPhotoIndex]}
            alt={car.model}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {photos.length > 1 && (
            <>
              {/* Navigation arrows */}
              <button
                type="button"
                onClick={prevPhoto}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition opacity-0 group-hover:opacity-100"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={nextPhoto}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition opacity-0 group-hover:opacity-100"
              >
                ›
              </button>
              {/* Photo indicator dots */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {photos.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCurrentPhotoIndex(idx);
                    }}
                    className={`h-2 w-2 rounded-full transition-all ${
                      idx === currentPhotoIndex
                        ? 'bg-white w-4'
                        : 'bg-white/50 hover:bg-white/75'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="aspect-video bg-gray-200 flex items-center justify-center">
          <p className="text-gray-400">Нет фото</p>
        </div>
      )}

      {/* Car info */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition truncate pr-2">
            {car.model}
          </h2>
          {car.auctionGrade && (
            <span className="flex-shrink-0 bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded border border-amber-200">
              Grade {car.auctionGrade}
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-4 text-sm">
          <div className="flex flex-col">
            <span className="text-gray-500 text-xs">Год</span>
            <span className="font-semibold text-gray-900">{car.year || car.yearMonth || '—'}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-gray-500 text-xs">Пробег</span>
            <span className="font-semibold text-gray-900">{car.mileage ? `${toNumber(car.mileage)?.toLocaleString()} км` : '—'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500 text-xs">Топливо</span>
            <span className="font-semibold text-gray-900 capitalize">{car.fuel || '—'}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-gray-500 text-xs">Привод</span>
            <span className="font-semibold text-gray-900 capitalize">{car.drive || '—'}</span>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
          <p className="text-green-600 font-bold text-2xl">
            {car.price ? `${toNumber(car.price)?.toLocaleString()} ₽` : 'по запросу'}
          </p>
          <span className="text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Подробнее →
          </span>
        </div>
      </div>
    </Link>
  );
}
