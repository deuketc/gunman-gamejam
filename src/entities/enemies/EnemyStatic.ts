import { AnimatedSprite, Assets, Container, Rectangle, Texture } from "pixi.js";
import type { EnemyBase, PendingShot, Rect } from "./EnemyBase";

type EnemyStaticState = "idle" | "alert" | "shoot" | "dying";

const IDLE_PATH = "/assets/enemy-ani-stand-facing-idle.png";
const RAISE_PATH = "/assets/enemy-ani-stand-facing-raise-gun.png";
const DEATH_PATH = "/assets/enemy-ani-stand-facing-idle-death-from-bullet.png";

const FRAME_W = 64;
const FRAME_H = 64;
const DEATH_FRAME_W = 128;
const DEATH_FRAME_H = 128;
const DEATH_FRAME_COUNT = 16;
const IDLE_FRAME_COUNT = 13;
const ALERT_FRAME_START = 0;
const ALERT_FRAME_COUNT = 9; // frames 1–9
const SHOOT_FRAME_START = 9; // frames 10–16
const SHOOT_FRAME_COUNT = 7;
const ALERT_DISTANCE = 250;
const ANIM_SPEED = 0.15;
const SHOOT_PAUSE_TICKS = 120; // 2 s at 60 fps
const BARREL_OFFSET_X = -58;
const BARREL_OFFSET_Y = -42;

function cropFrames(
  sheet: Texture,
  start: number,
  count: number,
  fw: number,
  fh: number,
): Texture[] {
  return Array.from(
    { length: count },
    (_, i) =>
      new Texture({
        source: sheet.source,
        frame: new Rectangle((start + i) * fw, 0, fw, fh),
      }),
  );
}

export class EnemyStatic implements EnemyBase {
  readonly container: Container;
  dead = false;
  private sprite: AnimatedSprite;
  private state: EnemyStaticState = "idle";
  private textures: Record<EnemyStaticState, Texture[]>;
  private shootPauseTimer = 0;
  private pendingShots: PendingShot[] = [];

  constructor(x: number, y: number) {
    this.container = new Container();

    const idleSheet = Assets.get<Texture>(IDLE_PATH);
    const raiseSheet = Assets.get<Texture>(RAISE_PATH);
    const deathSheet = Assets.get<Texture>(DEATH_PATH);

    this.textures = {
      idle: cropFrames(idleSheet, 0, IDLE_FRAME_COUNT, FRAME_W, FRAME_H),
      alert: cropFrames(
        raiseSheet,
        ALERT_FRAME_START,
        ALERT_FRAME_COUNT,
        FRAME_W,
        FRAME_H,
      ),
      shoot: cropFrames(
        raiseSheet,
        SHOOT_FRAME_START,
        SHOOT_FRAME_COUNT,
        FRAME_W,
        FRAME_H,
      ),
      dying: cropFrames(
        deathSheet,
        0,
        DEATH_FRAME_COUNT,
        DEATH_FRAME_W,
        DEATH_FRAME_H,
      ),
    };

    this.sprite = new AnimatedSprite(this.textures.idle);
    this.sprite.anchor.set(1, 1);
    this.sprite.animationSpeed = ANIM_SPEED;
    this.sprite.loop = true;
    this.sprite.play();

    this.sprite.onFrameChange = (frame: number) => {
      if (this.state === "shoot" && frame === 1) {
        this.pendingShots.push({
          x: this.container.x + BARREL_OFFSET_X,
          y: this.container.y + BARREL_OFFSET_Y,
        });
      }
    };

    this.sprite.onComplete = () => {
      if (this.state === "alert") {
        this.sprite.stop();
      } else if (this.state === "shoot") {
        this.sprite.stop();
        this.shootPauseTimer = SHOOT_PAUSE_TICKS;
      } else if (this.state === "dying") {
        this.dead = true;
      }
    };

    this.container.addChild(this.sprite);
    this.container.position.set(x, y);
  }

  hit() {
    if (this.state === "dying") return;
    this.shootPauseTimer = 0;
    this.state = "dying";
    this.sprite.textures = this.textures.dying;
    this.sprite.anchor.set(0.5, 1);
    this.sprite.position.set(-(FRAME_W / 2), 32);
    this.sprite.loop = false;
    this.sprite.currentFrame = 0;
    this.sprite.play();
  }

  private setState(next: EnemyStaticState) {
    if (this.state === next) return;
    this.state = next;
    this.sprite.textures = this.textures[next];
    this.sprite.currentFrame = 0;

    if (next === "idle") {
      this.sprite.loop = true;
      this.sprite.play();
    } else {
      this.sprite.loop = false;
      this.sprite.play();
    }
  }

  hitbox(): Rect {
    return {
      x: this.container.x - FRAME_W + 10,
      y: this.container.y - FRAME_H,
      w: FRAME_W - 20,
      h: FRAME_H,
    };
  }

  detectionZone(): Rect {
    return {
      x: this.container.x - FRAME_W - ALERT_DISTANCE,
      y: this.container.y - FRAME_H,
      w: ALERT_DISTANCE,
      h: FRAME_H,
    };
  }

  update(playerX: number, playerY: number, playerMoving: boolean) {
    if (this.state === "dying") return;

    const dz = this.detectionZone();
    const inRange =
      playerX >= dz.x && playerX <= dz.x + dz.w &&
      playerY >= dz.y && playerY <= dz.y + dz.h;

    if (this.shootPauseTimer > 0) {
      this.shootPauseTimer--;
      if (this.shootPauseTimer === 0) {
        this.sprite.currentFrame = 0;
        this.sprite.play();
      }
      return;
    }

    switch (this.state) {
      case "idle":
        if (inRange) this.setState("alert");
        break;
      case "alert":
        if (!inRange) {
          this.setState("idle");
        } else if (playerMoving) {
          this.setState("shoot");
        }
        break;
      case "shoot":
        if (!inRange) {
          this.shootPauseTimer = 0;
          this.setState("idle");
        }
        break;
    }
  }

  takePendingShots(): PendingShot[] {
    const out = this.pendingShots.slice();
    this.pendingShots = [];
    return out;
  }
}
