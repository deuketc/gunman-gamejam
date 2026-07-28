import { AnimatedSprite, Assets, Container, Rectangle, Texture } from "pixi.js";

const MEDAL_PATH = "/assets/medal_static_icon.png";
const MEDAL_FRAME_SIZE = 32;

export class Medal {
  readonly container: Container;
  private sprite: AnimatedSprite;
  private collected = false;

  constructor(x: number, y: number) {
    this.container = new Container();

    const sheet = Assets.get<Texture>(MEDAL_PATH);
    const frames = [0, 1].map(
      (i) =>
        new Texture({
          source: sheet.source,
          frame: new Rectangle(i * MEDAL_FRAME_SIZE, 0, MEDAL_FRAME_SIZE, MEDAL_FRAME_SIZE),
        }),
    );

    this.sprite = new AnimatedSprite(frames);
    this.sprite.anchor.set(0, 1);
    this.sprite.loop = false;
    this.sprite.currentFrame = 0; // frame 0 = not collected

    this.container.addChild(this.sprite);
    this.container.position.set(x, y);
  }

  award() {
    if (this.collected) return;
    this.collected = true;
    this.sprite.currentFrame = 1;
  }
}
