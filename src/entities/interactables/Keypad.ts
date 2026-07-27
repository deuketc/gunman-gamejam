import { AnimatedSprite, Assets, Container, Rectangle, Texture } from "pixi.js";
import type { Rect } from "../Platform";
import { Sfx } from "../../audio/Sfx";

const LOCKED_PATH = "/assets/keypad_ani_locked.png";
const UNLOCKED_PATH = "/assets/keypad_ani_unlocked.png";
const FRAME_SIZE = 32;
const LOCKED_FRAME_COUNT = 12;
const ANIM_SPEED = 0.2;

export class Keypad {
  readonly container: Container;
  unlocked = false;
  onUnlock?: () => void;
  private sprite: AnimatedSprite;

  constructor(x: number, y: number) {
    this.container = new Container();

    const lockedSheet = Assets.get<Texture>(LOCKED_PATH);
    const lockedFrames = Array.from(
      { length: LOCKED_FRAME_COUNT },
      (_, i) =>
        new Texture({
          source: lockedSheet.source,
          frame: new Rectangle(i * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE),
        }),
    );

    this.sprite = new AnimatedSprite(lockedFrames);
    this.sprite.anchor.set(0, 0);
    this.sprite.animationSpeed = ANIM_SPEED;
    this.sprite.loop = true;
    this.sprite.play();

    this.container.addChild(this.sprite);
    this.container.position.set(x, y);
  }

  interact() {
    if (this.unlocked) return;
    this.unlocked = true;

    this.sprite.stop();
    this.sprite.textures = [Assets.get<Texture>(UNLOCKED_PATH)];
    this.sprite.currentFrame = 0;
    Sfx.play("door2-unlock");

    this.onUnlock?.();
  }

  hitbox(): Rect {
    return { x: this.container.x, y: this.container.y, w: FRAME_SIZE, h: FRAME_SIZE };
  }
}
