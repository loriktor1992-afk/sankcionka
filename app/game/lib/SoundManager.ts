import Phaser from 'phaser';

export class SoundManager {
  private scene: Phaser.Scene;
  private sounds: Map<string, Phaser.Sound.BaseSound> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // Создаем минимальные звуковые эффекты через Web Audio API
  private createOscillatorSound(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
    if (typeof window === 'undefined') return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
      // Игнорируем ошибки звука в случае проблем с браузером
      console.log('Sound not available');
    }
  }

  playSplit(): void {
    this.createOscillatorSound(220, 0.3, 'square');
  }

  playEat(): void {
    this.createOscillatorSound(330, 0.2, 'sine');
  }

  playGrow(): void {
    this.createOscillatorSound(180, 0.4, 'triangle');
  }

  playDeath(): void {
    this.createOscillatorSound(110, 0.5, 'sawtooth');
  }
}