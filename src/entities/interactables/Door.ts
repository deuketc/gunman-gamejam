import { AnimatedSprite, Assets, Container, Rectangle, Texture } from "pixi.js";
import type { Rect } from "../Platform";
import { Sfx } from "../../audio/Sfx";

const DOOR_PATH = "/assets/door-01-ani-open.png";
const DOOR_FRAME_W = 81;
const DOOR_FRAME_H = 125;
const DOOR_FRAMES = 10;
const DOOR_ANIM_SPEED = 0.2;

export interface DoorConfig {
  path?: string;
  frameW?: number;
  frameH?: number;
  frameCount?: number;
  locked?: boolean; // starts locked — interact() is a no-op until unlocked is set to false
}

export class Door {
  readonly container: Container;
  opened = false;
  locked: boolean;
  onOpen?: () => void;
  private sprite: AnimatedSprite;

  constructor(x: number, y: number, config: DoorConfig = {}) {
    this.locked = config.locked ?? false;
    this.container = new Container();

    const path = config.path ?? DOOR_PATH;
    const frameW = config.frameW ?? DOOR_FRAME_W;
    const frameH = config.frameH ?? DOOR_FRAME_H;
    const frameCount = config.frameCount ?? DOOR_FRAMES;

    const sheet = Assets.get<Texture>(path);
    const frames = Array.from(
      { length: frameCount },
      (_, i) =>
        new Texture({
          source: sheet.source,
          frame: new Rectangle(i * frameW, 0, frameW, frameH),
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
    if (this.locked || this.opened || this.sprite.playing) return;
    this.sprite.currentFrame = 0;
    this.sprite.play();
    Sfx.play("opendoor");
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
