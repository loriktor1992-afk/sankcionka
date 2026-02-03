'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PhotoGallery from './PhotoGallery';
import { useRouter } from 'next/navigation';

function slugify(value: string) {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s-]/gi, '')
    .replace(/\s+/g, '-');
}

export default function CarDetailClient({ 
  car, 
  make, 
  model, 
  recommended = [] 
}: { 
  car: any; 
  make: string; 
  model: string; 
  recommended?: any[] 
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCar, setEditedCar] = useState(car);
  const [isSaving, setIsSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/check');
      const data = await res.json();
      setIsAdmin(data.isAuthenticated);
    } catch (error) {
      console.error('Ошибка проверки авторизации:', error);
    }
  }

  const handleSaveDescription = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/update-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          make: editedCar.make,
          model: editedCar.model,
          slug: editedCar.slug,
          description: editedCar.description,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setShowEditModal(false);
        router.refresh();
        alert('Описание обновлено!');
      } else {
        alert(data.message || 'Ошибка при сохранении');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка при сохранении');
    } finally {
      setIsSaving(false);
    }
  };

  const setMainPhoto = async (index: number) => {
    if (!isAdmin) return;

    try {
      const res = await fetch('/api/admin/set-main-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          make: editedCar.make,
          model: editedCar.model,
          slug: editedCar.slug,
          photoIndex: index,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Обновляем локальное состояние
        const newPhotos = [...editedCar.photos];
        const [selected] = newPhotos.splice(index, 1);
        newPhotos.unshift(selected);
        setEditedCar({ ...editedCar, photos: newPhotos });
        alert('Главное фото обновлено!');
        router.refresh();
      } else {
        alert(data.message || 'Ошибка при обновлении фото');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка при обновлении фото');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Панель админа */}
        {isAdmin && (
          <div className="mb-6 p-4 bg-green-600 text-white rounded-xl flex justify-between items-center shadow-lg">
            <div>
              <span className="font-bold">✓ Режим администратора</span>
              <span className="ml-4 text-sm opacity-90">Нажимайте на фото, чтобы сделать его главным</span>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowEditModal(true)}
                className="bg-white text-green-600 font-bold px-6 py-2 rounded-lg hover:bg-gray-100 transition"
              >
                ✏️ Редактировать описание
              </button>
            </div>
          </div>
        )}

        {/* Хлебные крошки */}
        <div className="flex flex-wrap items-center gap-2 mb-6 text-sm text-gray-600">
          <Link href="/" className="hover:text-blue-600 transition">Главная</Link>
          <span>›</span>
          <Link href={`/marka/${make}`} className="hover:text-blue-600 transition capitalize">{make}</Link>
          <span>›</span>
          <Link href={`/model/${make}/${model}`} className="hover:text-blue-600 transition capitalize">{model.replace(/-/g, ' ')}</Link>
          <span>›</span>
          <span className="font-semibold text-gray-900">{editedCar.model || editedCar.name || editedCar.slug}</span>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 border border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Левая часть: галерея фото */}
            <div className="lg:border-r border-gray-200">
              {editedCar.photos && editedCar.photos.length > 0 ? (
                <div className="relative">
                  <PhotoGallery 
                    photos={editedCar.photos} 
                    name={editedCar.model || editedCar.name || model} 
                    isAdmin={isAdmin}
                    onSetMain={setMainPhoto}
                  />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-100 p-12">
                  <p className="text-gray-400 text-lg">Фото отсутствуют</p>
                </div>
              )}
            </div>

            {/* Правая часть: характеристики и описание */}
            <div className="p-8 lg:p-10">
              <h1 className="text-3xl lg:text-4xl font-bold mb-2 text-gray-900">
                {editedCar.model || editedCar.name || `${model.replace(/-/g, ' ')}`}
              </h1>
              
              <div className="mb-6">
                <p className="text-sm text-gray-500">
                  {editedCar.year}{editedCar.yearMonth ? `-${editedCar.yearMonth}` : ''} {!editedCar.year && !editedCar.yearMonth && 'Год не указан'}
                </p>
              </div>

              {/* Цена */}
              <div className="mb-8 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 shadow-sm">
                <p className="text-sm text-gray-600 mb-1">Цена</p>
                <p className="text-4xl font-bold text-green-700">
                  {editedCar.price ? `${Number(editedCar.price.toString().replace(/\D/g,'')).toLocaleString()} ₽` : 'По запросу'}
                </p>
              </div>

              {/* Характеристики */}
              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-6 text-gray-900 flex items-center gap-2">
                  <span className="w-1.5 h-8 bg-blue-600 rounded-full"></span>
                  Характеристики
                </h2>
                <div className="grid grid-cols-1 gap-1">
                  {[
                    { label: 'STOCK ID', key: 'instanceId' },
                    { label: 'Пробег', key: 'mileage', suffix: ' км' },
                    { label: 'Объем двигателя', key: 'engineVolume' },
                    { label: 'Топливо', key: 'fuel' },
                    { label: 'Коробка', key: 'transmission' },
                    { label: 'Привод', key: 'drive' },
                    { label: 'Аукционная оценка', key: 'auctionGrade' },
                  ].map((item) => (
                    <div key={item.key} className="flex justify-between items-center py-3 border-b border-gray-100 group">
                      <span className="text-gray-500 group-hover:text-gray-900 transition-colors">{item.label}</span>
                      <span className="font-semibold text-gray-900">
                        {editedCar[item.key] ? `${editedCar[item.key]}${item.suffix || ''}` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Описание */}
              <div>
                <h2 className="text-2xl font-semibold mb-6 text-gray-900 flex items-center gap-2">
                  <span className="w-1.5 h-8 bg-blue-600 rounded-full"></span>
                  Описание
                </h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  {editedCar.description || 'Описание отсутствует'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Рекомендации */}
        {recommended.length > 0 && !isEditing && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-8 text-gray-900 flex items-center gap-3">
              <span className="w-2 h-10 bg-blue-600 rounded-full"></span>
              Рекомендуем также
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {recommended.map((recCar: any) => (
                <Link
                  key={recCar.slug}
                  href={`/instance/${recCar.make}/${slugify(recCar.model)}/${recCar.slug}`}
                  className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden group border border-gray-100"
                >
                  {recCar.photos && recCar.photos[0] && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={recCar.photos[0]}
                        alt={recCar.model}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">{recCar.make}</p>
                    <p className="font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">{recCar.model}</p>
                    <p className="text-green-600 font-black text-xl mb-2">
                      {recCar.price ? `${Number(recCar.price.toString().replace(/\D/g,'')).toLocaleString()} ₽` : 'По запросу'}
                    </p>
                    <div className="flex justify-between text-[11px] text-gray-500 font-medium">
                      <span>{recCar.year} г.</span>
                      <span>{recCar.mileage ? `${Number(recCar.mileage.toString().replace(/\D/g,'')).toLocaleString()} км` : ''}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <Link
          href={`/model/${make}/${model}`}
          className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition group"
        >
          <span className="group-hover:-translate-x-1 transition-transform mr-2">←</span>
          Назад к экземплярам модели {model.replace(/-/g, ' ')}
        </Link>
      </div>

      {/* Модальное окно редактирования описания */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold mb-6 text-gray-900">Редактирование описания</h3>
            <textarea
              value={editedCar.description || ''}
              onChange={(e) => setEditedCar({ ...editedCar, description: e.target.value })}
              className="w-full p-4 border-2 border-gray-300 rounded-xl min-h-[300px] outline-none focus:border-blue-500 text-gray-900 leading-relaxed"
              placeholder="Введите описание автомобиля..."
            />
            <div className="flex gap-4 mt-6">
              <button
                onClick={handleSaveDescription}
                disabled={isSaving}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-xl transition-all disabled:opacity-50"
              >
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl transition-all font-medium text-gray-900"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
