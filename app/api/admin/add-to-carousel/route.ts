import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const make = (payload.make || payload.brand || '').toString().trim().toLowerCase();
    const slug = (payload.slug || '').toString().trim();

    if (!make || !slug) {
      return NextResponse.json({ error: 'Нет марки или slug' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'data/models', `${make}.json`);

    let cars: any[] = [];
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      cars = JSON.parse(data);
      if (!Array.isArray(cars)) cars = [];
    } catch {
      cars = [];
    }

    let updated = false;

    cars = cars.map((car: any) => {
      if ((car.slug || car.instanceId) === slug) {
        updated = true;
        return { ...car, isTop: true };
      }
      return car;
    });

    if (!updated) {
      return NextResponse.json({ error: 'Авто не найдено' }, { status: 404 });
    }

    await fs.writeFile(filePath, JSON.stringify(cars, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка в add-to-carousel:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
