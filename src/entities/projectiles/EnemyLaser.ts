import { Container, Graphics } from 'pixi.js';

const SPEED = 10;

export class EnemyLaser {
  readonly container: Container;
  dead = false;

  constructor(x: number, y: number) {
    this.container = new Container();

    const gfx = new Graphics();
    // Outer glow
    gfx.rect(-14, -1.5, 28, 3).fill(0x0044cc);
    // Bright core
    gfx.rect(-14, -0.5, 28, 1).fill(0x88ccff);

    this.container.addChild(gfx);
    this.container.position.set(x, y);
  }

  update(screenW: number, screenH: number) {
    this.container.x -= SPEED;
    if (
      this.container.x < -40 || this.container.x > screenW + 40 ||
      this.container.y < -20 || this.container.y > screenH + 20
    ) {
      this.dead = true;
    }
  }
}
