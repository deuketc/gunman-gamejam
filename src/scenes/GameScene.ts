import { Application, Container, Graphics } from 'pixi.js';
import { Player } from '../entities/Player';
import { Bullet } from '../entities/Bullet';

export class GameScene {
  readonly container: Container;
  private player: Player;
  private bullets: Bullet[] = [];
  private screenW: number;
  private screenH: number;

  constructor(app: Application) {
    this.screenW = app.screen.width;
    this.screenH = app.screen.height;
    const groundY = this.screenH - 80;
    this.container = new Container();

    const ground = new Graphics();
    ground.moveTo(0, groundY).lineTo(this.screenW, groundY).stroke({ color: 0xffffff, width: 2 });
    this.container.addChild(ground);

    this.player = new Player(this.screenW / 2, groundY, this.screenW, groundY);
    this.container.addChild(this.player.container);
  }

  update(dt: number) {
    this.player.update(dt);

    for (const b of this.player.takePendingBullets()) {
      const bullet = new Bullet(b.x, b.y, b.angle);
      this.bullets.push(bullet);
      this.container.addChild(bullet.container);
    }

    for (const b of this.bullets) b.update(this.screenW, this.screenH);

    this.bullets = this.bullets.filter((b) => {
      if (b.dead) { this.container.removeChild(b.container); return false; }
      return true;
    });
  }
}
