import Link from 'next/link';
import catalog from '../../../../data/catalog.json';

export default async function CarPage({ params }: { params: Promise<{ brand: string; model: string; car: string }> }) {
  const { brand, model, car } = await params;

  const brandData = catalog.brands.find(b => b.slug === brand);
  const markData = brandData?.marks.find(m => m.slug === model);
  const auto = markData?.cars.find(c => c.slug === car);

  if (!auto) {
    return <div>Авто не найдено</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <Link href={`/model/${brand}/${model}`} className="text-blue-600 hover:underline mb-6 block text-lg">
          ← Назад к модели {model}
        </Link>

        <h1 className="text-4xl font-bold mb-10">{auto.name}</h1>

        {/* Галерея 20+ фото */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Галерея ( {auto.photos.length} фото )</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {auto.photos.map(photo => (
              <img key={photo} src={photo} alt="Фото" className="w-full h-48 object-cover rounded" />
            ))}
          </div>
        </div>

        {/* Характеристики */}
        <div className="bg-white p-8 rounded-xl shadow mb-8">
          <h2 className="text-3xl font-bold mb-6">Характеристики</h2>
          <ul className="space-y-4 text-lg">
            <li><strong>Год:</strong> {auto.year}</li>
            <li><strong>Пробег:</strong> {auto.mileage}</li>
            <li><strong>Цена:</strong> {auto.price}</li>
            <li><strong>КПП:</strong> {auto.transmission}</li>
            <li><strong>Привод:</strong> {auto.drive}</li>
          </ul>
        </div>

        <div className="bg-white p-8 rounded-xl shadow">
          <h2 className="text-3xl font-bold mb-6">Описание</h2>
          <p className="text-lg">{auto.description}</p>
        </div>
      </div>
    </main>
  );
}