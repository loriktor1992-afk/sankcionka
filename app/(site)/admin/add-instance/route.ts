import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const make = (formData.get('make') as string)?.toLowerCase().trim();
    const modelName = formData.get('modelName') as string;
    const instanceJson = formData.get('instance') as string;
    const photos = formData.getAll('photos') as File[];

    if (!make || !modelName || !instanceJson) {
      return NextResponse.json({ error: 'Нет данных' }, { status: 400 });
    }

    const instance = JSON.parse(instanceJson);

    const modelsDir = path.join(process.cwd(), 'data/models');
    await fs.mkdir(modelsDir, { recursive: true });

    const modelsFile = path.join(modelsDir, `${make}.json`);
    let modelsData: Record<string, any[]> = {};
    try {
      const data = await fs.readFile(modelsFile, 'utf-8');
      modelsData = JSON.parse(data);
    } catch {}

    if (!modelsData[modelName]) {
      modelsData[modelName] = [];
    }

    // Сохраняем фото
    const photoPaths: string[] = [];
    const imagesDir = path.join(process.cwd(), 'public/images/models', make, modelName);
    await fs.mkdir(imagesDir, { recursive: true });

    for (const photo of photos) {
      if (photo.size > 0) {
        const ext = path.extname(photo.name) || '.jpg';
        const fileName = `${Date.now()}${ext}`;
        const filePath = path.join(imagesDir, fileName);

        const buffer = Buffer.from(await photo.arrayBuffer());
        await fs.writeFile(filePath, buffer);

        photoPaths.push(`/images/models/${make}/${modelName}/${fileName}`);
      }
    }

    if (photoPaths.length > 0) {
      instance.photos = photoPaths;
    }

    modelsData[modelName].push(instance);

    await fs.writeFile(modelsFile, JSON.stringify(modelsData, null, 2));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Ошибка добавления экземпляра:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}