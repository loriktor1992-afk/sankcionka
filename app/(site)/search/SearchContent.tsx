'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  return value.toString().trim().toLowerCase().replace(/[^a-z0-9а-яё\s-]/gi, '').replace(/\s+/g, '-');
}

function toNumber(value: string | undefined | null): number | null {
  if (!value) return null;
  const digits = value.toString().replace(/[^0-9]/g, '');
  if (!digits) return null;
  const num = parseInt(digits, 10);
  return Number.isNaN(num) ? null : num;
}

function extractYear(yearStr: string | undefined): number | null {
  if (!yearStr) return null;
  const match = yearStr.match(/\d{4}/);
  if (!match) return null;
  return parseInt(match[0], 10);
}

export default function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q')?.toLowerCase() || '';
  const yearFrom = parseInt(searchParams.get('yearFrom') || '0') || 0;
  const yearTo = parseInt(searchParams.get('yearTo') || '9999') || 9999;
  const priceFrom = parseInt(searchParams.get('priceFrom') || '0') || 0;
  const priceTo = parseInt(searchParams.get('priceTo') || '999999999') || 999999999;
  const fuel = searchParams.get('fuel')?.toLowerCase() || '';
  const drive = searchParams.get('drive')?.toLowerCase() || '';
  const transmission = searchParams.get('transmission')?.toLowerCase() || '';

  const [cars, setCars] = useState<Car[]>([]);
  const [results, setResults] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCars() {
      try {
        const res = await fetch('/api/cars');
        const data: Car[] = await res.json();
        setCars(data.filter(c => c.status !== 'sold'));
      } catch (err) {
        console.error('Ошибка загрузки автомобилей:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCars();
  }, []);

  useEffect(() => {
    let filtered = cars;
    if (q) {
      filtered = filtered.filter(c => c.make.toLowerCase().includes(q) || c.model.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
    }
    if (yearFrom > 0) {
      filtered = filtered.filter(c => {
        const year = extractYear(c.year || c.yearMonth);
        return year ? year >= yearFrom : true;
      });
    }
    if (yearTo < 9999) {
      filtered = filtered.filter(c => {
        const year = extractYear(c.year || c.yearMonth);
        return year ? year <= yearTo : true;
      });
    }
    if (priceFrom > 0) {
      filtered = filtered.filter(c => {
        const price = toNumber(c.price);
        return price ? price >= priceFrom : true;
      });
    }
    if (priceTo < 999999999) {
      filtered = filtered.filter(c => {
        const price = toNumber(c.price);
        return price ? price <= priceTo : true;
      });
    }
    if (fuel) filtered = filtered.filter(c => c.fuel?.toLowerCase().includes(fuel));
    if (drive) filtered = filtered.filter(c => c.drive?.toLowerCase().includes(drive));
    if (transmission) filtered = filtered.filter(c => c.transmission?.toLowerCase().includes(transmission));
    setResults(filtered);
  }, [cars, q, yearFrom, yearTo, priceFrom, priceTo, fuel, drive, transmission]);

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">Результаты поиска</h1>
      {loading ? <p className="text-lg text-gray-600 mb-8">Загрузка...</p> : <p className="text-lg text-gray-600 mb-8">Найдено <strong className="text-blue-600">{results.length}</strong> автомобилей</p>}
      {!loading && results.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-lg">
          <p className="text-2xl text-gray-700 mb-4 font-semibold">Ничего не найдено</p>
          <p className="text-gray-600 mb-6">Попробуйте изменить параметры поиска</p>
          <Link href="/" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">Вернуться на главную</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((car) => (
            <Link key={car.slug} href={`/instance/${car.make}/${slugify(car.model)}/${car.slug}`} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group">
              {car.photos && car.photos[0] ? (
                <div className="aspect-video overflow-hidden bg-gray-100">
                  <img src={car.photos[0]} alt={car.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              ) : <div className="aspect-video bg-gray-200 flex items-center justify-center text-gray-400">Нет фото</div>}
              <div className="p-5">
                <p className="text-sm text-gray-500 mb-1">{car.make?.toUpperCase()}</p>
                <h2 className="text-xl font-bold mb-2 text-gray-900 group-hover:text-blue-600 transition">{car.model}</h2>
                <p className="text-gray-600 mb-3 text-sm">{car.year || car.yearMonth || '—'}</p>
                <div className="text-sm text-gray-600 mb-4 space-y-1">
                  {car.fuel && <p>Топливо: <span className="font-semibold">{car.fuel}</span></p>}
                  {car.drive && <p>Привод: <span className="font-semibold">{car.drive}</span></p>}
                  {car.transmission && <p>КПП: <span className="font-semibold">{car.transmission}</span></p>}
                  {car.mileage && <p>Пробег: <span className="font-semibold">{toNumber(car.mileage)?.toLocaleString()} км</span></p>}
                </div>
                <p className="text-2xl font-bold text-green-600">{car.price ? `${toNumber(car.price)?.toLocaleString()} ₽` : 'По запросу'}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
