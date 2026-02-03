'use client';

import { useEffect, useState } from 'react';

interface SkinPreviewProps {
  skinUrl: string | null;
  size?: number;
  className?: string;
}

export default function SkinPreview({ skinUrl, size = 160, className = '' }: SkinPreviewProps) {
  const [processedSkin, setProcessedSkin] = useState<string | null>(null);

  useEffect(() => {
    if (!skinUrl) {
      setProcessedSkin(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const diameter = size;
      canvas.width = diameter;
      canvas.height = diameter;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;

      // Создаем круглую маску с мягкими краями
      ctx.beginPath();
      ctx.arc(diameter/2, diameter/2, diameter/2 - 2, 0, Math.PI * 2);
      ctx.clip();
      
      // Рисуем изображение с легким свечением
      ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
      ctx.shadowBlur = 10;
      ctx.drawImage(img, 0, 0, diameter, diameter);
      
      // Сброс теней
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      
      // Получаем пиксельные данные
      const imageData = ctx.getImageData(0, 0, diameter, diameter);
      const data = imageData.data;
      
      // Убираем белый фон (RGB > 245)
      const threshold = 245;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Если пиксель почти белый - делаем его прозрачным
        if (r > threshold && g > threshold && b > threshold) {
          data[i + 3] = 0;
        }
      }
      
      // Применяем изменения
      ctx.putImageData(imageData, 0, 0);
      
      setProcessedSkin(canvas.toDataURL());
    };
    
    img.src = skinUrl;
  }, [skinUrl, size]);

  if (!skinUrl) {
    return (
      <div 
        className={`bg-gradient-to-br from-gray-800 to-black flex items-center justify-center rounded-full ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="text-center text-gray-400">
          <div className="text-3xl mb-1">📤</div>
          <div className="text-xs">Загрузить</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${className}`}
      style={{ width: size, height: size }}
    >
      {processedSkin ? (
        <img 
          src={processedSkin} 
          alt="Skin preview" 
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <div className="w-full h-full bg-gray-700 animate-pulse rounded-full"></div>
      )}
    </div>
  );
}