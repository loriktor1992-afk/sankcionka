import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const make = (formData.get('make') as string)?.toLowerCase().trim();
    const modelJson = formData.get('model') as string;
    const photos = formData.getAll('photos') as File[];

    if (!make || !modelJson) {
      return NextResponse.json({ error: 'Нет марки или модели' }, { status: 400 });
    }

    let modelData;
    try {
      modelData = JSON.parse(modelJson);
    } catch {
      return NextResponse.json({ error: 'Неверный JSON модели' }, { status: 400 });
    }

    const modelsDir = path.join(process.cwd(), 'data/models');
    const imagesDir = path.join(process.cwd(), 'public/images/models', make);

    await fs.mkdir(modelsDir, { recursive: true });
    await fs.mkdir(imagesDir, { recursive: true });

    const modelsFile = path.join(modelsDir, `${make}.json`);

    let existingModels: any[] = [];
    try {
      const fileContent = await fs.readFile(modelsFile, 'utf-8');
      existingModels = JSON.parse(fileContent);
    } catch {
      // файла нет — ок, начинаем с пустого
    }

    // Сохраняем фото
    const photoPaths: string[] = [];
    for (const photo of photos) {
      if (photo.size > 0) {
        const ext = path.extname(photo.name) || '.jpg';
        const timestamp = Date.now();
        const fileName = `${modelData.slug}-${timestamp}${ext}`;
        const filePath = path.join(imagesDir, fileName);

        const buffer = Buffer.from(await photo.arrayBuffer());
        await fs.writeFile(filePath, buffer);

        photoPaths.push(`/images/models/${make}/${fileName}`);
      }
    }

    if (photoPaths.length > 0) {
      modelData.photos = photoPaths;
    }

    // Добавляем модель
    existingModels.push(modelData);

    // Сохраняем файл
    await fs.writeFile(modelsFile, JSON.stringify(existingModels, null, 2));

    return NextResponse.json({ success: true, addedPhotos: photoPaths.length });
  } catch (error: any) {
    console.error('Ошибка в add-model:', error.message);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}