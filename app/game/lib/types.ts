export interface CellData {
  id: string;
  x: number;
  y: number;
  mass: number;
  color: number;
  name: string;
}

export interface FoodData {
  id: string;
  x: number;
  y: number;
  mass: number;
  color: number;
}

export enum BotState {
  WANDER = 'WANDER',
  HUNT = 'HUNT',
  FLEE = 'FLEE',
  EAT = 'EAT'
}

export interface LeaderboardEntry {
  name: string;
  mass: number;
  isPlayer: boolean;
}
