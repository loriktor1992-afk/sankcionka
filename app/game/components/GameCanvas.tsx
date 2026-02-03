'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GAME_CONFIG } from '../lib/config';
import { BootScene } from '../lib/scenes/BootScene';
import { GameScene } from '../lib/scenes/GameScene';
import { UIScene } from '../lib/scenes/UIScene';

export default function GameCanvas() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.WEBGL,
      parent: containerRef.current || undefined,
      width: GAME_CONFIG.WIDTH,
      height: GAME_CONFIG.HEIGHT,
      backgroundColor: '#080808',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        pixelArt: false,
        antialias: true,
        antialiasGL: true,
        roundPixels: false,
        powerPreference: 'high-performance',
        batchSize: 8192,
        desynchronized: false,
        mipmapFilter: 'NEAREST',
        maxTextures: 16,
      },
      physics: {
        default: 'arcade',
        arcade: {
          debug: false,
          fps: 60,
        },
      },
      scene: [BootScene, GameScene, UIScene],
      input: {
        activePointers: 3,
      },
      fps: {
        target: 60,
        forceSetTimeOut: false,
      },
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex items-center justify-center bg-black"
      style={{ touchAction: 'none' }}
    />
  );
}
