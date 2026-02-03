import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    
    const { make, instanceId, updatedFields } = data;
    
    if (!make || !instanceId || !updatedFields) {
      return NextResponse.json({ error: 'Нужны бренд, instanceId и обновляемые поля' }, { status: 400 });
    }

    const modelsDir = path.join(process.cwd(), 'data/models');
    const filePath = path.join(modelsDir, `${make}.json`);

    let existing: any[] = [];
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      existing = JSON.parse(fileContent);
      if (!Array.isArray(existing)) existing = [];
    } catch {
      existing = [];
    }

    // Найти автомобиль по instanceId
    const carIndex = existing.findIndex((c: any) => c.instanceId === instanceId);
    
    if (carIndex === -1) {
      return NextResponse.json({ error: 'Автомобиль не найден' }, { status: 404 });
    }

    // Обновить поля
    existing[carIndex] = {
      ...existing[carIndex],
      ...updatedFields
    };

    await fs.writeFile(filePath, JSON.stringify(existing, null, 2));

    return NextResponse.json({ success: true, updatedCar: existing[carIndex] });
  } catch (error) {
    console.error('Ошибка в update-car:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}