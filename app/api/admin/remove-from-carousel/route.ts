import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = (searchParams.get('slug') || '').toString().trim();

    if (!slug) {
      return NextResponse.json({ error: 'Нет slug' }, { status: 400 });
    }

    const modelsDir = path.join(process.cwd(), 'data/models');

    let files: string[] = [];
    try {
      files = await fs.readdir(modelsDir);
    } catch {
      return NextResponse.json({ error: 'Файлы моделей не найдены' }, { status: 500 });
    }

    let updatedAny = false;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const make = file.replace(/\.json$/i, '');
      const filePath = path.join(modelsDir, file);

      try {
        const data = await fs.readFile(filePath, 'utf-8');
        let cars = JSON.parse(data);
        if (!Array.isArray(cars)) continue;

        let changed = false;
        cars = cars.map((car: any) => {
          if ((car.slug || car.instanceId) === slug && car.isTop) {
            changed = true;
            return { ...car, isTop: false };
          }
          return car;
        });

        if (changed) {
          updatedAny = true;
          await fs.writeFile(filePath, JSON.stringify(cars, null, 2));
        }
      } catch (err) {
        console.error(`Ошибка обновления карусели для ${make}:`, err);
      }
    }

    if (!updatedAny) {
      return NextResponse.json({ error: 'Авто в карусели не найдено' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка в remove-from-carousel:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
