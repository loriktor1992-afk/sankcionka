import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: Request, { params }: { params: { make: string } }) {
  const make = params.make.toLowerCase().trim();
  const filePath = path.join(process.cwd(), 'data/models', `${make}.json`);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const models = JSON.parse(data);
    return NextResponse.json(models); // возвращаем все экземпляры полностью
  } catch {
    return NextResponse.json([]);
  }
}