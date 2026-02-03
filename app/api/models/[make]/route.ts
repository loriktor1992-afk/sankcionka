import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ make: string }> }
) {
  const { make: rawMake } = await params;
  const make = rawMake.toLowerCase().trim();
  const filePath = path.join(process.cwd(), 'data/models', `${make}.json`);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const models = JSON.parse(data);
    return NextResponse.json(models);
  } catch {
    return NextResponse.json([]);
  }
}
