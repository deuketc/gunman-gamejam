import { AnimatedSprite, Assets, Container, Rectangle, Texture } from "pixi.js";

const LIGHT_PATH = "/assets/door-02-static-light.png";
const LIGHT_FRAME_W = 106;
const LIGHT_FRAME_H = 108;

export class DoorLight {
  readonly container: Container;
  private sprite: AnimatedSprite;

  constructor(x: number, y: number) {
    this.container = new Container();

    const sheet = Assets.get<Texture>(LIGHT_PATH);
    const frames = [0, 1].map(
      (i) =>
        new Texture({
          source: sheet.source,
          frame: new Rectangle(i * LIGHT_FRAME_W, 0, LIGHT_FRAME_W, LIGHT_FRAME_H),
        }),
    );

    this.sprite = new AnimatedSprite(frames);
    this.sprite.anchor.set(0, 0);
    this.sprite.loop = false;
    this.sprite.currentFrame = 0; // frame 0 = locked

    this.container.addChild(this.sprite);
    this.container.position.set(x, y);
  }

  setUnlocked() {
    this.sprite.currentFrame = 1;
  }
}
