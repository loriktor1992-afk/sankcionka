import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const makeParam = searchParams.get('make');

  if (!id) {
    return NextResponse.json({ error: 'Нет ID' }, { status: 400 });
  }

  const slug = id.toString().trim();

  const modelsDir = path.join(process.cwd(), 'data/models');

  try {
    if (makeParam) {
      const make = makeParam.toString().trim().toLowerCase();
      const filePath = path.join(modelsDir, `${make}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      let cars = JSON.parse(data);
      if (!Array.isArray(cars)) cars = [];
      const filtered = cars.filter((c: any) => (c.slug || c.instanceId) !== slug);
      await fs.writeFile(filePath, JSON.stringify(filtered, null, 2));
      return NextResponse.json({ success: true });
    }

    // если марка не указана — ищем по всем файлам
    const files = await fs.readdir(modelsDir);
    let deleted = false;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const filePath = path.join(modelsDir, file);
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        let cars = JSON.parse(data);
        if (!Array.isArray(cars)) continue;
        const before = cars.length;
        cars = cars.filter((c: any) => (c.slug || c.instanceId) !== slug);
        if (cars.length !== before) {
          deleted = true;
          await fs.writeFile(filePath, JSON.stringify(cars, null, 2));
        }
      } catch (err) {
        console.error('Ошибка удаления из файла', file, err);
      }
    }

    if (!deleted) {
      return NextResponse.json({ error: 'Авто не найдено' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 });
  }
}