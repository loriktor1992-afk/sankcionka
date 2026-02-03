import Link from 'next/link';
import fs from 'fs/promises';
import path from 'path';
import CarDetailClient from './CarDetailClient';

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

async function getAllCars() {
  const modelsDir = path.join(process.cwd(), 'data/models');
  try {
    const files = await fs.readdir(modelsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    const all: any[] = [];

    for (const file of jsonFiles) {
      const filePath = path.join(modelsDir, file);
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        const cars = JSON.parse(data);
        if (Array.isArray(cars)) {
          all.push(...cars.filter((c: any) => c.slug));
        }
      } catch (err) {
        console.error(`Error reading ${file}:`, err);
      }
    }
    return all;
  } catch (err) {
    console.error('Error reading models directory:', err);
    return [];
  }
}

async function getInstance(make: string, model: string, instanceSlug: string) {
  const filePath = path.join(process.cwd(), 'data/models', `${make}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const instances = JSON.parse(data);

    if (!Array.isArray(instances) || instances.length === 0) {
      return null;
    }

    // Сначала пробуем точное совпадение по slug / instanceId
    const exact = instances.find((inst: any) =>
      inst.slug === instanceSlug ||
      inst.instanceId === instanceSlug
    );
    if (exact) return exact;

    // Гибкий поиск экземпляра (для старых/нестандартных ссылок)
    const lowerModel = model.toLowerCase();
    const lowerSlug = instanceSlug.toLowerCase();

    const fuzzy = instances.find((inst: any) =>
      inst.slug?.toLowerCase() === lowerSlug ||
      inst.name?.toLowerCase() === lowerSlug ||
      inst.slug?.toLowerCase().includes(lowerSlug) ||
      inst.name?.toLowerCase().includes(lowerSlug) ||
      inst.name?.toLowerCase().includes(lowerModel) ||
      instanceSlug.includes(inst.yearMonth || '') ||
      instanceSlug.includes(inst.instanceId || '')
    );

    return fuzzy || instances[0] || null;
  } catch (err) {
    console.error('Ошибка чтения экземпляра:', err);
    return null;
  }
}

export default async function InstancePage({ params }: { params: Promise<{ make: string; model: string; instance: string }> }) {
  const { make, model, instance } = await params;

  const car = await getInstance(make, model, instance);
  const allCars = await getAllCars();

  // Рекомендации: 5 самых дешевых + 5 с минимальным пробегом (исключая текущую машину)
  const otherCars = allCars.filter((c: any) => c.slug !== instance && c.status !== 'sold');

  const byPrice = otherCars
    .filter((c: any) => toNumber(c.price) !== null)
    .sort((a: any, b: any) => (toNumber(a.price) || 0) - (toNumber(b.price) || 0))
    .slice(0, 5);

  const byMileage = otherCars
    .filter((c: any) => toNumber(c.mileage) !== null)
    .sort((a: any, b: any) => (toNumber(a.mileage) || 0) - (toNumber(b.mileage) || 0))
    .slice(0, 5);

  const recommended = [...byPrice, ...byMileage].filter((c, i, arr) =>
    arr.findIndex(x => x.slug === c.slug) === i
  ).slice(0, 10);

  if (!car) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-4xl font-bold mb-6 text-red-600">Автомобиль не найден</h1>
          <p className="text-xl text-gray-700 mb-4">
            Slug в URL: {instance}
          </p>
          <p className="text-gray-600 mb-8">
            Проверьте JSON: {make}.json — есть ли экземпляр с похожим slug или именем
          </p>
          <Link
            href={`/model/${make}/${model}`}
            className="inline-block bg-blue-600 text-white font-medium py-3 px-8 rounded-lg hover:bg-blue-700 transition"
          >
            ← Назад к модели {model.replace(/-/g, ' ')}
          </Link>
        </div>
      </div>
    );
  }

  return <CarDetailClient car={car} make={make} model={model} recommended={recommended} />;
}