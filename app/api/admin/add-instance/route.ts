import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const make = formData.get('make') as string;
    const instanceJson = formData.get('instance') as string;
    const photos = formData.getAll('photos') as File[];

    if (!make || !instanceJson) {
      return NextResponse.json({ error: 'Нет данных' }, { status: 400 });
    }

    const instance = JSON.parse(instanceJson);

    const dir = path.join(process.cwd(), 'data/models');
    const imgDir = path.join(process.cwd(), 'public/images/models', make);

    await fs.mkdir(dir, { recursive: true });
    await fs.mkdir(imgDir, { recursive: true });

    const file = path.join(dir, `${make}.json`);

    let existing = [];
    try {
      const data = await fs.readFile(file, 'utf-8');
      existing = JSON.parse(data);
    } catch {}

    // Фото
    const photoPaths = [];
    for (const photo of photos) {
      if (photo.size > 0) {
        const ext = path.extname(photo.name) || '.jpg';
        const name = `${instance.slug}-${Date.now()}${ext}`;
        const buffer = Buffer.from(await photo.arrayBuffer());
        await fs.writeFile(path.join(imgDir, name), buffer);
        photoPaths.push(`/images/models/${make}/${name}`);
      }
    }

    if (photoPaths.length > 0) instance.photos = photoPaths;

    existing.push(instance);

    await fs.writeFile(file, JSON.stringify(existing, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка' }, { status: 500 });
  }
}