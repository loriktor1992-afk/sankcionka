'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useRef } from 'react';
import SkinPreview from './components/SkinPreview';

const GameCanvas = dynamic(
  () => import('./components/GameCanvas'),
  { ssr: false }
);

export default function GamePage() {
  const [isReady, setIsReady] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [skinUrl, setSkinUrl] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('Player');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const tg = (window as unknown as { Telegram?: { WebApp?: { ready: () => void; expand: () => void } } }).Telegram;
    
    if (tg?.WebApp) {
      tg.WebApp.ready();
      tg.WebApp.expand();
    }
    
    setIsReady(true);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSkinUrl(url);
    }
  };

  const startGame = () => {
    if (typeof window !== 'undefined') {
      (window as any).__playerSkin = skinUrl;
      (window as any).__playerName = playerName;
    }
    setGameStarted(true);
  };

  if (!isReady) {
    return (
      <div className="w-screen h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-purple-400 text-xl font-mono">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className="w-screen h-screen bg-gradient-to-br from-gray-900 via-black to-purple-950 flex flex-col items-center justify-center gap-8 p-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-20">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i}
              className="absolute w-2 h-2 bg-purple-500 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>
        
        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center gap-8">
          {/* Game Title */}
          <div className="text-center mb-2">
            <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 bg-clip-text text-transparent mb-2 tracking-wider">
              PUSTOTA
            </h1>
            <div className="h-1 w-32 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto rounded-full"></div>
          </div>
          
          {/* Skin Upload Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="text-purple-300 text-lg font-medium mb-2">Выберите скин</div>
            <div 
              className="rounded-2xl border-4 border-purple-500/50 cursor-pointer hover:border-purple-400 hover:scale-105 transition-all duration-300 shadow-2xl"
              onClick={() => fileInputRef.current?.click()}
            >
              <SkinPreview 
                skinUrl={skinUrl} 
                size={160}
                className="rounded-xl"
              />
            </div>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          {/* Name Input */}
          <div className="flex flex-col items-center gap-2 w-full max-w-xs">
            <div className="text-purple-300 text-lg font-medium">Ваше имя</div>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Введите имя"
              maxLength={15}
              className="w-full bg-black/50 backdrop-blur-sm text-white px-6 py-4 rounded-xl border border-purple-500/30 focus:border-purple-500 focus:outline-none text-center text-lg placeholder-gray-500 transition-all duration-300 shadow-lg"
            />
          </div>
          
          {/* Play Button */}
          <button
            onClick={startGame}
            className="mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-5 px-16 rounded-2xl text-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-purple-500/25 tracking-wide"
          >
            ИГРАТЬ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-black overflow-hidden">
      <GameCanvas />
    </div>
  );
}
