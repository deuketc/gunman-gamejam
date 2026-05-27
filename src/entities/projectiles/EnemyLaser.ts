import { Container, Graphics } from 'pixi.js';

export class EnemyLaser {
  readonly container: Container;
  dead = false;
  private vx: number;
  private vy: number;

  constructor(
    x: number,
    y: number,
    vx = -10,
    vy = 0,
    color = 0x0044cc,
    coreColor = 0x88ccff,
  ) {
    this.vx = vx;
    this.vy = vy;
    this.container = new Container();

    const gfx = new Graphics();
    // Outer glow
    gfx.rect(-14, -1.5, 28, 3).fill(color);
    // Bright core
    gfx.rect(-14, -0.5, 28, 1).fill(coreColor);

    this.container.addChild(gfx);
    this.container.position.set(x, y);
  }

  update(screenW: number, screenH: number) {
    this.container.x += this.vx;
    this.container.y += this.vy;
    if (
      this.container.x < -40 || this.container.x > screenW + 40 ||
      this.container.y < -20 || this.container.y > screenH + 20
    ) {
      this.dead = true;
    }
  }
}
