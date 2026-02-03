export const GAME_CONFIG = {
  // Canvas dimensions (Full HD)
  WIDTH: 1920,
  HEIGHT: 1080,
  
  // World dimensions
  WORLD_WIDTH: 5000,
  WORLD_HEIGHT: 5000,
  
  // Player settings
  STARTING_MASS: 10,
  BASE_SPEED: 170, // Reduced another 25% from 225
  MIN_SPEED: 30,
  
  // Food settings
  FOOD_COUNT: 800,
  FOOD_MASS: 1,
  FOOD_MIN_MASS: 1,
  FOOD_MAX_MASS: 3,
  FOOD_RESPAWN_DELAY: 500,
  
  // Bot settings
  BOT_COUNT: 8,
  BOT_NAMES: [
    'Alpha', 'Beta', 'Gamma', 'Delta', 
    'Epsilon', 'Zeta', 'Eta', 'Theta',
    'Iota', 'Kappa', 'Lambda', 'Mu'
  ],
  
  // Collision settings
  EAT_RATIO: 1.2, // Must be 20% larger to eat
  
  // Visual settings
  CELL_COLORS: [
    0xffffff, 0xffffff, 0xffffff, 0xffffff,
    0xffffff, 0xffffff, 0xffffff, 0xffffff
  ],
  
  SHIELD_COLORS: [
    0x00ffcc, 0x00ffcc, 0x00ffcc, 0x00ffcc,
    0x00ffcc, 0x00ffcc, 0x00ffcc, 0x00ffcc
  ],
  
  FOOD_COLORS: [
    0xff0066, 0x00ff66, 0x6600ff, 0xffff00,
    0x00ffff, 0xff00ff, 0xff6600, 0x00ff00,
    0x0066ff, 0xff0000, 0x66ff00, 0xff00cc
  ],
  
  // Grass field settings
  GRASS_COLORS: [
    0x4caf50, 0x66bb6a, 0x81c784, 0xa5d6a7,
    0xc8e6c9, 0xdcedc8, 0xf1f8e9, 0xdcf2dc
  ],
  
  // Grid settings
  GRID_SIZE: 60,
  GRID_COLOR: 0x333333,
  BACKGROUND_COLOR: 0x111111,
  
  // UI settings
  LEADERBOARD_SIZE: 5
};

// Calculate radius from mass
export function massToRadius(mass: number): number {
  return Math.sqrt(mass) * 4;
}

// Calculate speed from mass (caps at 1500 mass - no slower after that)
export function massToSpeed(mass: number): number {
  // Cap mass at 1500 for speed calculation
  const effectiveMass = Math.min(mass, 1500);
  const ratio = effectiveMass / GAME_CONFIG.STARTING_MASS;
  const speed = GAME_CONFIG.BASE_SPEED / (1 + Math.log(ratio) * 0.15);
  return Math.max(speed, GAME_CONFIG.MIN_SPEED);
}

// Get split fly distance in body lengths based on total mass
export function getSplitDistance(totalMass: number): number {
  if (totalMass >= 1000) return 2;
  if (totalMass >= 500) return 3;
  return 4;
}

// Generate random position within world bounds
export function randomPosition(): { x: number; y: number } {
  return {
    x: Math.random() * GAME_CONFIG.WORLD_WIDTH,
    y: Math.random() * GAME_CONFIG.WORLD_HEIGHT
  };
}

// Generate random color from palette
export function randomCellColor(): number {
  return GAME_CONFIG.CELL_COLORS[Math.floor(Math.random() * GAME_CONFIG.CELL_COLORS.length)];
}

export function randomShieldColor(): number {
  return GAME_CONFIG.SHIELD_COLORS[Math.floor(Math.random() * GAME_CONFIG.SHIELD_COLORS.length)];
}

export function randomGrassColor(): number {
  return GAME_CONFIG.GRASS_COLORS[Math.floor(Math.random() * GAME_CONFIG.GRASS_COLORS.length)];
}

export function randomFoodColor(): number {
  return GAME_CONFIG.FOOD_COLORS[Math.floor(Math.random() * GAME_CONFIG.FOOD_COLORS.length)];
}

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
