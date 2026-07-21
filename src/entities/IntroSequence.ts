import { AnimatedSprite, Assets, Container, Graphics, Rectangle, Texture } from "pixi.js";
import { Sfx } from "../audio/Sfx";

const SPRINT_PATH = "/assets/player-ani-sprint.png";
const SPRINT_FRAME_W = 128; // adjust to match the actual spritesheet frame size
const SPRINT_FRAME_H = 128;
const SPRINT_FRAME_COUNT = 13;
const SPRINT_ANIM_SPEED = 0.35;
const SPRINT_SPEED = 4; // px per logic tick (fixed 120Hz sim rate — see Game.ts)

const ARROW_PATH = "/assets/arrow.png";
const ARROW_FRAME_SIZE = 64;
const ARROW_FRAME_COUNT = 21;
const ARROW_ANIM_SPEED = 0.2; // tweak so one playthrough is however long you want it on screen
const ARROW_INSET_X = 100; // px from the right edge
const ARROW_INSET_Y = 150; // px from the top edge
// Assumes the source art faces right by default (common convention) — this
// rotates it to point left, toward platform #1/the ladder. Tweak freely.
const ARROW_ROTATION = Math.PI;

const FADE_TICKS = 3 * 120; // 3s at the fixed 120Hz logic rate

type Phase = "fade" | "run" | "arrow" | "done";

function cropFrames(sheet: Texture, count: number, fw: number, fh: number): Texture[] {
  return Array.from(
    { length: count },
    (_, i) =>
      new Texture({ source: sheet.source, frame: new Rectangle(i * fw, 0, fw, fh) }),
  );
}

// Plays once at level start: fades the screen in from black, runs the player
// sprite in from off-screen to its spawn point, then shows a direction hint
// arrow. GameScene gates normal gameplay (player input, enemy updates, etc.)
// on `hasControl` until the run finishes.
export class IntroSequence {
  readonly container: Container;
  private phase: Phase = "fade";
  private timer = 0;
  private targetX: number;

  private fadeRect: Graphics;
  private sprintSprite: AnimatedSprite;
  private arrow: AnimatedSprite;

  private _hasControl = false;
  private arrowAnimDone = false;

  constructor(screenW: number, screenH: number, groundY: number, targetX: number) {
    this.container = new Container();
    this.targetX = targetX;

    this.fadeRect = new Graphics().rect(0, 0, screenW, screenH).fill(0x000000);
    this.container.addChild(this.fadeRect);

    const sprintSheet = Assets.get<Texture>(SPRINT_PATH);
    const sprintFrames = cropFrames(sprintSheet, SPRINT_FRAME_COUNT, SPRINT_FRAME_W, SPRINT_FRAME_H);
    this.sprintSprite = new AnimatedSprite(sprintFrames);
    this.sprintSprite.anchor.set(0.5, 1);
    this.sprintSprite.animationSpeed = SPRINT_ANIM_SPEED;
    this.sprintSprite.loop = true;
    this.sprintSprite.position.set(-SPRINT_FRAME_W, groundY);
    this.sprintSprite.play();
    this.container.addChild(this.sprintSprite);

    const arrowSheet = Assets.get<Texture>(ARROW_PATH);
    const arrowFrames = cropFrames(arrowSheet, ARROW_FRAME_COUNT, ARROW_FRAME_SIZE, ARROW_FRAME_SIZE);
    this.arrow = new AnimatedSprite(arrowFrames);
    this.arrow.anchor.set(0.5, 0.5);
    this.arrow.animationSpeed = ARROW_ANIM_SPEED;
    this.arrow.loop = false;
    this.arrow.position.set(screenW - ARROW_INSET_X, ARROW_INSET_Y);
    this.arrow.rotation = ARROW_ROTATION;
    this.arrow.visible = false;
    this.arrow.onComplete = () => {
      this.arrow.visible = false;
      Sfx.stopLoop("arrow");
      this.arrowAnimDone = true;
    };
    this.container.addChild(this.arrow);
  }

  get hasControl(): boolean {
    return this._hasControl;
  }

  get finished(): boolean {
    return this.phase === "done";
  }

  update(_dt: number) {
    this.timer++;

    if (this.phase === "fade") {
      const t = Math.min(1, this.timer / FADE_TICKS);
      this.fadeRect.alpha = 1 - t;
      if (t >= 1) {
        this.container.removeChild(this.fadeRect);
        this.phase = "run";
        this.timer = 0;
      }
      return;
    }

    if (this.phase === "run") {
      this.sprintSprite.x += SPRINT_SPEED;
      if (this.sprintSprite.x >= this.targetX) {
        this.container.removeChild(this.sprintSprite);
        this._hasControl = true;
        this.arrow.visible = true;
        this.arrow.play();
        Sfx.loop("arrow");
        this.phase = "arrow";
        this.timer = 0;
      }
      return;
    }

    if (this.phase === "arrow") {
      if (this.arrowAnimDone) {
        this.phase = "done";
      }
    }
  }
}
