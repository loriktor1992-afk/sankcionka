import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

function toSlugBase(value: string) {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s-]/gi, '')
    .replace(/\s+/g, '-');
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const rawData = formData.get('data');

    if (!rawData || typeof rawData !== 'string') {
      return NextResponse.json({ error: 'Нет данных формы' }, { status: 400 });
    }

    let data: any;
    try {
      data = JSON.parse(rawData);
      // Логируем полученные данные для отладки
      console.log('📥 Получены данные:', {
        brand: data.brand,
        model: data.model,
        price: data.price || 'НЕТ ЦЕНЫ',
        year: data.year,
        mileage: data.mileage
      });
    } catch {
      return NextResponse.json({ error: 'Некорректный JSON формы' }, { status: 400 });
    }

    const brandMapping: { [key: string]: string } = {
      // Toyota models
      'aqua': 'toyota',
      'prius': 'toyota',
      'corolla': 'toyota',
      'axio': 'toyota',
      'camry': 'toyota',
      'yaris': 'toyota',
      'yaris cros': 'toyota',
      'yaris cross': 'toyota',
      'raize': 'toyota',
      'crown': 'toyota',
      'land cruiser': 'toyota',
      'prado': 'toyota',
      'harrier': 'toyota',
      'alphard': 'toyota',
      'vellfire': 'toyota',
      'rav4': 'toyota',
      
      // Nissan models
      'note': 'nissan',
      'leaf': 'nissan',
      'serena': 'nissan',
      'x-trail': 'nissan',
      
      // Honda models
      'fit': 'honda',
      'vezel': 'honda',
      'civic': 'honda',
      'cr-v': 'honda',
      
      // Subaru models
      'impreza': 'subaru',
      'forester': 'subaru',
      'outback': 'subaru',
      'wrx': 'subaru',
      
      // Mazda models
      'cx-5': 'mazda',
      'mazda3': 'mazda',
      'mazda6': 'mazda',
      
      // BMW models
      'x3': 'bmw',
      'x4': 'bmw',
      'x5': 'bmw',
      'x6': 'bmw',
      'x7': 'bmw',
      'i3': 'bmw',
      'i8': 'bmw',
      'm3': 'bmw',
      'm4': 'bmw',
      'm5': 'bmw',
      'm6': 'bmw',
      'm8': 'bmw',
      
      // Mercedes models
      'c': 'mercedes',
      'e': 'mercedes',
      's': 'mercedes',
      'g': 'mercedes',
      'glc': 'mercedes',
      'gle': 'mercedes',
      'gla': 'mercedes',
      'cla': 'mercedes',
      'cls': 'mercedes',
      'amg': 'mercedes',
      'eq': 'mercedes',
      
      // Additional keywords
      'land': 'toyota',
      'cruiser': 'toyota',
    };

    let make = (data.brand || '').toString().trim().toLowerCase();
    const model = (data.model || '').toString().trim();

    // Smart Brand Recognition
    if (brandMapping[make]) {
      make = brandMapping[make];
    }
    const modelLower = model.toLowerCase();
    for (const [m, b] of Object.entries(brandMapping)) {
      if (modelLower.includes(m)) {
        make = b;
        break;
      }
    }

    if (!make || !model) {
      return NextResponse.json({ error: 'Нужны бренд и модель' }, { status: 400 });
    }

    const baseSlug = toSlugBase(data.slug || data.instanceId || `${model}-${Date.now()}`);

    const modelsDir = path.join(process.cwd(), 'data/models');
    const imagesDir = path.join(process.cwd(), 'public/images/models', make);

    await fs.mkdir(modelsDir, { recursive: true });
    await fs.mkdir(imagesDir, { recursive: true });

    const filePath = path.join(modelsDir, `${make}.json`);

    let existing: any[] = [];
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      existing = JSON.parse(fileContent);
      if (!Array.isArray(existing)) existing = [];
    } catch {
      existing = [];
    }

    const photos = formData.getAll('photos') as File[];
    const photoPaths: string[] = [];

    for (const photo of photos) {
      if (photo && photo.size > 0) {
        const ext = path.extname(photo.name) || '.jpg';
        const fileName = `${baseSlug}-${Date.now()}${ext}`;
        const buffer = Buffer.from(await photo.arrayBuffer());
        await fs.writeFile(path.join(imagesDir, fileName), buffer);
        photoPaths.push(`/images/models/${make}/${fileName}`);
      }
    }

    const now = Date.now();

    const newCar: any = {
      make,
      model,
      slug: baseSlug,
      instanceId: data.instanceId || baseSlug,
      year: data.year || '',
      yearMonth: data.yearMonth || '',
      mileage: data.mileage || '',
      auctionGrade: data.auctionGrade || '',
      price: data.price || '',
      fuel: data.fuel || '',
      transmission: data.transmission || '',
      drive: data.drive || '',
      engineVolume: data.engineVolume || '',
      description: data.description || '',
      status: data.status || 'available',
      isTop: !!data.isTop,
      photos: photoPaths.length > 0 ? photoPaths : undefined,
      timestamp: now,
    };
    
    // Логируем данные перед сохранением
    console.log('💾 Сохраняем авто:', {
      make: newCar.make,
      model: newCar.model,
      price: newCar.price || 'НЕТ ЦЕНЫ',
      year: newCar.year,
      hasPhotos: newCar.photos && newCar.photos.length > 0
    });

    // Проверяем по instanceId сначала (это основной уникальный идентификатор)
    const existingIndexById = existing.findIndex((c: any) => c.instanceId && newCar.instanceId && c.instanceId === newCar.instanceId);
    
    let isNew = false;
    
    if (existingIndexById >= 0) {
      // Обновление существующей записи по instanceId
      const prev = existing[existingIndexById];
      existing[existingIndexById] = {
        ...prev,
        ...newCar,
        photos: photoPaths.length > 0 ? photoPaths : prev.photos || [],
      };
      console.log(`🔄 Обновление существующей машины с ID: ${newCar.instanceId}`);
    } else {
      // Проверяем по slug только если нет instanceId или он пустой
      if (!newCar.instanceId) {
        const existingIndexBySlug = existing.findIndex((c: any) => c.slug === newCar.slug);
        if (existingIndexBySlug >= 0) {
          // Обновление существующей записи по slug
          const prev = existing[existingIndexBySlug];
          existing[existingIndexBySlug] = {
            ...prev,
            ...newCar,
            photos: photoPaths.length > 0 ? photoPaths : prev.photos || [],
          };
          console.log(`🔄 Обновление существующей машины по slug: ${newCar.slug}`);
        } else {
          // Новая запись
          existing.push(newCar);
          isNew = true;
          console.log(`✅ Новая машина добавлена: ${newCar.make} ${newCar.model} (ID: ${newCar.instanceId || newCar.slug})`);
        }
      } else {
        // Новая запись с instanceId
        existing.push(newCar);
        isNew = true;
        console.log(`✅ Новая машина добавлена: ${newCar.make} ${newCar.model} (ID: ${newCar.instanceId})`);
      }
    }

    await fs.writeFile(filePath, JSON.stringify(existing, null, 2));

    return NextResponse.json({ success: true, car: newCar, isNew });
  } catch (error) {
    console.error('Ошибка в add-car:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
