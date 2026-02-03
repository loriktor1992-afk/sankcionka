import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const make = searchParams.get('make');

  if (!make) return NextResponse.json([]);

  const modelsFile = path.join(process.cwd(), 'data/models', `${make}.json`);
  try {
    const data = await fs.readFile(modelsFile, 'utf-8');
    const models = JSON.parse(data);
    return NextResponse.json(models.map((m: any) => m.name));
  } catch {
    return NextResponse.json([]);
  }
}