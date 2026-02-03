import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';
import { LeaderboardEntry } from '../types';

export class UIScene extends Phaser.Scene {
  private leaderboardTexts: Phaser.GameObjects.Text[] = [];
  private massText!: Phaser.GameObjects.Text;
  private minimap!: Phaser.GameObjects.Graphics;
  private minimapBg!: Phaser.GameObjects.Rectangle;
  private splitButton!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    // Enhanced mass display with visual hierarchy
    const massContainer = this.add.container(90, 30);
    
    // Background with better contrast
    const massBg = this.add.rectangle(0, 0, 180, 50, 0x000000, 0.85);
    massBg.setStrokeStyle(2, 0x00ffcc, 0.8);
    massBg.setDepth(99);
    
    // Mass label
    const massLabel = this.add.text(-40, 0, 'MASS:', {
      fontSize: '16px',
      color: '#00ffcc',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });
    massLabel.setOrigin(0.5);
    massLabel.setDepth(100);
    
    // Mass value with larger font
    this.massText = this.add.text(40, 0, '0', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.massText.setOrigin(0.5);
    this.massText.setDepth(100);
    
    massContainer.add([massBg, massLabel, this.massText]);
    massContainer.setScrollFactor(0);
    massContainer.setDepth(100);

    // Split button
    this.createSplitButton();

    // Enhanced leaderboard with better visual hierarchy
    const lbWidth = 200;
    const lbHeight = 45 + GAME_CONFIG.LEADERBOARD_SIZE * 30;
    
    // Leaderboard positioned at top-right
    const lbX = this.cameras.main.width - 10;
    const lbY = 10;
    
    // Improved background
    const lbBg = this.add.rectangle(
      0,
      0,
      lbWidth,
      lbHeight,
      0x000000,
      0.85
    );
    lbBg.setOrigin(1, 0);
    lbBg.setStrokeStyle(2, 0x00ffcc, 0.7);
    lbBg.setDepth(99);

    // Enhanced title with divider
    const lbTitle = this.add.text(
      -lbWidth / 2,
      15,
      '🏆 LEADERBOARD',
      {
        fontSize: '16px',
        color: '#00ffcc',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2
      }
    );
    lbTitle.setOrigin(0.5, 0);
    lbTitle.setDepth(100);
    
    // Divider line
    const divider = this.add.rectangle(-lbWidth/2, 35, lbWidth - 20, 2, 0x00ffcc, 0.6);
    divider.setDepth(100);

    // Leaderboard entries with ranking indicators
    for (let i = 0; i < GAME_CONFIG.LEADERBOARD_SIZE; i++) {
      // Rank badge
      const rankBadge = this.add.rectangle(
        -lbWidth + 25,
        50 + i * 30,
        20,
        20,
        i === 0 ? 0xffd700 : (i === 1 ? 0xc0c0c0 : (i === 2 ? 0xcd7f32 : 0x444444)),
        0.7
      );
      rankBadge.setOrigin(0.5);
      rankBadge.setDepth(100);
      
      // Rank text
      const rankText = this.add.text(
        -lbWidth + 25,
        50 + i * 30,
        `${i + 1}`,
        {
          fontSize: '12px',
          color: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 2
        }
      );
      rankText.setOrigin(0.5);
      rankText.setDepth(101);
      
      // Player name and mass
      const entryText = this.add.text(
        -lbWidth + 45,
        50 + i * 30,
        '',
        {
          fontSize: '14px',
          color: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          stroke: '#000000',
          strokeThickness: 1
        }
      );
      entryText.setOrigin(0, 0.5);
      entryText.setDepth(100);
      this.leaderboardTexts.push(entryText);
    }

    // Enhanced minimap with better visual design
    const minimapSize = 160;
    const padding = 20;
    
    // Minimap container for better positioning
    const mapX = this.cameras.main.width - padding - minimapSize / 2;
    const mapY = this.cameras.main.height - padding - minimapSize / 2;
    
    // Improved background with rounded corners effect
    this.minimapBg = this.add.rectangle(
      mapX,
      mapY,
      minimapSize,
      minimapSize,
      0x000000,
      0.85
    );
    this.minimapBg.setScrollFactor(0);
    this.minimapBg.setDepth(99);
    this.minimapBg.setStrokeStyle(2, 0x00ffcc, 0.8);
    
    // Minimap border corners
    const cornerSize = 8;
    const corners = [
      [mapX - minimapSize/2, mapY - minimapSize/2],
      [mapX + minimapSize/2, mapY - minimapSize/2],
      [mapX - minimapSize/2, mapY + minimapSize/2],
      [mapX + minimapSize/2, mapY + minimapSize/2]
    ];
    
    corners.forEach(([x, y]) => {
      const corner = this.add.rectangle(x, y, cornerSize, cornerSize, 0x00ffcc, 0.6);
      corner.setOrigin(0.5);
      corner.setDepth(100);
    });

    this.minimap = this.add.graphics();
    this.minimap.setScrollFactor(0);
    this.minimap.setDepth(101);
    
    // Minimap label
    const mapLabel = this.add.text(
      mapX,
      mapY - minimapSize/2 - 15,
      'MAP',
      {
        fontSize: '12px',
        color: '#00ffcc',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2
      }
    );
    mapLabel.setOrigin(0.5);
    mapLabel.setDepth(100);

    // Enhanced instructions with better visibility
    const instructionsBg = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height - 25,
      this.cameras.main.width - 40,
      30,
      0x000000,
      0.6
    );
    instructionsBg.setScrollFactor(0);
    instructionsBg.setDepth(99);
    
    const instructions = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height - 25,
      '🖱️ Move: Mouse  |  ␣ Split: SPACE (35+ mass)  |  🎯 Eat smaller cells to grow',
      {
        fontSize: '14px',
        color: '#aaaaaa',
        fontFamily: 'Arial, sans-serif',
        stroke: '#000000',
        strokeThickness: 2
      }
    );
    instructions.setOrigin(0.5);
    instructions.setScrollFactor(0);
    instructions.setDepth(100);
  }
  
  private createSplitButton(): void {
    const x = 90;
    const y = this.cameras.main.height - 90;
    
    // Enhanced split button with better visual feedback
    this.splitButton = this.add.container(x, y);
    
    // Outer glow ring
    const outerRing = this.add.circle(0, 0, 45, 0x9966ff, 0.3);
    
    // Main button
    const bg = this.add.circle(0, 0, 40, 0x9966ff, 0.9);
    bg.setStrokeStyle(3, 0xffffff, 0.8);
    
    // Inner highlight
    const innerHighlight = this.add.circle(0, -8, 25, 0xffffff, 0.2);
    
    // Enhanced text
    const text = this.add.text(0, 2, 'SPLIT', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    text.setOrigin(0.5);
    
    // Key hint
    const keyHint = this.add.text(0, 25, '[SPACE]', {
      fontSize: '10px',
      color: '#cccccc',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 1
    });
    keyHint.setOrigin(0.5);
    
    this.splitButton.add([outerRing, bg, innerHighlight, text, keyHint]);
    this.splitButton.setScrollFactor(0);
    this.splitButton.setDepth(100);
    
    // Enhanced interactivity
    bg.setInteractive({ useHandCursor: true });
    
    const onPress = () => {
      // Visual feedback
      this.tweens.add({
        targets: this.splitButton,
        scaleX: 0.9,
        scaleY: 0.9,
        duration: 100,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });
      
      const gameScene = this.scene.get('GameScene');
      if (gameScene) {
        gameScene.events.emit('split');
      }
    };
    
    bg.on('pointerdown', onPress);
    
    // Keyboard shortcut
    this.input.keyboard?.on('keydown-SPACE', onPress);
    
    bg.on('pointerover', () => {
      bg.setFillStyle(0xbb88ff, 1);
      outerRing.setFillStyle(0xbb88ff, 0.5);
      this.splitButton.setScale(1.05);
    });
    
    bg.on('pointerout', () => {
      bg.setFillStyle(0x9966ff, 0.9);
      outerRing.setFillStyle(0x9966ff, 0.3);
      this.splitButton.setScale(1);
    });
  }

  updateMass(mass: number): void {
    this.massText.setText(`Mass: ${Math.floor(mass)}`);
  }

  updateLeaderboard(entries: LeaderboardEntry[]): void {
    for (let i = 0; i < this.leaderboardTexts.length; i++) {
      if (i < entries.length) {
        const entry = entries[i];
        const color = entry.isPlayer ? '#00ffcc' : '#cccccc';
        const rank = `${i + 1}.`;
        this.leaderboardTexts[i].setText(`${rank} ${entry.name}: ${Math.floor(entry.mass)}`);
        this.leaderboardTexts[i].setColor(color);
      } else {
        this.leaderboardTexts[i].setText('');
      }
    }
  }

  updateMinimap(
    playerPos: { x: number; y: number } | null,
    botPositions: { x: number; y: number }[]
  ): void {
    const minimapSize = 160;
    const padding = 20;
    const minimapX = this.cameras.main.width - padding - minimapSize;
    const minimapY = this.cameras.main.height - padding - minimapSize;
    
    const scaleX = minimapSize / GAME_CONFIG.WORLD_WIDTH;
    const scaleY = minimapSize / GAME_CONFIG.WORLD_HEIGHT;

    this.minimap.clear();
    
    // Draw world boundaries
    this.minimap.lineStyle(1, 0x333333, 0.5);
    this.minimap.strokeRect(minimapX, minimapY, minimapSize, minimapSize);

    // Draw bots with enhanced visualization
    for (const pos of botPositions) {
      const mx = minimapX + pos.x * scaleX;
      const my = minimapY + pos.y * scaleY;
      
      // Outer ring
      this.minimap.fillStyle(0xff4444, 0.4);
      this.minimap.fillCircle(mx, my, 5);
      
      // Core dot
      this.minimap.fillStyle(0xff6666, 1);
      this.minimap.fillCircle(mx, my, 2);
    }

    // Draw player with enhanced visualization
    if (playerPos) {
      const px = minimapX + playerPos.x * scaleX;
      const py = minimapY + playerPos.y * scaleY;
      
      // Outer glow ring
      this.minimap.fillStyle(0x00ffcc, 0.5);
      this.minimap.fillCircle(px, py, 8);
      
      // Main circle
      this.minimap.fillStyle(0x00ffcc, 1);
      this.minimap.fillCircle(px, py, 4);
      
      // Center dot
      this.minimap.fillStyle(0xffffff, 1);
      this.minimap.fillCircle(px, py, 1);
      
      // Direction indicator
      const indicatorSize = 3;
      this.minimap.fillStyle(0xffffff, 0.8);
      this.minimap.fillTriangle(
        px, py - 10,
        px - indicatorSize, py - 5,
        px + indicatorSize, py - 5
      );
    }
    
    // Draw grid lines on minimap
    this.minimap.lineStyle(0.5, 0x222222, 0.3);
    const gridSpacing = 40;
    for (let i = minimapX; i <= minimapX + minimapSize; i += gridSpacing) {
      this.minimap.lineBetween(i, minimapY, i, minimapY + minimapSize);
    }
    for (let i = minimapY; i <= minimapY + minimapSize; i += gridSpacing) {
      this.minimap.lineBetween(minimapX, i, minimapX + minimapSize, i);
    }
  }
}
