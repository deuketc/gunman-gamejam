import { Container } from 'pixi.js';
import type { Rect } from '../Platform';

export type { Rect };

export interface PendingShot {
  x: number;
  y: number;
  vx: number;           // horizontal velocity — negative = left, positive = right
  vy?: number;          // vertical velocity for directional shots (default 0)
  color?: number;       // outer glow colour (default blue)
  coreColor?: number;   // bright core colour (default light blue)
}

export interface EnemyBase {
  readonly container: Container;
  dead: boolean;
  readonly removeOnDeath?: boolean; // if true, GameScene removes container when dead
  hit(): void;
  hitByExplosion?(): void;
  hitbox(): Rect;
  detectionZone(): Rect;
  update(playerX: number, playerY: number, playerMoving: boolean): void;
  takePendingShots(): PendingShot[];
}
