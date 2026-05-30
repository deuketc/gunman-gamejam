import { AnimatedSprite, Assets, Container } from "pixi.js";
import type { Spritesheet } from "pixi.js";
import type { Rect } from "./Platform";

const ATLAS_URL        = "https://pixijs.com/assets/spritesheet/mc.json";
const EXPLOSION_SCALE  = 1.2;
const EXPLOSION_SPEED  = 0.6;
const BLAST_RADIUS     = 60;

export class Explosion {
  readonly container: Container;
  dead = false;

  constructor(x: number, y: number) {
    this.container = new Container();

    const sheet = Assets.get<Spritesheet>(ATLAS_URL);
    const frames = Object.keys(sheet.textures)
      .sort((a, b) => {
        const na = parseInt(a.match(/\d+/)?.[0] ?? "0");
        const nb = parseInt(b.match(/\d+/)?.[0] ?? "0");
        return na - nb;
      })
      .map((k) => sheet.textures[k]);

    const sprite = new AnimatedSprite(frames);
    sprite.anchor.set(0.5, 0.5);
    sprite.scale.set(EXPLOSION_SCALE);
    sprite.animationSpeed = EXPLOSION_SPEED;
    sprite.loop = false;
    sprite.onComplete = () => { this.dead = true; };
    sprite.play();

    this.container.addChild(sprite);
    this.container.position.set(x, y);
  }

  hitbox(): Rect {
    return {
      x: this.container.x - BLAST_RADIUS,
      y: this.container.y - BLAST_RADIUS,
      w: BLAST_RADIUS * 2,
      h: BLAST_RADIUS * 2,
    };
  }
}
