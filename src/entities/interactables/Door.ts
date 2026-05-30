import { AnimatedSprite, Assets, Container, Rectangle, Texture } from "pixi.js";
import type { Rect } from "../Platform";

const DOOR_PATH = "/assets/door-ground-ani-open-.png";
const DOOR_FRAME_W = 64;
const DOOR_FRAME_H = 128;
const DOOR_FRAMES = 11;
const DOOR_ANIM_SPEED = 0.2;

export class Door {
  readonly container: Container;
  opened = false;
  onOpen?: () => void;
  private sprite: AnimatedSprite;

  constructor(x: number, y: number) {
    this.container = new Container();

    const sheet = Assets.get<Texture>(DOOR_PATH);
    const frames = Array.from(
      { length: DOOR_FRAMES },
      (_, i) =>
        new Texture({
          source: sheet.source,
          frame: new Rectangle(i * DOOR_FRAME_W, 0, DOOR_FRAME_W, DOOR_FRAME_H),
        }),
    );

    this.sprite = new AnimatedSprite(frames);
    this.sprite.anchor.set(0, 0);
    this.sprite.animationSpeed = DOOR_ANIM_SPEED;
    this.sprite.loop = false;
    this.sprite.currentFrame = 0;

    this.sprite.onComplete = () => {
      this.opened = true;
      this.onOpen?.();
    };

    this.container.addChild(this.sprite);
    this.container.position.set(x, y);
  }

  interact() {
    if (this.opened || this.sprite.playing) return;
    this.sprite.currentFrame = 0;
    this.sprite.play();
  }

  interactionZone(): Rect {
    return {
      x: this.container.x + 14,
      y: this.container.y + 38,
      w: 35,
      h: 67,
    };
  }
}
