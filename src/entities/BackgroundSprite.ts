import { AnimatedSprite, Assets, Container, Rectangle, Texture } from "pixi.js";

export interface BackgroundSpriteConfig {
  path: string;
  frameW: number;
  frameH: number;
  frameCount: number;
  animSpeed?: number;
}

// Purely decorative — loops forever, no gameplay logic, no update() needed.
export class BackgroundSprite {
  readonly container: Container;

  constructor(x: number, y: number, config: BackgroundSpriteConfig) {
    this.container = new Container();

    const sheet = Assets.get<Texture>(config.path);
    const frames = Array.from(
      { length: config.frameCount },
      (_, i) =>
        new Texture({
          source: sheet.source,
          frame: new Rectangle(i * config.frameW, 0, config.frameW, config.frameH),
        }),
    );

    const sprite = new AnimatedSprite(frames);
    sprite.anchor.set(0, 0);
    sprite.animationSpeed = config.animSpeed ?? 0.15;
    sprite.loop = true;
    sprite.play();

    this.container.addChild(sprite);
    this.container.position.set(x, y);
  }
}
