import { Container, Graphics } from "pixi.js";
import type { Platform, Rect } from "../Platform";

const GRAVITY = 0.3;
const THROW_VX = 8;
const THROW_VY = -2;
const BLAST_RADIUS = 60;
const FUSE_TICKS = 120; // 2 seconds at 60 fps

export class GrenadeProjectile {
  readonly container: Container;
  dead = false;
  exploded = false;

  private vx: number;
  private vy: number;
  private landed = false;
  private fuseTimer = 0;

  constructor(x: number, y: number, facingLeft: boolean) {
    this.container = new Container();
    this.vx = facingLeft ? -THROW_VX : THROW_VX;
    this.vy = THROW_VY;

    // Simple circle stand-in until a grenade sprite is ready
    const gfx = new Graphics();
    gfx.circle(0, 0, 3).fill({ color: 0x888800 });
    this.container.addChild(gfx);
    this.container.position.set(x, y);
  }

  update(groundY: number, platforms: Platform[]) {
    if (this.dead) return;

    // Fuse countdown after landing
    if (this.landed) {
      this.fuseTimer--;
      if (this.fuseTimer <= 0) {
        this.exploded = true;
        this.dead = true;
      }
      return;
    }

    this.vy += GRAVITY;
    this.container.x += this.vx;
    this.container.y += this.vy;

    // Ground
    if (this.container.y >= groundY) {
      this.container.y = groundY;
      this._land();
      return;
    }

    // Platform surfaces
    for (const p of platforms) {
      if (
        this.container.x >= p.x &&
        this.container.x <= p.x + p.w &&
        this.container.y >= p.y &&
        this.container.y - this.vy < p.y
      ) {
        this.container.y = p.y;
        this._land();
        return;
      }
    }
  }

  private _land() {
    this.landed = true;
    this.fuseTimer = FUSE_TICKS;
    this.vx = 0;
    this.vy = 0;
  }

  // Small contact rect while in flight — null once landed
  hitbox(): Rect | null {
    if (this.landed) return null;
    return { x: this.container.x - 4, y: this.container.y - 4, w: 8, h: 8 };
  }

  // Immediate detonation — used on direct enemy contact
  detonateNow() {
    this.exploded = true;
    this.dead = true;
  }

  blastRadius(): number {
    return BLAST_RADIUS;
  }
}
