import Phaser from 'phaser';
import { FoodData } from '../types';
import { generateId, randomPosition, randomFoodColor, GAME_CONFIG } from '../config';

export class Food extends Phaser.GameObjects.Container {
  public foodId: string;
  public mass: number;
  public foodColor: number;
  
  private foodBody!: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x?: number, y?: number, mass?: number) {
    const pos = (x !== undefined && y !== undefined) ? { x, y } : randomPosition();
    const foodMass = mass ?? GAME_CONFIG.FOOD_MASS;
    const color = randomFoodColor();

    super(scene, pos.x, pos.y);

    this.foodId = generateId();
    this.mass = foodMass;
    this.foodColor = color;

    // Уменьшенный размер еды с улучшенной отрисовкой
    this.foodBody = scene.add.arc(0, 0, 3.5, 0, 360, false, color);
    this.foodBody.setOrigin(0.5, 0.5);
    this.add(this.foodBody);
    
    // Subtle inner glow for food
    const innerGlow = scene.add.arc(0, 0, 2, 0, 360, false, 0xffffff);
    innerGlow.setAlpha(0.4);
    innerGlow.setOrigin(0.5, 0.5);
    this.add(innerGlow);

    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    if (body) {
      body.setCircle(4, -4, -4); // Уменьшено соответственно
    }

    this.setDepth(3);
  }

  getData(): FoodData {
    return {
      id: this.foodId,
      x: this.x,
      y: this.y,
      mass: this.mass,
      color: this.foodColor
    };
  }

  respawn(): void {
    const pos = randomPosition();
    this.setPosition(pos.x, pos.y);
    this.mass = GAME_CONFIG.FOOD_MASS;
    this.foodColor = randomFoodColor();
    this.foodBody.setFillStyle(this.foodColor);
    
    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    if (body) {
      body.position.set(pos.x - 8, pos.y - 8);
    }
    
    this.setActive(true);
    this.setVisible(true);
  }
  
  getRadius(): number {
    return 3.5; // Уменьшенный радиус
  }
}
