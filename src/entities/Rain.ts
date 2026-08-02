import { Graphics } from "pixi.js";

// Ambient background rain — a fixed pool of streaks recycled top-to-bottom.
// Purely decorative, drawn as thin lines on a single Graphics object rather
// than individual sprites since only ~DROP_COUNT are ever on screen at once.
const DROP_COUNT = 10;
const SPAWN_BAND_RATIO = 0.3; // drops originate in the top 30% of the screen
const COLOR = 0xd8ecff;
const ALPHA = 0.45;

interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
}

export class Rain {
  readonly container: Graphics;
  private drops: Drop[] = [];
  private screenW: number;
  private bottomY: number;
  private bandH: number;

  constructor(screenW: number, screenH: number) {
    this.screenW = screenW;
    this.bottomY = screenH;
    this.bandH = screenH * SPAWN_BAND_RATIO;
    this.container = new Graphics();

    for (let i = 0; i < DROP_COUNT; i++) {
      this.drops.push(this.spawnDrop(true));
    }
  }

  private spawnDrop(scatterFull: boolean): Drop {
    return {
      x: Math.random() * this.screenW,
      y: scatterFull ? Math.random() * this.bottomY : Math.random() * this.bandH,
      vx: -1 - Math.random(),
      vy: 6 + Math.random() * 4,
      length: 4 + Math.random() * 3,
    };
  }

  update(dt: number) {
    this.container.clear();
    for (const drop of this.drops) {
      drop.x += drop.vx * dt;
      drop.y += drop.vy * dt;

      if (drop.y > this.bottomY || drop.x < -10) {
        Object.assign(drop, this.spawnDrop(false));
      }

      this.container
        .moveTo(drop.x, drop.y)
        .lineTo(drop.x - drop.vx * 1.5, drop.y - drop.length)
        .stroke({ width: 1, color: COLOR, alpha: ALPHA });
    }
  }
}
