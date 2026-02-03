'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Car {
  make: string;
  model: string;
  slug: string;
  instanceId: string;
  year: string;
  yearMonth: string;
  mileage: string;
  auctionGrade: string;
  price: string;
  fuel: string;
  transmission: string;
  drive: string;
  engineVolume: string;
  description: string;
  status: string;
  isTop: boolean;
  photos?: string[];
  timestamp?: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cars, setCars] = useState<Car[]>([]);
  const [makes, setMakes] = useState<string[]>([]);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [addingCar, setAddingCar] = useState(false);
  const [newCar, setNewCar] = useState<Omit<Car, 'slug' | 'instanceId'>>({
    make: '',
    model: '',
    year: '',
    yearMonth: '',
    mileage: '',
    auctionGrade: '',
    price: '',
    fuel: '',
    transmission: '',
    drive: '',
    engineVolume: '',
    description: '',
    status: 'available',
    isTop: false,
  });
  const [selectedMake, setSelectedMake] = useState('');
  const [filteredCars, setFilteredCars] = useState<Car[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadMakes();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedMake) {
      loadCars(selectedMake);
    }
  }, [selectedMake]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/check');
      const data = await res.json();
      if (data.isAuthenticated) {
        setIsAdmin(true);
      } else {
        router.push('/');
      }
    } catch (error) {
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const loadMakes = async () => {
    try {
      const res = await fetch('/api/get-makes');
      const data = await res.json();
      setMakes(data.makes || []);
    } catch (error) {
      console.error('Error loading makes:', error);
    }
  };

  const loadCars = async (make: string) => {
    try {
      const res = await fetch(`/api/models/${make}`);
      const data = await res.json();
      setCars(data.models || []);
      setFilteredCars(data.models || []);
    } catch (error) {
      console.error('Error loading cars:', error);
    }
  };

  const handleEdit = (car: Car) => {
    setEditingCar(car);
  };

  const handleSaveEdit = async () => {
    if (!editingCar) return;

    try {
      const res = await fetch('/api/admin/update-car', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          make: editingCar.make,
          instanceId: editingCar.instanceId,
          updatedFields: {
            model: editingCar.model,
            year: editingCar.year,
            yearMonth: editingCar.yearMonth,
            mileage: editingCar.mileage,
            price: editingCar.price,
            fuel: editingCar.fuel,
            transmission: editingCar.transmission,
            drive: editingCar.drive,
            engineVolume: editingCar.engineVolume,
            auctionGrade: editingCar.auctionGrade,
            description: editingCar.description,
            status: editingCar.status,
            isTop: editingCar.isTop,
            slug: editingCar.slug,
          }
        }),
      });

      if (res.ok) {
        const updatedCars = cars.map(car => 
          car.instanceId === editingCar.instanceId ? editingCar : car
        );
        setCars(updatedCars);
        setFilteredCars(updatedCars);
        setEditingCar(null);
      }
    } catch (error) {
      console.error('Error saving car:', error);
    }
  };

  const handleAddCar = async () => {
    try {
      const formData = new FormData();
      
      // Prepare car data
      const carData = {
        ...newCar,
        slug: `${newCar.make}-${newCar.model}-${Date.now()}`.toLowerCase().replace(/\s+/g, '-'),
        instanceId: `${newCar.make}-${newCar.model}-${Date.now()}`,
      };

      formData.append('data', JSON.stringify(carData));

      const res = await fetch('/api/admin/add-car', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setAddingCar(false);
        setNewCar({
          make: '',
          model: '',
          year: '',
          yearMonth: '',
          mileage: '',
          auctionGrade: '',
          price: '',
          fuel: '',
          transmission: '',
          drive: '',
          engineVolume: '',
          description: '',
          status: 'available',
          isTop: false,
        });
        // Reload cars
        if (selectedMake) {
          loadCars(selectedMake);
        }
      }
    } catch (error) {
      console.error('Error adding car:', error);
    }
  };

  const handleDeleteCar = async (instanceId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот автомобиль?')) return;

    try {
      const res = await fetch('/api/admin/delete-car', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId }),
      });

      if (res.ok) {
        const updatedCars = cars.filter(car => car.instanceId !== instanceId);
        setCars(updatedCars);
        setFilteredCars(updatedCars);
      }
    } catch (error) {
      console.error('Error deleting car:', error);
    }
  };

  const handleFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = cars.filter(car => 
      car.model.toLowerCase().includes(searchTerm) ||
      car.year.toLowerCase().includes(searchTerm) ||
      car.mileage.toLowerCase().includes(searchTerm) ||
      car.price.toLowerCase().includes(searchTerm)
    );
    setFilteredCars(filtered);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl font-semibold text-gray-700">Загрузка...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl font-semibold text-gray-700">Доступ запрещен</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Админ-панель</h1>
          <p className="text-gray-600">Редактирование автомобилей и управление данными</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Выберите бренд</label>
              <select
                value={selectedMake}
                onChange={(e) => setSelectedMake(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Все бренды</option>
                {makes.map(make => (
                  <option key={make} value={make}>{make}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Поиск</label>
              <input
                type="text"
                placeholder="Поиск по модели, году, цене..."
                onChange={handleFilter}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setAddingCar(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                + Добавить автомобиль
              </button>
            </div>
          </div>
        </div>

        {/* Add Car Modal */}
        {addingCar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Добавить новый автомобиль</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Бренд</label>
                    <input
                      type="text"
                      value={newCar.make}
                      onChange={(e) => setNewCar({...newCar, make: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Модель</label>
                    <input
                      type="text"
                      value={newCar.model}
                      onChange={(e) => setNewCar({...newCar, model: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Год</label>
                    <input
                      type="text"
                      value={newCar.year}
                      onChange={(e) => setNewCar({...newCar, year: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Месяц выпуска</label>
                    <input
                      type="text"
                      value={newCar.yearMonth}
                      onChange={(e) => setNewCar({...newCar, yearMonth: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Пробег</label>
                    <input
                      type="text"
                      value={newCar.mileage}
                      onChange={(e) => setNewCar({...newCar, mileage: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Цена</label>
                    <input
                      type="text"
                      value={newCar.price}
                      onChange={(e) => setNewCar({...newCar, price: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Топливо</label>
                    <input
                      type="text"
                      value={newCar.fuel}
                      onChange={(e) => setNewCar({...newCar, fuel: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Коробка передач</label>
                    <input
                      type="text"
                      value={newCar.transmission}
                      onChange={(e) => setNewCar({...newCar, transmission: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Привод</label>
                    <input
                      type="text"
                      value={newCar.drive}
                      onChange={(e) => setNewCar({...newCar, drive: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Объем двигателя</label>
                    <input
                      type="text"
                      value={newCar.engineVolume}
                      onChange={(e) => setNewCar({...newCar, engineVolume: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Оценка аукциона</label>
                    <input
                      type="text"
                      value={newCar.auctionGrade}
                      onChange={(e) => setNewCar({...newCar, auctionGrade: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
                    <select
                      value={newCar.status}
                      onChange={(e) => setNewCar({...newCar, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="available">Доступен</option>
                      <option value="sold">Продан</option>
                      <option value="reserved">Зарезервирован</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                    <textarea
                      value={newCar.description}
                      onChange={(e) => setNewCar({...newCar, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md h-24"
                    />
                  </div>
                </div>

                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="isTop"
                    checked={newCar.isTop}
                    onChange={(e) => setNewCar({...newCar, isTop: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="isTop" className="text-sm font-medium text-gray-700">В топе</label>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleAddCar}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    Добавить
                  </button>
                  <button
                    onClick={() => setAddingCar(false)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Car Modal */}
        {editingCar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Редактировать автомобиль</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Бренд</label>
                    <input
                      type="text"
                      value={editingCar.make}
                      onChange={(e) => setEditingCar({...editingCar, make: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Модель</label>
                    <input
                      type="text"
                      value={editingCar.model}
                      onChange={(e) => setEditingCar({...editingCar, model: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Год</label>
                    <input
                      type="text"
                      value={editingCar.year}
                      onChange={(e) => setEditingCar({...editingCar, year: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Месяц выпуска</label>
                    <input
                      type="text"
                      value={editingCar.yearMonth}
                      onChange={(e) => setEditingCar({...editingCar, yearMonth: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Пробег</label>
                    <input
                      type="text"
                      value={editingCar.mileage}
                      onChange={(e) => setEditingCar({...editingCar, mileage: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Цена</label>
                    <input
                      type="text"
                      value={editingCar.price}
                      onChange={(e) => setEditingCar({...editingCar, price: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Топливо</label>
                    <input
                      type="text"
                      value={editingCar.fuel}
                      onChange={(e) => setEditingCar({...editingCar, fuel: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Коробка передач</label>
                    <input
                      type="text"
                      value={editingCar.transmission}
                      onChange={(e) => setEditingCar({...editingCar, transmission: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Привод</label>
                    <input
                      type="text"
                      value={editingCar.drive}
                      onChange={(e) => setEditingCar({...editingCar, drive: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Объем двигателя</label>
                    <input
                      type="text"
                      value={editingCar.engineVolume}
                      onChange={(e) => setEditingCar({...editingCar, engineVolume: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Оценка аукциона</label>
                    <input
                      type="text"
                      value={editingCar.auctionGrade}
                      onChange={(e) => setEditingCar({...editingCar, auctionGrade: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
                    <select
                      value={editingCar.status}
                      onChange={(e) => setEditingCar({...editingCar, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="available">Доступен</option>
                      <option value="sold">Продан</option>
                      <option value="reserved">Зарезервирован</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                    <textarea
                      value={editingCar.description}
                      onChange={(e) => setEditingCar({...editingCar, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md h-24"
                    />
                  </div>
                </div>

                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="editIsTop"
                    checked={editingCar.isTop}
                    onChange={(e) => setEditingCar({...editingCar, isTop: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="editIsTop" className="text-sm font-medium text-gray-700">В топе</label>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    Сохранить
                  </button>
                  <button
                    onClick={() => setEditingCar(null)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cars List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Модель</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Год</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Пробег</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Цена</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCars.map((car) => (
                  <tr key={car.instanceId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{car.model}</div>
                      <div className="text-sm text-gray-500">{car.make}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{car.year}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{car.mileage}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{car.price}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        car.status === 'available' ? 'bg-green-100 text-green-800' :
                        car.status === 'sold' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {car.status === 'available' ? 'Доступен' : 
                         car.status === 'sold' ? 'Продан' : 'Зарезервирован'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(car)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleDeleteCar(car.instanceId)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredCars.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Нет автомобилей для отображения</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}