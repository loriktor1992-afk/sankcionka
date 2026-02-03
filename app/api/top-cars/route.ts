import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

async function readCarsFromMake(make: string) {
  const filePath = path.join(process.cwd(), 'data/models', `${make}.json`);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const raw = JSON.parse(data);

    if (!Array.isArray(raw)) return [];

    return raw
      .filter((item: any) => item.isTop)
      .map((item: any) => {
        const photos = Array.isArray(item.photos) ? item.photos : [];
        const year = item.year || (item.yearMonth ? String(item.yearMonth).slice(0, 4) : '');

        return {
          make: item.make || make,
          model: item.model || item.name || 'Unknown',
          slug: item.slug || item.instanceId || '',
          year,
          yearMonth: item.yearMonth || '',
          price: item.price || '',
          photos,
        };
      })
      .filter((c: any) => c.slug);
  } catch (err) {
    console.error(`Ошибка чтения топовых моделей для ${make}:`, err);
    return [];
  }
}

export async function GET() {
  try {
    const modelsDir = path.join(process.cwd(), 'data/models');
    let files: string[] = [];

    try {
      files = await fs.readdir(modelsDir);
    } catch {
      return NextResponse.json([]);
    }

    const makeSlugs = files
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/i, ''));

    const allByMake = await Promise.all(makeSlugs.map((make) => readCarsFromMake(make)));
    const topCars = allByMake.flat();

    return NextResponse.json(topCars);
  } catch (error) {
    console.error('Ошибка в /api/top-cars:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
