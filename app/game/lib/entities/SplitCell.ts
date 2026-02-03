import Phaser from 'phaser';
import { massToRadius, massToSpeed, generateId, GAME_CONFIG } from '../config';

const ATTRACT_TIME = 17000; // 17 seconds - start attracting
const MERGE_TIME = 20000; // 20 seconds - can merge

export class SplitCell extends Phaser.GameObjects.Container {
  public cellId: string;
  public mass: number;
  public cellColor: number;
  public parentId: string;
  public splitTime: number;
  public canMerge: boolean = false;
  public isAttracting: boolean = false;
  public cellName: string;
  
  private boostPhase: boolean = true;
  private slowdownPhase: boolean = false;
  private boostDistance: number = 0;
  private maxBoostDistance: number;
  private slowdownStartDist: number;
  private initialVelocityX: number;
  private initialVelocityY: number;
  
  private cellBody!: Phaser.GameObjects.Arc;
  private nameText!: Phaser.GameObjects.Text;
  private targetX: number;
  private targetY: number;
  private lastX: number;
  private lastY: number;

  constructor(
    scene: Phaser.Scene, 
    x: number, 
    y: number, 
    mass: number, 
    color: number,
    parentId: string,
    velocityX: number,
    velocityY: number,
    flyDistanceMultiplier: number = 4,
    name: string = ''
  ) {
    super(scene, x, y);

    this.cellId = generateId();
    this.mass = mass;
    this.cellColor = color;
    this.parentId = parentId;
    this.cellName = name;
    this.splitTime = Date.now();
    this.targetX = x;
    this.targetY = y;
    this.lastX = x;
    this.lastY = y;
    this.initialVelocityX = velocityX;
    this.initialVelocityY = velocityY;
    
    // Fly distance = flyDistanceMultiplier body lengths (2 radii per body length)
    this.maxBoostDistance = massToRadius(mass) * flyDistanceMultiplier * 2;
    // Slowdown starts at 3/4 of distance
    this.slowdownStartDist = this.maxBoostDistance * 0.75;

    const radius = massToRadius(this.mass);
    
    // Main body
    this.cellBody = scene.add.arc(0, 0, radius, 0, 360, false, this.cellColor);
    this.add(this.cellBody);
    
    // Name inside circle - at bottom, only visible from mass 50+
    const fontSize = Math.max(8, Math.min(14, radius * 0.35));
    this.nameText = scene.add.text(0, radius * 0.4, this.cellName, {
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

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(radius, -radius, -radius);
    body.setCollideWorldBounds(true);
    
    // Initial velocity for split direction
    body.setVelocity(velocityX, velocityY);

    this.setDepth(10);
  }

  setTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }
  
  getTimeSinceSplit(): number {
    return Date.now() - this.splitTime;
  }

  update(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!body) return;
    
    // Check time-based states
    const timeSinceSplit = this.getTimeSinceSplit();
    if (timeSinceSplit >= MERGE_TIME) {
      this.canMerge = true;
      this.isAttracting = true;
    } else if (timeSinceSplit >= ATTRACT_TIME) {
      this.isAttracting = true;
    }

    // Track distance traveled during boost
    if (this.boostPhase) {
      const moved = Math.sqrt(
        Math.pow(this.x - this.lastX, 2) + 
        Math.pow(this.y - this.lastY, 2)
      );
      this.boostDistance += moved;
      this.lastX = this.x;
      this.lastY = this.y;
      
      // Check if in slowdown phase (last 1/4 of distance)
      if (this.boostDistance >= this.slowdownStartDist) {
        this.slowdownPhase = true;
        // Smoothly reduce velocity in the last 1/4
        const remaining = this.maxBoostDistance - this.boostDistance;
        const slowdownRange = this.maxBoostDistance - this.slowdownStartDist;
        const slowdownFactor = Math.max(0.1, remaining / slowdownRange);
        
        body.setVelocity(
          body.velocity.x * (0.92 + slowdownFactor * 0.08),
          body.velocity.y * (0.92 + slowdownFactor * 0.08)
        );
      }
      
      // End boost after traveling full distance
      if (this.boostDistance >= this.maxBoostDistance) {
        this.boostPhase = false;
        this.slowdownPhase = false;
      }
      return; // Let velocity carry it during boost
    }

    // Normal movement after boost
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const radius = massToRadius(this.mass);

    // Speed depends on THIS cell's mass only
    const baseSpeed = massToSpeed(this.mass);
    
    // Speed scales with distance from mouse to cell center
    let speedMultiplier = 1;
    if (distance < radius) {
      // Inside cell - almost stop
      speedMultiplier = (distance / radius) * 0.1;
    } else if (distance < radius * 3) {
      // Close to cell - gradual increase
      speedMultiplier = 0.1 + ((distance - radius) / (radius * 2)) * 0.9;
    }
    
    const speed = baseSpeed * speedMultiplier;

    if (distance > 3) {
      const vx = (dx / distance) * speed;
      const vy = (dy / distance) * speed;
      body.setVelocity(vx, vy);
    } else {
      body.setVelocity(body.velocity.x * 0.8, body.velocity.y * 0.8);
    }
  }

  grow(addedMass: number): void {
    this.mass += addedMass;
    this.updateSize();
  }

  public updateSize(): void {
    const radius = massToRadius(this.mass);
    
    this.cellBody.setRadius(radius);
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setCircle(radius, -radius, -radius);
    }
    
    // Update name position and size
    const fontSize = Math.max(8, Math.min(20, radius * 0.35));
    this.nameText.setFontSize(fontSize);
    this.nameText.setPosition(0, radius * 0.4);
    this.nameText.setVisible(this.mass >= 50);
  }

  getRadius(): number {
    return massToRadius(this.mass);
  }
  
  canSplit(): boolean {
    return this.mass >= 50;
  }
}
