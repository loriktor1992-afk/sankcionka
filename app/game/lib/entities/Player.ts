import Phaser from 'phaser';
import { CellData } from '../types';
import { massToRadius, massToSpeed, generateId, randomPosition, GAME_CONFIG } from '../config';

export class Player extends Phaser.GameObjects.Container {
  public playerId: string;
  public mass: number;
  public cellColor: number;
  public playerName: string;
  
  private cellBody!: Phaser.GameObjects.Arc;
  private skinSprite!: Phaser.GameObjects.Image | null;
  private nameText!: Phaser.GameObjects.Text;
  private directionArrow!: Phaser.GameObjects.Triangle;
  public targetX: number;
  public targetY: number;

  constructor(scene: Phaser.Scene, name: string = 'Player', skinUrl: string | null = null) {
    const pos = randomPosition();
    super(scene, pos.x, pos.y);

    this.playerId = generateId();
    this.mass = GAME_CONFIG.STARTING_MASS;
    this.cellColor = 0x9966ff;
    this.playerName = name;
    this.targetX = pos.x;
    this.targetY = pos.y;
    this.skinSprite = null;

    const radius = massToRadius(this.mass);
    
    // Main body with improved rendering
    this.cellBody = scene.add.arc(0, 0, radius, 0, 360, false, this.cellColor);
    this.cellBody.setOrigin(0.5, 0.5);
    this.add(this.cellBody);
    
    // Enhanced glow effect with better quality
    const glow = scene.add.arc(0, 0, radius + 6, 0, 360, false, 0xffffff);
    glow.setAlpha(0.2);
    glow.setOrigin(0.5, 0.5);
    this.add(glow);
    
    // Subtle inner highlight
    const highlight = scene.add.arc(-radius * 0.2, -radius * 0.2, radius * 0.4, 0, 360, false, 0xffffff);
    highlight.setAlpha(0.3);
    highlight.setOrigin(0.5, 0.5);
    this.add(highlight);
    
    // Load skin if provided
    if (skinUrl) {
      scene.load.image('playerSkin', skinUrl);
      scene.load.once('complete', () => {
        this.createSkinSprite(scene, radius);
      });
      scene.load.start();
    }
    
    // Direction arrow
    this.directionArrow = scene.add.triangle(radius + 20, 0, 0, -6, 12, 0, 0, 6, 0xffffff);
    this.directionArrow.setAlpha(0.4);
    this.add(this.directionArrow);

    // Name along bottom arc of circle - only visible from mass 50+
    const fontSize = Math.max(8, Math.min(14, radius * 0.35));
    this.nameText = scene.add.text(0, 0, this.playerName, {
      fontSize: `${fontSize}px`,
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });
    this.nameText.setOrigin(0.5, 0.5);
    this.nameText.setVisible(this.mass >= 50);
    this.add(this.nameText);
    
    // Position text along bottom arc
    this.updateNamePosition();

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(radius, -radius, -radius);
    body.setCollideWorldBounds(true);

    this.setDepth(10);
  }
  
  private createSkinSprite(scene: Phaser.Scene, radius: number): void {
    if (scene.textures.exists('playerSkin')) {
      // Remove white background from texture
      this.removeWhiteBackground(scene, 'playerSkin');
      
      this.skinSprite = scene.add.image(0, 0, 'playerSkin');
      const size = radius * 1.8;
      this.skinSprite.setDisplaySize(size, size);
      this.add(this.skinSprite);
      this.moveTo(this.skinSprite, this.getIndex(this.cellBody) + 1);
    }
  }
  
  private updateNamePosition(): void {
    if (!this.nameText) return;
    
    const radius = massToRadius(this.mass);
    // Position text along bottom arc (slightly inside the circle)
    const textRadius = radius * 0.7;
    this.nameText.setPosition(0, textRadius);
    
    // Curve the text along the arc (approximation)
    const textLength = this.playerName.length * 4; // Approximate character width
    const arcLength = Math.min(textLength, radius * Math.PI);
    const anglePerChar = arcLength / (this.playerName.length * textRadius);
    
    // For simplicity, we'll just adjust vertical position based on text width
    // In a real implementation, you'd curve each character individually
    const curveOffset = Math.min(8, textLength / 3);
    this.nameText.setPosition(0, textRadius + curveOffset);
  }
  
  private removeWhiteBackground(scene: Phaser.Scene, textureKey: string): void {
    const texture = scene.textures.get(textureKey);
    const source = texture.getSourceImage() as HTMLImageElement;
    
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(source, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Make white/near-white pixels transparent
    const threshold = 240;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // If pixel is white or near-white, make it transparent
      if (r > threshold && g > threshold && b > threshold) {
        data[i + 3] = 0; // Set alpha to 0
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Replace texture with processed canvas
    scene.textures.remove(textureKey);
    scene.textures.addCanvas(textureKey, canvas);
  }

  setTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  update(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const radius = massToRadius(this.mass);

    // Base speed depends on mass
    const baseSpeed = massToSpeed(this.mass);
    
    // Speed scales with distance from mouse to cell center
    // If mouse inside cell (distance < radius) -> very slow
    // If mouse at edge -> medium speed
    // If mouse far away -> full speed
    let speedMultiplier = 1;
    if (distance < radius) {
      // Inside cell - almost stop (0 to 0.1)
      speedMultiplier = (distance / radius) * 0.1;
    } else if (distance < radius * 3) {
      // Close to cell - gradual increase (0.1 to 1.0)
      speedMultiplier = 0.1 + ((distance - radius) / (radius * 2)) * 0.9;
    }
    
    const speed = baseSpeed * speedMultiplier;

    if (distance > 1) { // Уменьшено с 3 до 1 для более плавного движения
      const vx = (dx / distance) * speed;
      const vy = (dy / distance) * speed;
      body.setVelocity(vx, vy);
      
      // Update direction arrow position
      const angle = Math.atan2(dy, dx);
      this.directionArrow.setPosition(
        Math.cos(angle) * (radius + 15),
        Math.sin(angle) * (radius + 15)
      );
      this.directionArrow.setRotation(angle);
      this.directionArrow.setAlpha(Math.min(0.5, speedMultiplier));
    } else {
      // Плавная остановка вместо резкого затухания
      body.setVelocity(body.velocity.x * 0.95, body.velocity.y * 0.95);
      this.directionArrow.setAlpha(0.1);
    }
    
    // Name stays centered
  }

  grow(addedMass: number): void {
    this.mass += addedMass;
    
    // Growth pop animation
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 80,
      yoyo: true,
      ease: 'Back.easeOut'
    });
    
    this.updateSize();
  }

  public updateSize(): void {
    const radius = massToRadius(this.mass);
    
    this.cellBody.setRadius(radius);
    
    // Update skin size
    if (this.skinSprite) {
      const size = radius * 1.8;
      this.skinSprite.setDisplaySize(size, size);
    }
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setCircle(radius, -radius, -radius);
    }

    // Scale font with radius
    const fontSize = Math.max(8, Math.min(20, radius * 0.35));
    this.nameText.setFontSize(fontSize);
    // Only show name when mass >= 50
    this.nameText.setVisible(this.mass >= 50);
    
    // Update name position along arc
    this.updateNamePosition();
  }

  getRadius(): number {
    return massToRadius(this.mass);
  }

  getData(): CellData {
    return {
      id: this.playerId,
      x: this.x,
      y: this.y,
      mass: this.mass,
      color: this.cellColor,
      name: this.playerName
    };
  }
}
