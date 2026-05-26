import { Container } from 'pixi.js';
import type { Rect } from '../Platform';

export type { Rect };

export interface PendingShot {
  x: number;
  y: number;
  vx: number; // horizontal velocity — negative = left, positive = right
}

export interface EnemyBase {
  readonly container: Container;
  dead: boolean;
  hit(): void;
  hitbox(): Rect;
  detectionZone(): Rect;
  update(playerX: number, playerY: number, playerMoving: boolean): void;
  takePendingShots(): PendingShot[];
}
