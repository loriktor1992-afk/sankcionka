import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const make = searchParams.get('make')?.trim().toLowerCase();

  if (!make) {
    return NextResponse.json({ error: 'Марка не указана' }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), 'data/models', `${make}.json`);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const models = JSON.parse(data);

    // Возвращаем только имена моделей для select
    return NextResponse.json(models.map((m: any) => m.name || m.slug || 'Без имени'));
  } catch (err) {
    console.error(`Модели для ${make} не найдены:`, err);
    return NextResponse.json([]);
  }
}