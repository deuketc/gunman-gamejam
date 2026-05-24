import { Container, Graphics } from 'pixi.js';

const BULLET_SPEED = 12;

export class Bullet {
  readonly container: Container;
  private vx: number;
  private vy: number;
  dead = false;

  constructor(x: number, y: number, angle: number) {
    this.vx = Math.cos(angle) * BULLET_SPEED;
    this.vy = Math.sin(angle) * BULLET_SPEED;

    this.container = new Container();
    const gfx = new Graphics();
    gfx.rect(-4, -1.5, 8, 3).fill(0xffcc00);
    gfx.rect(-2, -1, 4, 2).fill(0xffffff);
    this.container.addChild(gfx);
    this.container.rotation = angle;
    this.container.position.set(x, y);
  }

  update(screenW: number, screenH: number) {
    this.container.x += this.vx;
    this.container.y += this.vy;
    if (
      this.container.x < -20 || this.container.x > screenW + 20 ||
      this.container.y < -20 || this.container.y > screenH + 20
    ) {
      this.dead = true;
    }
  }
}
