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
      .map((item: any) => {
        const photos = Array.isArray(item.photos) ? item.photos : [];
        const year = item.year || (item.yearMonth ? String(item.yearMonth).slice(0, 4) : '');

        return {
          make: item.make || make,
          model: item.model || item.name || 'Unknown',
          slug: item.slug || item.instanceId || '',
          year,
          yearMonth: item.yearMonth || '',
          mileage: item.mileage || '',
          price: item.price || '',
          fuel: item.fuel || '',
          transmission: item.transmission || '',
          drive: item.drive || '',
          auctionGrade: item.auctionGrade || '',
          status: item.status || 'available',
          isTop: !!item.isTop,
          description: item.description || '',
          photos,
        };
      })
      .filter((c: any) => c.slug);
  } catch (err) {
    console.error(`Ошибка чтения моделей для ${make}:`, err);
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
    const allCars = allByMake.flat();

    return NextResponse.json(allCars);
  } catch (error) {
    console.error('Ошибка в /api/cars:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
