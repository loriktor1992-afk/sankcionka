import Phaser from 'phaser';
import { GAME_CONFIG, massToRadius, getSplitDistance } from '../config';
import { LeaderboardEntry } from '../types';
import { Player } from '../entities/Player';
import { Bot } from '../entities/Bot';
import { Food } from '../entities/Food';
import { SplitCell } from '../entities/SplitCell';
import { UIScene } from './UIScene';
import { SoundManager } from '../SoundManager';

const MIN_SPLIT_MASS = 35; // Minimum mass to split
const MAX_SPLIT_CELLS = 32; // Maximum number of split cells
const MERGE_TIME = 20000; // 20 seconds until merge
const ATTRACT_TIME = 17000; // 17 seconds - start attracting

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private bots: Bot[] = [];
  private foods: Food[] = [];
  private splitCells: SplitCell[] = [];
  private grid!: Phaser.GameObjects.Graphics;
  private gameOver: boolean = false;
  private eatParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private trailParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private deathParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private lastTrailTime: number = 0;
  private cameraTargetX: number = 0;
  private cameraTargetY: number = 0;
  private soundManager!: SoundManager;
  private frameEatenFood: Set<string> = new Set();

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Set world bounds
    this.physics.world.setBounds(0, 0, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);
    this.physics.world.setBoundsCollision(true, true, true, true);
    this.physics.world.gravity.setTo(0, 0);
    
    // Initialize sound manager
    this.soundManager = new SoundManager(this);

    // Draw grid background
    this.createGrid();
    
    // Create particle texture
    this.createParticleTexture();

    // Create food
    this.createFood();

    // Get player name from lobby
    const playerName = typeof window !== 'undefined' ? (window as any).__playerName || 'You' : 'You';
    const playerSkin = typeof window !== 'undefined' ? (window as any).__playerSkin : null;
    
    // Create player
    this.player = new Player(this, playerName, playerSkin);

    // Create bots
    this.createBots();

    // Setup camera
    this.cameras.main.setBounds(0, 0, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);
    this.cameras.main.setZoom(2.0); // Start 2x closer
    this.cameraTargetX = this.player.x;
    this.cameraTargetY = this.player.y;
    this.cameras.main.centerOn(this.player.x, this.player.y);
    
    // Post FX - Vignette (check if available)
    if (this.cameras.main.postFX) {
      this.cameras.main.postFX.addVignette(0.5, 0.5, 0.9, 0.3);
    }

    // Setup collisions
    this.setupCollisions();

    // Start UI scene
    this.scene.launch('UIScene');

    // Input handling
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.player.setTarget(worldPoint.x, worldPoint.y);
      // Update split cells target too
      for (const cell of this.splitCells) {
        if (cell.active) {
          cell.setTarget(worldPoint.x, worldPoint.y);
        }
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.player.setTarget(worldPoint.x, worldPoint.y);
      // Update split cells target too
      for (const cell of this.splitCells) {
        if (cell.active) {
          cell.setTarget(worldPoint.x, worldPoint.y);
        }
      }
    });
    
    // Space key for splitting - use addKey for more reliable detection
    const spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    if (spaceKey) {
      spaceKey.on('down', () => {
        this.handleSplit();
      });
    }
    
    // Listen for split event from UI button
    this.events.on('split', () => {
      this.handleSplit();
    });
  }
  
  private handleSplit(): void {
    if (this.gameOver || !this.player.active) return;
    
    // Check max cells limit (player + split cells)
    const totalCells = 1 + this.splitCells.length;
    if (totalCells >= MAX_SPLIT_CELLS) {
      console.log('Max cells reached:', totalCells);
      return;
    }
    
    // Get mouse target for direction
    const pointer = this.input.activePointer;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const mouseX = worldPoint.x;
    const mouseY = worldPoint.y;
    
    // Find all cells that can split (player + split cells with mass >= 50)
    const cellsToSplit: { entity: Player | SplitCell, isPlayer: boolean }[] = [];
    
    if (this.player.mass >= MIN_SPLIT_MASS) {
      cellsToSplit.push({ entity: this.player, isPlayer: true });
    }
    
    for (const cell of this.splitCells) {
      if (cell.active && cell.mass >= MIN_SPLIT_MASS && totalCells + cellsToSplit.length < MAX_SPLIT_CELLS) {
        cellsToSplit.push({ entity: cell, isPlayer: false });
      }
    }
    
    if (cellsToSplit.length === 0) {
      console.log('No cells can split (mass < 50)');
      return;
    }
    
    console.log('SPLITTING', cellsToSplit.length, 'cells!');
    
    // Play split sound
    this.soundManager.playSplit();
    
    // Record split start time for merge timing
    (this as any)._splitStartTime = Date.now();
    
    // Calculate total mass for fly distance
    let totalMass = this.player.mass;
    for (const cell of this.splitCells) {
      if (cell.active) totalMass += cell.mass;
    }
    const flyDistance = getSplitDistance(totalMass);
    
    for (const { entity, isPlayer } of cellsToSplit) {
      // Calculate split direction (towards mouse)
      const dx = mouseX - entity.x;
      const dy = mouseY - entity.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      const dirX = dist > 1 ? dx / dist : 1;
      const dirY = dist > 1 ? dy / dist : 0;
      
      // Split mass in half
      const splitMass = entity.mass / 2;
      entity.mass = splitMass;
      
      if (isPlayer) {
        (entity as Player).updateSize();
      } else {
        (entity as SplitCell).updateSize();
      }
      
      // Create split cell with fly distance based on total mass
      const splitRadius = massToRadius(splitMass);
      const maxSpeed = GAME_CONFIG.BASE_SPEED * 2.5; // Max speed burst
      
      const vx = dirX * maxSpeed;
      const vy = dirY * maxSpeed;
      
      // Spawn right next to parent
      const radius = massToRadius(entity.mass);
      const spawnX = entity.x + dirX * (radius + splitRadius + 5);
      const spawnY = entity.y + dirY * (radius + splitRadius + 5);
      
      const color = isPlayer ? this.player.cellColor : (entity as SplitCell).cellColor;
      const parentId = isPlayer ? this.player.playerId : (entity as SplitCell).parentId;
      
      const splitCell = new SplitCell(
        this,
        spawnX,
        spawnY,
        splitMass,
        color,
        parentId,
        vx,
        vy,
        flyDistance,
        this.player.playerName // Pass player name to split cell
      );
      splitCell.setTarget(mouseX, mouseY);
      this.splitCells.push(splitCell);
      
      // Добавляем анимацию появления
      splitCell.setScale(0.1);
      this.tweens.add({
        targets: splitCell,
        scaleX: 1,
        scaleY: 1,
        duration: 300,
        ease: 'Back.easeOut'
      });
      
      // Setup collisions for new split cell
      this.setupSplitCellCollisions(splitCell);
    }
    
    this.screenShake(0.008, 100);
  }
  
  private setupSplitCellCollisions(cell: SplitCell): void {
    // Split cell eating food
    this.physics.add.overlap(
      cell,
      this.foods,
      (c, food) => this.handleSplitCellEatFood(c as SplitCell, food as Food),
      undefined,
      this
    );
    
    // Split cell vs bots
    for (const bot of this.bots) {
      this.physics.add.overlap(
        cell,
        bot,
        (c, b) => this.handleSplitCellVsBot(c as SplitCell, b as Bot),
        undefined,
        this
      );
    }
  }
  
  private handleSplitCellEatFood(cell: SplitCell, food: Food): void {
    if (!food.active || !cell.active) return;
    
    // Simple touch = eat (no particles)
    cell.grow(food.mass); // Gets ALL the mass
    
    this.time.delayedCall(GAME_CONFIG.FOOD_RESPAWN_DELAY, () => {
      food.respawn();
    });
    food.setActive(false);
    food.setVisible(false);
  }
  
  private handleSplitCellVsBot(cell: SplitCell, bot: Bot): void {
    if (!cell.active || !bot.active) return;
    
    const cellRadius = cell.getRadius();
    const botRadius = bot.getRadius();
    const dist = Phaser.Math.Distance.Between(cell.x, cell.y, bot.x, bot.y);
    
    // 80% overlap required for eating
    const biggerRadius = Math.max(cellRadius, botRadius);
    const overlapRequired = biggerRadius * 0.2; // Must overlap 80%
    
    if (dist > biggerRadius - overlapRequired) return;
    
    if (cell.mass > bot.mass * GAME_CONFIG.EAT_RATIO) {
      // No death particles
      cell.grow(bot.mass); // Gets ALL the mass
      bot.setActive(false);
      bot.setVisible(false);
      this.time.delayedCall(3000, () => {
        bot.respawn();
      });
    } else if (bot.mass > cell.mass * GAME_CONFIG.EAT_RATIO) {
      // Cell eaten by bot
      bot.grow(cell.mass); // Gets ALL the mass
      cell.setActive(false);
      cell.setVisible(false);
      // Remove from array
      const idx = this.splitCells.indexOf(cell);
      if (idx > -1) this.splitCells.splice(idx, 1);
      
      console.log('Split cell eaten. Remaining split cells:', this.splitCells.length);
      console.log('Player active:', this.player.active);
      
      // Check if all cells are dead (only if player also dead)
      if (!this.player.active) {
        const anyAlive = this.splitCells.some(c => c.active);
        console.log('Active split cells after eating:', anyAlive ? this.splitCells.filter(c => c.active).length : 0);
        if (!anyAlive) {
          console.log('ALL CELLS DEAD - GAME OVER');
          this.handleGameOver(bot);
        } else {
          console.log('Still have alive cells - game continues');
        }
      } else {
        console.log('Player still alive - game continues');
      }
    }
  }
  
  private checkMerge(): void {
    // Calculate center of mass for all cells
    let centerX = 0;
    let centerY = 0;
    let totalMass = 0;
    
    if (this.player.active) {
      centerX += this.player.x * this.player.mass;
      centerY += this.player.y * this.player.mass;
      totalMass += this.player.mass;
    }
    
    for (const cell of this.splitCells) {
      if (cell.active) {
        centerX += cell.x * cell.mass;
        centerY += cell.y * cell.mass;
        totalMass += cell.mass;
      }
    }
    
    if (totalMass > 0) {
      centerX /= totalMass;
      centerY /= totalMass;
    }
    
    // ATTRACTION PHASE 1: Gentle attraction to center of mass
    if (this.player.active && this.splitCells.length > 0) {
      const distToCenter = Phaser.Math.Distance.Between(this.player.x, this.player.y, centerX, centerY);
      if (distToCenter > 5) {
        // Плавное притяжение, которое усиливается со временем
        const elapsedTime = Date.now() - (this as any)._splitStartTime || 0;
        const attractStrength = Math.min(0.3 + (elapsedTime / 10000) * 0.7, 1.0); // 0.3 → 1.0 за 10 секунд
        const attractForce = 30 * attractStrength;
        
        const angle = Math.atan2(centerY - this.player.y, centerX - this.player.x);
        this.player.x += Math.cos(angle) * attractForce * 0.016;
        this.player.y += Math.sin(angle) * attractForce * 0.016;
      }
    }
    
    // All split cells attract to center of mass and to each other
    for (const cell of this.splitCells) {
      if (!cell.active) continue;
      
      // Attract to center of mass
      const distToCenter = Phaser.Math.Distance.Between(cell.x, cell.y, centerX, centerY);
      if (distToCenter > 0) {
        const attractForce = 80;
        const angle = Math.atan2(centerY - cell.y, centerX - cell.x);
        cell.x += Math.cos(angle) * attractForce * 0.016;
        cell.y += Math.sin(angle) * attractForce * 0.016;
      }
      
      // Attract to other nearby cells
      for (const other of this.splitCells) {
        if (other === cell || !other.active) continue;
        const dist = Phaser.Math.Distance.Between(cell.x, cell.y, other.x, other.y);
        if (dist > 0 && dist < 300) {
          const attractForce = 30;
          const angle = Math.atan2(other.y - cell.y, other.x - cell.x);
          cell.x += Math.cos(angle) * attractForce * 0.016;
          cell.y += Math.sin(angle) * attractForce * 0.016;
        }
      }
      
      // Attract to player if active
      if (this.player.active) {
        const distToPlayer = Phaser.Math.Distance.Between(cell.x, cell.y, this.player.x, this.player.y);
        if (distToPlayer > 0 && distToPlayer < 300) {
          const attractForce = 30;
          const angle = Math.atan2(this.player.y - cell.y, this.player.x - cell.x);
          cell.x += Math.cos(angle) * attractForce * 0.016;
          cell.y += Math.sin(angle) * attractForce * 0.016;
        }
      }
    }
    
    // MERGING: Only after 20 seconds (canMerge = true)
    // Stronger attraction when ready to merge
    for (const cell of this.splitCells) {
      if (!cell.active || !cell.canMerge) continue;
      
      const distToCenter = Phaser.Math.Distance.Between(cell.x, cell.y, centerX, centerY);
      if (distToCenter > 0) {
        const attractForce = 200; // Stronger pull when merging
        const angle = Math.atan2(centerY - cell.y, centerX - cell.x);
        cell.x += Math.cos(angle) * attractForce * 0.016;
        cell.y += Math.sin(angle) * attractForce * 0.016;
      }
    }
    
    // Second pass: smooth merge with player (gradual absorption)
    for (let i = this.splitCells.length - 1; i >= 0; i--) {
      const cell = this.splitCells[i];
      if (!cell.active || !cell.canMerge) continue;
      
      const dist = Phaser.Math.Distance.Between(cell.x, cell.y, this.player.x, this.player.y);
      const mergeRange = this.player.getRadius() + cell.getRadius();
      
      // Smooth merge: gradually transfer mass when overlapping
      if (dist < mergeRange * 0.9) {
        const transferRate = 0.15;
        const massToTransfer = cell.mass * transferRate;
        
        this.player.grow(massToTransfer);
        cell.mass -= massToTransfer;
        cell.updateSize();
        
        if (cell.mass < 2) {
          this.player.grow(cell.mass);
          cell.destroy();
          this.splitCells.splice(i, 1);
        }
      }
    }
    
    // Third pass: smooth merge between split cells
    for (let i = this.splitCells.length - 1; i >= 0; i--) {
      const cell1 = this.splitCells[i];
      if (!cell1.active || !cell1.canMerge) continue;
      
      for (let j = i - 1; j >= 0; j--) {
        const cell2 = this.splitCells[j];
        if (!cell2.active || !cell2.canMerge) continue;
        
        const dist = Phaser.Math.Distance.Between(cell1.x, cell1.y, cell2.x, cell2.y);
        const mergeRange = cell1.getRadius() + cell2.getRadius();
        
        if (dist < mergeRange * 0.9) {
          const transferRate = 0.15;
          const massToTransfer = cell1.mass * transferRate;
          
          cell2.grow(massToTransfer);
          cell1.mass -= massToTransfer;
          cell1.updateSize();
          
          if (cell1.mass < 2) {
            cell2.grow(cell1.mass);
            cell1.destroy();
            this.splitCells.splice(i, 1);
            break;
          }
        }
      }
    }
  }
  
  private createParticleTexture(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(8, 8, 8);
    graphics.generateTexture('particle', 16, 16);
    graphics.destroy();
    
    // Soft glow particle
    const glowGfx = this.make.graphics({ x: 0, y: 0 });
    glowGfx.fillStyle(0xffffff, 0.5);
    glowGfx.fillCircle(16, 16, 16);
    glowGfx.fillStyle(0xffffff, 1);
    glowGfx.fillCircle(16, 16, 8);
    glowGfx.generateTexture('glowParticle', 32, 32);
    glowGfx.destroy();
    
    // Eat particles
    this.eatParticles = this.add.particles(0, 0, 'particle', {
      speed: { min: 80, max: 200 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 350,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false
    });
    this.eatParticles.setDepth(100);
    
    // Trail particles
    this.trailParticles = this.add.particles(0, 0, 'glowParticle', {
      speed: { min: 5, max: 20 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.4, end: 0 },
      lifespan: 500,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false
    });
    this.trailParticles.setDepth(8);
    
    // Death explosion particles
    this.deathParticles = this.add.particles(0, 0, 'particle', {
      speed: { min: 150, max: 400 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 600,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false
    });
    this.deathParticles.setDepth(101);
  }
  
  private emitEatParticles(x: number, y: number, color: number): void {
    this.eatParticles.setParticleTint(color);
    this.eatParticles.emitParticleAt(x, y, 8);
  }
  
  private emitDeathParticles(x: number, y: number, mass: number): void {
    const count = Math.min(30, Math.floor(mass / 5) + 10);
    this.deathParticles.setParticleTint(0x00ffcc);
    this.deathParticles.emitParticleAt(x, y, count);
  }
  
  private screenShake(intensity: number = 0.005, duration: number = 100): void {
    this.cameras.main.shake(duration, intensity);
  }

  private createGrid(): void {
    this.grid = this.add.graphics();
    
    const W = GAME_CONFIG.WORLD_WIDTH;
    const H = GAME_CONFIG.WORLD_HEIGHT;
    
    // Dark background
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a0a, 1);
    bg.fillRect(0, 0, W, H);
    bg.setDepth(0);
    
    // Enhanced diagonal grid with anti-aliasing
    this.grid.lineStyle(1, 0x1a1a1a, 0.8);
    
    const gridSpacing = 60;
    
    // Primary grid lines
    for (let i = -H; i < W + H; i += gridSpacing) {
      this.grid.lineBetween(i, 0, i + H, H);
    }
    
    for (let i = 0; i < W + H; i += gridSpacing) {
      this.grid.lineBetween(i, 0, i - H, H);
    }
    
    // Secondary thinner grid for better detail
    this.grid.lineStyle(0.5, 0x252525, 0.4);
    const secondarySpacing = 20;
    
    for (let i = -H; i < W + H; i += secondarySpacing) {
      this.grid.lineBetween(i, 0, i + H, H);
    }
    
    for (let i = 0; i < W + H; i += secondarySpacing) {
      this.grid.lineBetween(i, 0, i - H, H);
    }
    
    this.grid.setDepth(1);
    
    // Enhanced visible border
    const border = this.add.graphics();
    border.lineStyle(3, 0x333333, 0.9);
    border.strokeRect(0, 0, W, H);
    border.setDepth(2);
    
    // Corner markers
    const corners = [
      [10, 10], [W - 10, 10], [10, H - 10], [W - 10, H - 10]
    ];
    
    corners.forEach(([x, y]) => {
      const marker = this.add.circle(x, y, 3, 0x444444, 0.6);
      marker.setDepth(3);
    });
  }

  private createFood(): void {
    for (let i = 0; i < GAME_CONFIG.FOOD_COUNT; i++) {
      const food = new Food(this);
      this.foods.push(food);
    }
  }

  private createBots(): void {
    for (let i = 0; i < GAME_CONFIG.BOT_COUNT; i++) {
      const name = GAME_CONFIG.BOT_NAMES[i % GAME_CONFIG.BOT_NAMES.length];
      const bot = new Bot(this, name);
      this.bots.push(bot);
    }
  }

  private setupCollisions(): void {
    // Enable physics collision callbacks
    this.physics.world.on('collide', (obj1: any, obj2: any) => {
      // Reduce bounce effect on collision
      const body1 = obj1.body as Phaser.Physics.Arcade.Body;
      const body2 = obj2.body as Phaser.Physics.Arcade.Body;
      
      if (body1 && body2) {
        // Reduce velocity on collision for smoother interaction
        body1.setVelocity(body1.velocity.x * 0.7, body1.velocity.y * 0.7);
        body2.setVelocity(body2.velocity.x * 0.7, body2.velocity.y * 0.7);
      }
    });

    // Player eating food
    this.physics.add.overlap(
      this.player,
      this.foods,
      (player, food) => this.handlePlayerEatFood(player as Player, food as Food),
      undefined,
      this
    );

    // Bots eating food
    for (const bot of this.bots) {
      this.physics.add.overlap(
        bot,
        this.foods,
        (b, food) => this.handleBotEatFood(b as Bot, food as Food),
        undefined,
        this
      );
    }

    // Player vs Bots collision
    this.physics.add.overlap(
      this.player,
      this.bots,
      (player, bot) => this.handleCellCollision(player as Player, bot as Bot),
      undefined,
      this
    );

    // Bot vs Bot collision
    for (let i = 0; i < this.bots.length; i++) {
      for (let j = i + 1; j < this.bots.length; j++) {
        this.physics.add.overlap(
          this.bots[i],
          this.bots[j],
          (bot1, bot2) => this.handleBotVsBotCollision(bot1 as Bot, bot2 as Bot),
          undefined,
          this
        );
      }
    }
  }
  
  // Push split cells apart from player and each other (only when NOT merging)
  private handleSplitCellsCollision(): void {
    const GAP = 5; // Minimum gap between cells
    
    // Player vs split cells - push apart (only if not canMerge)
    for (const cell of this.splitCells) {
      if (!cell.active) continue;
      if (cell.canMerge) continue; // Don't push apart when merging
      
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, cell.x, cell.y);
      const minDist = this.player.getRadius() + cell.getRadius() + GAP;
      
      if (dist < minDist && dist > 0) {
        // Push apart - full overlap correction
        const overlap = minDist - dist;
        const angle = Math.atan2(cell.y - this.player.y, cell.x - this.player.x);
        
        // Move cell away (full correction)
        cell.x += Math.cos(angle) * overlap * 0.6;
        cell.y += Math.sin(angle) * overlap * 0.6;
        
        // Move player away
        this.player.x -= Math.cos(angle) * overlap * 0.6;
        this.player.y -= Math.sin(angle) * overlap * 0.6;
      }
    }
    
    // Split cells vs split cells - push apart (only if neither can merge)
    for (let i = 0; i < this.splitCells.length; i++) {
      for (let j = i + 1; j < this.splitCells.length; j++) {
        const cell1 = this.splitCells[i];
        const cell2 = this.splitCells[j];
        
        if (!cell1.active || !cell2.active) continue;
        if (cell1.canMerge && cell2.canMerge) continue; // Don't push when both merging
        
        const dist = Phaser.Math.Distance.Between(cell1.x, cell1.y, cell2.x, cell2.y);
        const minDist = cell1.getRadius() + cell2.getRadius() + GAP;
        
        if (dist < minDist && dist > 0) {
          const overlap = minDist - dist;
          const angle = Math.atan2(cell2.y - cell1.y, cell2.x - cell1.x);
          
          // Full correction for both cells
          cell1.x -= Math.cos(angle) * overlap * 0.6;
          cell1.y -= Math.sin(angle) * overlap * 0.6;
          cell2.x += Math.cos(angle) * overlap * 0.6;
          cell2.y += Math.sin(angle) * overlap * 0.6;
        }
      }
    }
  }

  private handlePlayerEatFood(player: Player, food: Food): void {
    if (!food.active || !player.active) return;
    
    // Check if this food was already eaten this frame
    if (this.frameEatenFood.has(food.foodId)) return;
    
    // Immediate consumption - no delay
    player.grow(food.mass); // Gets ALL the mass
    
    // Play eat sound
    this.soundManager.playEat();
    
    // Instant hide food
    food.setActive(false);
    food.setVisible(false);
    
    // Mark as eaten this frame to prevent double-eating
    this.frameEatenFood.add(food.foodId);
    
    // Schedule respawn
    this.time.delayedCall(GAME_CONFIG.FOOD_RESPAWN_DELAY, () => {
      if (food) {
        food.respawn();
      }
    });
  }
  
  // Check food collisions manually for reliability
  private checkFoodCollisions(): void {
    // Track recently eaten food to prevent double-eating
    const eatenThisFrame = new Set<string>();
    
    // First pass: collect all active foods
    const activeFoods = this.foods.filter(food => food.active && !eatenThisFrame.has(food.foodId));
    
    for (const food of activeFoods) {
      if (!food.active || eatenThisFrame.has(food.foodId)) continue;
      
      // Check player first (highest priority)
      if (this.player.active) {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, food.x, food.y);
        const collisionRadius = (this.player.getRadius() + food.getRadius()) * 1.1;
        if (dist < collisionRadius) {
          this.player.grow(food.mass); // Gets ALL the mass
          this.soundManager.playEat();
          food.setActive(false);
          food.setVisible(false);
          eatenThisFrame.add(food.foodId);
          this.time.delayedCall(GAME_CONFIG.FOOD_RESPAWN_DELAY, () => {
            if (food) {
              food.respawn();
            }
          });
          continue;
        }
      }
      
      // Check split cells
      let eatenBySplit = false;
      for (const cell of this.splitCells) {
        if (!cell.active || !food.active) continue;
        const dist = Phaser.Math.Distance.Between(cell.x, cell.y, food.x, food.y);
        const collisionRadius = (cell.getRadius() + food.getRadius()) * 1.1;
        if (dist < collisionRadius) {
          cell.grow(food.mass);
          food.setActive(false);
          food.setVisible(false);
          eatenThisFrame.add(food.foodId);
          this.time.delayedCall(GAME_CONFIG.FOOD_RESPAWN_DELAY, () => {
            if (food) {
              food.respawn();
            }
          });
          eatenBySplit = true;
          break;
        }
      }
      
      if (eatenBySplit) continue;
      
      // Check bots
      for (const bot of this.bots) {
        if (!bot.active || !food.active) continue;
        const dist = Phaser.Math.Distance.Between(bot.x, bot.y, food.x, food.y);
        const collisionRadius = (bot.getRadius() + food.getRadius()) * 1.1;
        if (dist < collisionRadius) {
          bot.grow(food.mass);
          food.setActive(false);
          food.setVisible(false);
          eatenThisFrame.add(food.foodId);
          this.time.delayedCall(GAME_CONFIG.FOOD_RESPAWN_DELAY, () => {
            if (food) {
              food.respawn();
            }
          });
          break;
        }
      }
    }
  }

  private handleBotEatFood(bot: Bot, food: Food): void {
    if (!food.active || !bot.active) return;
    
    // Check if this food was already eaten this frame
    if (this.frameEatenFood.has(food.foodId)) return;
    
    // Immediate consumption
    bot.grow(food.mass); // Gets ALL the mass
    
    // Instant visual feedback
    food.setActive(false);
    food.setVisible(false);
    
    // Mark as eaten this frame to prevent double-eating
    this.frameEatenFood.add(food.foodId);
    
    this.time.delayedCall(GAME_CONFIG.FOOD_RESPAWN_DELAY, () => {
      if (food) {
        food.respawn();
      }
    });
  }

  private handleCellCollision(player: Player, bot: Bot): void {
    if (!bot.active || this.gameOver) return;
    if (!player.active) return; // Player already dead

    const playerRadius = player.getRadius();
    const botRadius = bot.getRadius();

    const dist = Phaser.Math.Distance.Between(player.x, player.y, bot.x, bot.y);
    
    // 80% overlap required for eating
    const biggerRadius = Math.max(playerRadius, botRadius);
    const overlapRequired = biggerRadius * 0.2;

    if (dist > biggerRadius - overlapRequired) return;

    if (player.mass > bot.mass * GAME_CONFIG.EAT_RATIO) {
      // No death particles - just eat
      this.screenShake(0.01, 180);
      
      // Player gets ALL the mass from bot
      player.grow(bot.mass);
      bot.setActive(false);
      bot.setVisible(false);
      
      this.time.delayedCall(3000, () => {
        bot.respawn();
      });
    } else if (bot.mass > player.mass * GAME_CONFIG.EAT_RATIO) {
      this.screenShake(0.02, 250);
      
      // Bot eats the player cell
      bot.grow(player.mass); // Gets ALL the mass
      player.setActive(false);
      player.setVisible(false);
      
      // Play death sound
      this.soundManager.playDeath();
      
      console.log('Player eaten by bot. Split cells count:', this.splitCells.length);
      console.log('Active split cells:', this.splitCells.filter(c => c.active).length);
      
      // Check if ALL player cells are dead (game over only then)
      // Only check if there are no split cells
      if (this.splitCells.length === 0) {
        console.log('No split cells - GAME OVER');
        this.handleGameOver(bot);
      } else {
        console.log('Split cells exist - game continues');
      }
      // If there are split cells, game continues until all are dead
    }
  }

  private handleBotVsBotCollision(bot1: Bot, bot2: Bot): void {
    if (!bot1.active || !bot2.active) return;

    const dist = Phaser.Math.Distance.Between(bot1.x, bot1.y, bot2.x, bot2.y);
    
    // 80% overlap required for eating
    const biggerRadius = Math.max(bot1.getRadius(), bot2.getRadius());
    const overlapRequired = biggerRadius * 0.2;

    if (dist > biggerRadius - overlapRequired) return;

    if (bot1.mass > bot2.mass * GAME_CONFIG.EAT_RATIO) {
      bot1.grow(bot2.mass); // Gets ALL the mass
      bot2.setActive(false);
      bot2.setVisible(false);
      this.time.delayedCall(3000, () => {
        bot2.respawn();
      });
    } else if (bot2.mass > bot1.mass * GAME_CONFIG.EAT_RATIO) {
      bot2.grow(bot1.mass); // Gets ALL the mass
      bot1.setActive(false);
      bot1.setVisible(false);
      this.time.delayedCall(3000, () => {
        bot1.respawn();
      });
    }
  }

  // Method removed - logic moved inline for clarity

  private handleGameOver(killer: Bot): void {
    this.gameOver = true;
    
    // Hide player if still visible
    this.player.setActive(false);
    this.player.setVisible(false);
    
    // Destroy all remaining split cells
    for (const cell of this.splitCells) {
      if (cell.active) {
        cell.destroy();
      }
    }
    this.splitCells = [];

    // Show game over screen
    const overlay = this.add.rectangle(
      this.cameras.main.scrollX + GAME_CONFIG.WIDTH / 2,
      this.cameras.main.scrollY + GAME_CONFIG.HEIGHT / 2,
      GAME_CONFIG.WIDTH,
      GAME_CONFIG.HEIGHT,
      0x000000,
      0.7
    );
    overlay.setDepth(50);

    const gameOverText = this.add.text(
      this.cameras.main.scrollX + GAME_CONFIG.WIDTH / 2,
      this.cameras.main.scrollY + GAME_CONFIG.HEIGHT / 2 - 50,
      'GAME OVER',
      {
        fontSize: '48px',
        color: '#ff6b6b',
        fontFamily: 'Arial',
        fontStyle: 'bold'
      }
    );
    gameOverText.setOrigin(0.5);
    gameOverText.setDepth(51);

    const scoreText = this.add.text(
      this.cameras.main.scrollX + GAME_CONFIG.WIDTH / 2,
      this.cameras.main.scrollY + GAME_CONFIG.HEIGHT / 2 + 10,
      `Final Mass: ${Math.floor(this.player.mass)}`,
      {
        fontSize: '24px',
        color: '#ffffff',
        fontFamily: 'Arial'
      }
    );
    scoreText.setOrigin(0.5);
    scoreText.setDepth(51);

    const restartText = this.add.text(
      this.cameras.main.scrollX + GAME_CONFIG.WIDTH / 2,
      this.cameras.main.scrollY + GAME_CONFIG.HEIGHT / 2 + 60,
      'Tap to restart',
      {
        fontSize: '20px',
        color: '#4ecdc4',
        fontFamily: 'Arial'
      }
    );
    restartText.setOrigin(0.5);
    restartText.setDepth(51);

    // Restart on click
    this.time.delayedCall(1000, () => {
      this.input.once('pointerdown', () => {
        this.scene.stop('UIScene');
        this.scene.restart();
      });
    });
  }

  update(time: number, delta: number): void {
    if (this.gameOver) return;
    
    // Clear frame eaten food tracker
    this.frameEatenFood.clear();
    
    // Debug logging every 60 frames (~1 second)
    if (Math.floor(time / 16.67) % 60 === 0) {
      const activeSplitCells = this.splitCells.filter(c => c.active);
      console.log('[DEBUG] Frame:', Math.floor(time / 16.67), 
                  'Player active:', this.player.active,
                  'Split cells total:', this.splitCells.length,
                  'Active split cells:', activeSplitCells.length);
    }

    // Update player
    this.player.update();
    
    // Update split cells
    for (const cell of this.splitCells) {
      if (cell.active) {
        cell.update();
      }
    }
    
    // Handle collision between player and split cells (push apart)
    // Run multiple iterations for better separation
    for (let i = 0; i < 3; i++) {
      this.handleSplitCellsCollision();
    }
    
    // Check food collisions manually (more reliable than physics overlap)
    this.checkFoodCollisions();
    
    // Check for merging
    this.checkMerge();
    
    // Camera follows player (main cell that follows mouse)
    let cameraTarget = this.player;
    
    // Find the cell closest to mouse to determine main controller
    const pointer = this.input.activePointer;
    const mouseWorld = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    
    let closestCell: { x: number; y: number } = this.player;
    let closestDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, mouseWorld.x, mouseWorld.y);
    let hasActiveSplitCells = false;
    
    for (const cell of this.splitCells) {
      if (!cell.active) continue;
      hasActiveSplitCells = true;
      const dist = Phaser.Math.Distance.Between(cell.x, cell.y, mouseWorld.x, mouseWorld.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestCell = cell;
      }
    }
    
    // If split cells exist, camera follows the cell closest to mouse
    if (hasActiveSplitCells && closestCell !== this.player) {
      cameraTarget = closestCell as any;
    }
    
    // Smoothly interpolate camera target (very smooth transition)
    const lerpSpeed = 0.03; // Lower = smoother
    this.cameraTargetX = Phaser.Math.Linear(this.cameraTargetX, cameraTarget.x, lerpSpeed);
    this.cameraTargetY = Phaser.Math.Linear(this.cameraTargetY, cameraTarget.y, lerpSpeed);
    
    // Move camera to target
    this.cameras.main.centerOn(this.cameraTargetX, this.cameraTargetY);
    
    // Emit trail particles when moving
    if (this.player.active) {
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      if (body && (Math.abs(body.velocity.x) > 50 || Math.abs(body.velocity.y) > 50)) {
        if (time - this.lastTrailTime > 50) {
          this.lastTrailTime = time;
          this.trailParticles.setParticleTint(0x00ffcc);
          this.trailParticles.emitParticleAt(
            this.player.x - body.velocity.x * 0.02,
            this.player.y - body.velocity.y * 0.02,
            1
          );
        }
      }
    }

    // Update bots AI
    const playerData = this.player.active ? 
      { x: this.player.x, y: this.player.y, mass: this.player.mass } : null;

    for (const bot of this.bots) {
      if (bot.active) {
        bot.updateAI(delta, this.foods, playerData, this.bots);
      }
    }

    // Update UI
    const uiScene = this.scene.get('UIScene') as UIScene;
    if (uiScene) {
      // Total mass = player + all split cells
      let totalMass = this.player.mass;
      for (const cell of this.splitCells) {
        if (cell.active) totalMass += cell.mass;
      }
      uiScene.updateMass(totalMass);
      uiScene.updateLeaderboard(this.getLeaderboard());
      uiScene.updateMinimap(
        playerData,
        this.bots.filter(b => b.active).map(b => ({ x: b.x, y: b.y }))
      );
    }

    // Calculate total mass for camera zoom
    let totalMass = this.player.mass;
    for (const cell of this.splitCells) {
      if (cell.active) totalMass += cell.mass;
    }
    
    // Adjust camera zoom - starts at 2.0, zooms out as mass grows
    const baseZoom = 2.0;
    const massRatio = totalMass / GAME_CONFIG.STARTING_MASS;
    const zoomReduction = Math.log(massRatio + 1) * 0.25;
    const targetZoom = Math.max(0.5, baseZoom - zoomReduction);
    
    // Smooth zoom transition
    const currentZoom = this.cameras.main.zoom;
    const zoomDiff = targetZoom - currentZoom;
    if (Math.abs(zoomDiff) > 0.001) {
      this.cameras.main.setZoom(currentZoom + zoomDiff * 0.03);
    }
  }

  private getLeaderboard(): LeaderboardEntry[] {
    const entries: LeaderboardEntry[] = [];

    // Add player
    if (this.player.active) {
      entries.push({
        name: this.player.playerName,
        mass: this.player.mass,
        isPlayer: true
      });
    }

    // Add bots
    for (const bot of this.bots) {
      if (bot.active) {
        entries.push({
          name: bot.botName,
          mass: bot.mass,
          isPlayer: false
        });
      }
    }

    // Sort by mass descending
    entries.sort((a, b) => b.mass - a.mass);

    // Return top entries
    return entries.slice(0, GAME_CONFIG.LEADERBOARD_SIZE);
  }
}
