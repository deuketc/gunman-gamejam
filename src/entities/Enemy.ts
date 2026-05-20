import { Container, Graphics } from 'pixi.js';

export class Enemy {
  readonly container: Container;
  readonly speed: number;
  dead = false;

  static readonly W = 44;
  static readonly H = 32;

  constructor(x: number, y: number) {
    this.speed = 1.5 + Math.random() * 2.5;
    this.container = new Container();

    const gfx = new Graphics();
    // Body
    gfx.rect(-22, -16, 44, 32).fill(0xcc3333);
    // Cockpit
    gfx.rect(-6, -9, 16, 18).fill(0xff6666);
    // Cannon (pointing left, since enemy moves left)
    gfx.rect(-30, -3, 10, 6).fill(0x882222);
    // Wing accents
    gfx.rect(-18, -22, 10, 7).fill(0xff4444);
    gfx.rect(-18, 15, 10, 7).fill(0xff4444);

    this.container.addChild(gfx);
    this.container.position.set(x, y);
  }

  update() {
    this.container.x -= this.speed;
    if (this.container.x < -60) this.dead = true;
  }

  getBounds() {
    return {
      x: this.container.x - 22,
      y: this.container.y - 16,
      width: Enemy.W,
      height: Enemy.H,
    };
  }
}
