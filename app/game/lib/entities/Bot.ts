import Phaser from 'phaser';
import { CellData } from '../types';
import { massToRadius, massToSpeed, generateId, randomPosition, GAME_CONFIG } from '../config';
import { Food } from './Food';

const VICTORY_MASS = 1000; // Goal mass for bots

enum BotState {
  WANDER = 'WANDER',
  EAT = 'EAT',
  FLEE = 'FLEE',
  HUNT = 'HUNT'
}

export class Bot extends Phaser.GameObjects.Container {
  public botId: string;
  public mass: number;
  public cellColor: number;
  public botName: string;
  public state: BotState;
  
  private cellBody: Phaser.GameObjects.Arc;
  private nameText: Phaser.GameObjects.Text;
  private targetX: number;
  private targetY: number;
  private stateTimer: number;
  private wanderAngle: number;

  constructor(scene: Phaser.Scene, name: string) {
    const pos = randomPosition();
    super(scene, pos.x, pos.y);

    this.botId = generateId();
    this.mass = GAME_CONFIG.STARTING_MASS + Phaser.Math.Between(-5, 10);
    const colors = [0xff6699, 0x66ccff, 0x99ff66, 0xffcc66, 0xcc99ff, 0x66ffcc];
    this.cellColor = colors[Math.floor(Math.random() * colors.length)];
    this.botName = name;
    this.state = BotState.WANDER;
    this.targetX = pos.x;
    this.targetY = pos.y;
    this.stateTimer = 0;
    this.wanderAngle = Math.random() * Math.PI * 2;

    const radius = massToRadius(this.mass);
    
    this.cellBody = scene.add.arc(0, 0, radius, 0, 360, false, this.cellColor);
    this.cellBody.setOrigin(0.5, 0.5);
    this.add(this.cellBody);
    
    // Subtle glow for bots
    const glow = scene.add.arc(0, 0, radius + 4, 0, 360, false, this.cellColor);
    glow.setAlpha(0.15);
    glow.setOrigin(0.5, 0.5);
    this.add(glow);

    // Name inside circle - at bottom, only visible from mass 50+
    const fontSize = Math.max(7, Math.min(12, radius * 0.35));
    this.nameText = scene.add.text(0, radius * 0.4, this.botName, {
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

    this.setDepth(5);
  }

  updateAI(
    delta: number,
    foods: Food[],
    player: { x: number; y: number; mass: number } | null,
    otherBots: Bot[]
  ): void {
    if (!this.active) return;
    
    this.stateTimer += delta;
    
    // Calculate how close to victory goal
    const progressToGoal = this.mass / VICTORY_MASS;
    const isCloseToWin = this.mass > 700;
    const needsGrowth = this.mass < 500;

    // Find best food (closer = better)
    let bestFood: Food | null = null;
    let bestFoodScore = -Infinity;
    
    for (const food of foods) {
      if (!food.active) continue;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, food.x, food.y);
      // Score: closer food is better, prioritize dense areas
      const score = 1000 - dist + food.mass * 10;
      if (score > bestFoodScore) {
        bestFoodScore = score;
        bestFood = food;
      }
    }

    // Find threats and prey
    let nearestThreat: { x: number; y: number; mass: number } | null = null;
    let bestPrey: { x: number; y: number; mass: number; score: number } | null = null;
    let threatDist = Infinity;
    let bestPreyScore = -Infinity;

    // Check player
    if (player) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (player.mass > this.mass * 1.15) {
        if (dist < threatDist) {
          threatDist = dist;
          nearestThreat = player;
        }
      } else if (this.mass > player.mass * 1.15) {
        // Score prey: bigger mass = more valuable, closer = better
        const preyScore = player.mass * 2 - dist * 0.5;
        if (preyScore > bestPreyScore) {
          bestPreyScore = preyScore;
          bestPrey = { x: player.x, y: player.y, mass: player.mass, score: preyScore };
        }
      }
    }

    // Check other bots
    for (const bot of otherBots) {
      if (bot === this || !bot.active) continue;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, bot.x, bot.y);
      
      if (bot.mass > this.mass * 1.15) {
        if (dist < threatDist) {
          threatDist = dist;
          nearestThreat = { x: bot.x, y: bot.y, mass: bot.mass };
        }
      } else if (this.mass > bot.mass * 1.15) {
        const preyScore = bot.mass * 2 - dist * 0.5;
        if (preyScore > bestPreyScore) {
          bestPreyScore = preyScore;
          bestPrey = { x: bot.x, y: bot.y, mass: bot.mass, score: preyScore };
        }
      }
    }

    // Determine behavior ranges based on size
    const myRadius = massToRadius(this.mass);
    const fleeRange = myRadius * (isCloseToWin ? 20 : 12); // More cautious when close to winning
    const huntRange = myRadius * (needsGrowth ? 25 : 15); // More aggressive when small

    // Decision making - prioritize survival, then growth
    if (nearestThreat && threatDist < fleeRange) {
      // FLEE - run away!
      this.state = BotState.FLEE;
      const angle = Math.atan2(this.y - nearestThreat.y, this.x - nearestThreat.x);
      this.targetX = this.x + Math.cos(angle) * 500;
      this.targetY = this.y + Math.sin(angle) * 500;
    } else if (bestPrey && (needsGrowth || bestPrey.mass > 30)) {
      // HUNT - chase prey for fast growth
      this.state = BotState.HUNT;
      // Predict where prey is going
      this.targetX = bestPrey.x;
      this.targetY = bestPrey.y;
    } else if (bestFood) {
      // EAT - always go for food
      this.state = BotState.EAT;
      this.targetX = bestFood.x;
      this.targetY = bestFood.y;
    } else {
      // WANDER - move to find food, never stand still
      this.state = BotState.WANDER;
      // Change direction more frequently
      if (this.stateTimer > 800) {
        this.stateTimer = 0;
        this.wanderAngle += (Math.random() - 0.5) * 3;
        const wanderDist = 400 + Math.random() * 200;
        this.targetX = this.x + Math.cos(this.wanderAngle) * wanderDist;
        this.targetY = this.y + Math.sin(this.wanderAngle) * wanderDist;
      }
    }

    // Clamp to world bounds
    this.targetX = Phaser.Math.Clamp(this.targetX, 100, GAME_CONFIG.WORLD_WIDTH - 100);
    this.targetY = Phaser.Math.Clamp(this.targetY, 100, GAME_CONFIG.WORLD_HEIGHT - 100);

    this.moveToTarget();
  }

  private moveToTarget(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Speed ONLY depends on mass - no bonuses
    const speed = massToSpeed(this.mass);
    
    if (distance > 10) {
      const vx = (dx / distance) * speed;
      const vy = (dy / distance) * speed;
      body.setVelocity(vx, vy);
    } else {
      // Smoothly slow down instead of jerky direction change
      body.setVelocity(body.velocity.x * 0.95, body.velocity.y * 0.95);
      
      // Only pick new direction when nearly stopped
      if (Math.abs(body.velocity.x) < 5 && Math.abs(body.velocity.y) < 5) {
        this.wanderAngle = Math.random() * Math.PI * 2;
        const wanderDist = 300 + Math.random() * 200;
        this.targetX = this.x + Math.cos(this.wanderAngle) * wanderDist;
        this.targetY = this.y + Math.sin(this.wanderAngle) * wanderDist;
        this.targetX = Phaser.Math.Clamp(this.targetX, 100, GAME_CONFIG.WORLD_WIDTH - 100);
        this.targetY = Phaser.Math.Clamp(this.targetY, 100, GAME_CONFIG.WORLD_HEIGHT - 100);
      }
    }
  }

  grow(addedMass: number): void {
    this.mass += addedMass;
    this.updateSize();
  }

  private updateSize(): void {
    const radius = massToRadius(this.mass);
    
    this.cellBody.setRadius(radius);
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setCircle(radius, -radius, -radius);
    }

    // Scale font with radius, position at bottom inside circle
    const fontSize = Math.max(7, Math.min(18, radius * 0.3));
    this.nameText.setFontSize(fontSize);
    this.nameText.setPosition(0, radius * 0.4);
    this.nameText.setVisible(this.mass >= 50);
  }

  getRadius(): number {
    return massToRadius(this.mass);
  }

  respawn(): void {
    const pos = randomPosition();
    this.setPosition(pos.x, pos.y);
    this.mass = GAME_CONFIG.STARTING_MASS + Phaser.Math.Between(-5, 10);
    this.updateSize();
    this.setActive(true);
    this.setVisible(true);
  }

  getData(): CellData {
    return {
      id: this.botId,
      x: this.x,
      y: this.y,
      mass: this.mass,
      color: this.cellColor,
      name: this.botName
    };
  }
}
