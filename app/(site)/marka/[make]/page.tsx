import Link from 'next/link';
import fs from 'fs/promises';
import path from 'path';

function slugify(value: string) {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s-]/gi, '')
    .replace(/\s+/g, '-');
}

async function getModels(make: string) {
  const filePath = path.join(process.cwd(), 'data/models', `${make}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const instances = JSON.parse(data);

    // Группируем по модели и подсчитываем оценки для каждой
    const modelMap = new Map();
    instances.forEach((inst: any) => {
      const modelKey = inst.model || 'unknown';
      
      if (!modelMap.has(modelKey)) {
        modelMap.set(modelKey, {
          slug: slugify(modelKey),
          name: modelKey,
          count: 0,
          photo: inst.photos?.[0] || null,
          grades: {} as Record<string, number> // Статистика по оценкам для этой модели
        });
      }
      
      const modelData = modelMap.get(modelKey);
      modelData.count++;
      
      // Подсчитываем оценки для этой модели
      const grade = inst.auctionGrade || 'Не указана';
      modelData.grades[grade] = (modelData.grades[grade] || 0) + 1;
    });

    return {
      models: Array.from(modelMap.values()),
      totalCount: instances.length
    };
  } catch (err) {
    console.error('Ошибка чтения моделей:', err);
    return { models: [], totalCount: 0 };
  }
}

export default async function MarkaPage({ params }: { params: Promise<{ make: string }> }) {
  const { make } = await params;
  const { models, totalCount } = await getModels(make);

  if (models.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-4xl font-bold mb-6 capitalize">{make}</h1>
          <p className="text-2xl text-gray-500">Автомобилей этой марки пока нет</p>
          <Link href="/" className="text-blue-600 hover:underline mt-8 inline-block">
            ← Назад к маркам
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <Link href="/" className="text-blue-600 hover:underline mb-6 block text-lg">
          ← Назад к маркам
        </Link>

        <h1 className="text-4xl font-bold mb-10 capitalize">{make}</h1>

        {/* Информация о ценах и оценках */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-blue-600">2.0 - 3.5 млн ₽</div>
              <div className="text-sm text-gray-500">Эконом класс</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">4.0 - 4.5 млн ₽</div>
              <div className="text-sm text-gray-500">Средний класс</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600">Высокая оценка</div>
              <div className="text-sm text-gray-500">Премиум</div>
            </div>
          </div>
        </div>

        <p className="text-xl mb-12 text-gray-600">
          {models.length} {models.length === 1 ? 'модель' : 'модели'}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {models.map((model: any) => (
            <Link
              key={model.slug}
              href={`/model/${make}/${model.slug}`}
              className="bg-white rounded-xl shadow hover:shadow-xl transition overflow-hidden border border-gray-200 flex flex-col"
            >
              {model.photo ? (
                <img src={model.photo} alt={model.name} className="w-full h-40 object-cover" />
              ) : (
                <div className="h-40 bg-gray-200 flex items-center justify-center text-gray-500 text-sm">Нет фото</div>
              )}
              <div className="p-4 flex-1 flex flex-col">
                <h2 className="text-lg font-semibold mb-2">{model.name}</h2>
                
                {/* Реальная статистика по оценкам для этой модели */}
                <div className="mt-2 space-y-1 text-xs text-gray-600">
                  {Object.entries(model.grades as Record<string, number>)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([grade, count]) => (
                      <div key={grade} className="flex justify-between">
                        <span>{grade}:</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                </div>
                
                <p className="text-sm text-gray-600 mt-auto pt-2 border-t border-gray-100">
                  {model.count} {model.count === 1 ? 'авто' : 'авто'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}