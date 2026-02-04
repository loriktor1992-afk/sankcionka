import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  const modelsDir = path.join(process.cwd(), 'data/models');
  const makesConfigPath = path.join(process.cwd(), 'data/makes.json');

  try {
    // Читаем конфиг с красивыми названиями
    let makesConfig: any[] = [];
    try {
      const configData = await fs.readFile(makesConfigPath, 'utf-8');
      makesConfig = JSON.parse(configData);
    } catch (e) {
      makesConfig = [];
    }

    try {
      await fs.access(modelsDir);
    } catch {
      await fs.mkdir(modelsDir, { recursive: true });
    }

    const files = await fs.readdir(modelsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const results = [];

    for (const file of jsonFiles) {
      const makeSlug = file.replace('.json', '');
      const filePath = path.join(modelsDir, file);
      
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const cars = JSON.parse(content);
        
        if (Array.isArray(cars) && cars.length > 0) {
          const configEntry = makesConfig.find((m: any) => m.slug === makeSlug);
          
          // Подсчитываем количество машин по аукционным оценкам
          const gradeCounts: Record<string, number> = {};
          cars.forEach((car: any) => {
            const grade = car.auctionGrade || 'Не указана';
            gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
          });
          
          results.push({
            slug: makeSlug,
            name: configEntry ? configEntry.name : makeSlug.charAt(0).toUpperCase() + makeSlug.slice(1),
            modelsCount: cars.length,
            grades: gradeCounts
          });
        }
      } catch (err) {
        console.error(`Error processing ${file}:`, err);
      }
    }

    // Сортируем по количеству (по убыванию) или по имени
    results.sort((a, b) => b.modelsCount - a.modelsCount);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Ошибка получения списка марок:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
