import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ make: string }> }
) {
  // В Next.js 15+ params — это Promise, его нужно дождаться через await
  const { make } = await params;

  const filePath = path.join(process.cwd(), 'data/models', `${make}.json`);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const cars = JSON.parse(data);
    
    if (!Array.isArray(cars)) {
      return NextResponse.json([]);
    }

    return NextResponse.json(cars);
  } catch (err) {
    console.error(`Ошибка чтения моделей для ${make}:`, err);
    return NextResponse.json([], { status: 404 });
  }
}
