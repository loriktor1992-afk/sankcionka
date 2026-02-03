'use client';

import { useState } from 'react';

export default function PhotoGallery({ 
  photos, 
  name, 
  isAdmin = false, 
  onSetMain 
}: { 
  photos: string[]; 
  name: string;
  isAdmin?: boolean;
  onSetMain?: (index: number) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const open = (index: number) => {
    if (isAdmin && onSetMain) {
      onSetMain(index);
    } else {
      setSelectedIndex(index);
    }
  };
  const close = () => setSelectedIndex(null);

  const prev = () => {
    if (selectedIndex !== null) {
      setSelectedIndex((old) => (old !== null ? (old - 1 + photos.length) % photos.length : 0));
    }
  };

  const next = () => {
    if (selectedIndex !== null) {
      setSelectedIndex((old) => (old !== null ? (old + 1) % photos.length : 0));
    }
  };

  return (
    <>
      {/* Миниатюры */}
      <div className="mb-12">
        <h2 className="text-3xl font-semibold mb-6">Фото</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo, idx) => (
            <div
              key={idx}
              className="relative rounded-xl overflow-hidden shadow-lg cursor-pointer group aspect-square"
              onClick={() => open(idx)}
            >
              <img
                src={photo}
                alt={`${name} фото ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {isAdmin && idx === 0 && (
                <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg">
                  ГЛАВНАЯ
                </div>
              )}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-center px-4 text-lg font-bold">
                  {isAdmin ? 'Сделать главной' : 'Увеличить'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Полноэкранная галерея */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={close}
        >
          <button
            className="absolute top-6 right-6 text-white text-5xl hover:text-gray-300 transition z-10"
            onClick={close}
          >
            ✕
          </button>

          <button
            className="absolute left-6 text-white text-6xl hover:text-gray-300 transition z-10"
            onClick={(e) => { e.stopPropagation(); prev(); }}
          >
            ‹
          </button>

          <button
            className="absolute right-6 text-white text-6xl hover:text-gray-300 transition z-10"
            onClick={(e) => { e.stopPropagation(); next(); }}
          >
            ›
          </button>

          <div className="relative max-w-[95vw] max-h-[95vh] mx-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={photos[selectedIndex]}
              alt={`${name} фото ${selectedIndex + 1}`}
              className="max-w-full max-h-[95vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="absolute bottom-4 left-0 right-0 text-center text-white text-lg bg-black/50 py-2 rounded-full">
              {selectedIndex + 1} / {photos.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}