import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    // Список файлов, который точно есть
    const knownFiles = [
      '7.json', '8.json', 'aqua.json', 'aura.json', 'bike(bmw).json', 'bmw.json',
      'c.json', 'crown.json', 'gclass.json', 'glcclass.json', 'gt.json', 'honda.json',
      'land-rover.json', 'land.json', 'lexus.json', 'mercedes.json', 'nissan.json',
      'nv200vanette.json', 'raize.json', 's.json', 'subaru.json', 'suzuki.json',
      'toyota.json', 'x3.json', 'x5.json', 'x6.json', 'x7.json', 'yaris.json'
    ];
    
    // Удаляем .json из названий для получения слагов
    const brands = knownFiles
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const slug = file.replace('.json', '');
        const name = slug.charAt(0).toUpperCase() + slug.slice(1).replace('-', ' ');
        return { slug, name, modelsCount: 0 }; // modelsCount будет обновлён ниже
      });

    // Теперь посчитаем количество моделей для каждого бренда
    const modelsDir = path.join(process.cwd(), 'data/models');
    
    for (const brand of brands) {
      try {
        const filePath = path.join(modelsDir, `${brand.slug}.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        const cars = JSON.parse(content);
        
        if (Array.isArray(cars)) {
          brand.modelsCount = cars.length;
        }
      } catch (err) {
        console.error(`Error reading ${brand.slug}.json:`, err);
        // Оставляем modelsCount = 0, если файл не найден или ошибка
      }
    }

    // Отфильтровываем бренды без моделей и сортируем
    const validBrands = brands
      .filter(brand => brand.modelsCount > 0)
      .sort((a, b) => b.modelsCount - a.modelsCount);

    return NextResponse.json(validBrands);
  } catch (error) {
    console.error('Ошибка получения списка марок:', error);
    return NextResponse.json([], { status: 500 });
  }
}
