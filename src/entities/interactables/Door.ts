import { AnimatedSprite, Assets, Container, Rectangle, Texture } from "pixi.js";
import type { Rect } from "../Platform";

const DOOR_PATH = "/assets/door-01-ani-open.png";
const DOOR_FRAME_W = 81;
const DOOR_FRAME_H = 125;
const DOOR_FRAMES = 10;
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
      x: this.container.x + 8,
      y: this.container.y + 0,
      w: 70,
      h: 150,
    };
  }
}
