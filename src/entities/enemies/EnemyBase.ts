import { Container } from 'pixi.js';
import type { Rect } from '../Platform';

export type { Rect };

export interface PendingShot {
  x: number;
  y: number;
}

export interface EnemyBase {
  readonly container: Container;
  dead: boolean;
  hit(): void;
  hitbox(): Rect;
  detectionZone(): Rect;
  update(playerX: number, playerMoving: boolean): void;
  takePendingShots(): PendingShot[];
}
