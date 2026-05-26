import { AnimatedSprite, Assets, Container, Rectangle, Texture } from "pixi.js";
import type { EnemyBase, PendingShot, Rect } from "./EnemyBase";

type EnemyState =
  | "walk-left"
  | "walk-right"
  | "idle"
  | "alert"
  | "shoot"
  | "dying";

const IDLE_PATH = "/assets/enemy-ani-stand-facing-idle.png";
const WALK_PATH = "/assets/enemy-ani-walk-with-gun-left.png";
const RAISE_PATH = "/assets/enemy-ani-stand-facing-raise-gun.png";
const DEATH_PATH = "/assets/enemy-ani-stand-facing-idle-death-from-bullet.png";

const FRAME_W = 64;
const FRAME_H = 64;
const DEATH_FRAME_W = 128;
const DEATH_FRAME_H = 128;
const DEATH_FRAME_COUNT = 16;
const IDLE_FRAME_COUNT = 13;
const WALK_FRAME_COUNT = 14;
const ALERT_FRAME_COUNT = 9; // frames 0–8 of raise-gun sheet
const SHOOT_FRAME_START = 9; // frames 9–15 of raise-gun sheet
const SHOOT_FRAME_COUNT = 7;

const WALK_SPEED = 0.5; // px per frame
const PATROL_DISTANCE = 200; // px from origin
const IDLE_TICKS = 300; // 5 s at 60 fps
const ALERT_DISTANCE = 200; // detection range px
const LASER_SPEED = 10; // px per frame
const BARREL_OFFSET_X = 24; // px from sprite centre to barrel tip
const BARREL_OFFSET_Y = -42; // px up from ground anchor

const ANIM_SPEED = 0.15;
const WALK_ANIM_SPEED = 0.2;

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
  private state: EnemyState = "walk-left";
  private textures: {
    idle: Texture[];
    walk: Texture[];
    alert: Texture[];
    shoot: Texture[];
    dying: Texture[];
  };
  private pendingShots: PendingShot[] = [];

  private originX: number;
  private facingLeft = true; // true → scale.x 1 (sprite naturally faces left)
  private patrolGoingLeft = true; // patrol direction preserved through detection
  private idleTimer = 0;

  constructor(x: number, y: number) {
    this.container = new Container();
    this.originX = x;

    const idleSheet = Assets.get<Texture>(IDLE_PATH);
    const walkSheet = Assets.get<Texture>(WALK_PATH);
    const raiseSheet = Assets.get<Texture>(RAISE_PATH);
    const deathSheet = Assets.get<Texture>(DEATH_PATH);

    this.textures = {
      idle: cropFrames(idleSheet, 0, IDLE_FRAME_COUNT, FRAME_W, FRAME_H),
      walk: cropFrames(walkSheet, 0, WALK_FRAME_COUNT, FRAME_W, FRAME_H),
      alert: cropFrames(raiseSheet, 0, ALERT_FRAME_COUNT, FRAME_W, FRAME_H),
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

    this.sprite = new AnimatedSprite(this.textures.walk);
    this.sprite.anchor.set(0.5, 1);
    this.sprite.animationSpeed = WALK_ANIM_SPEED;
    this.sprite.loop = true;
    this.sprite.play();

    // Fire a laser on frame 1 of each shoot loop iteration
    this.sprite.onFrameChange = (frame: number) => {
      if (this.state === "shoot" && frame === 1) {
        this.pendingShots.push({
          x:
            this.container.x +
            (this.facingLeft ? -BARREL_OFFSET_X : BARREL_OFFSET_X),
          y: this.container.y + BARREL_OFFSET_Y,
          vx: this.facingLeft ? -LASER_SPEED : LASER_SPEED,
        });
      }
    };

    this.sprite.onComplete = () => {
      if (this.state === "alert") this.setState("shoot");
      else if (this.state === "dying") this.dead = true;
    };

    this.container.addChild(this.sprite);
    this.container.position.set(x, y);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private applyFacing() {
    this.sprite.scale.x = this.facingLeft ? 1 : -1;
  }

  private setState(next: EnemyState) {
    this.state = next;
    this.sprite.stop();
    this.sprite.position.set(0, 0);

    switch (next) {
      case "walk-left":
        this.facingLeft = true;
        this.patrolGoingLeft = true;
        this.applyFacing();
        this.sprite.textures = this.textures.walk;
        this.sprite.animationSpeed = WALK_ANIM_SPEED;
        this.sprite.loop = true;
        this.sprite.currentFrame = 0;
        this.sprite.play();
        break;

      case "walk-right":
        this.facingLeft = false;
        this.patrolGoingLeft = false;
        this.applyFacing();
        this.sprite.textures = this.textures.walk;
        this.sprite.animationSpeed = WALK_ANIM_SPEED;
        this.sprite.loop = true;
        this.sprite.currentFrame = 0;
        this.sprite.play();
        break;

      case "idle":
        this.applyFacing(); // keep whichever direction we arrived from
        this.sprite.textures = this.textures.idle;
        this.sprite.animationSpeed = ANIM_SPEED;
        this.sprite.loop = true;
        this.sprite.currentFrame = 0;
        this.sprite.play();
        this.idleTimer = IDLE_TICKS;
        break;

      case "alert":
        this.applyFacing();
        this.sprite.textures = this.textures.alert;
        this.sprite.animationSpeed = ANIM_SPEED;
        this.sprite.loop = false;
        this.sprite.currentFrame = 0;
        this.sprite.play();
        break;

      case "shoot":
        this.applyFacing();
        this.sprite.textures = this.textures.shoot;
        this.sprite.animationSpeed = ANIM_SPEED;
        this.sprite.loop = true;
        this.sprite.currentFrame = 0;
        this.sprite.play();
        break;

      case "dying":
        this.sprite.scale.x = 1; // reset flip for death
        this.sprite.position.set(0, 32);
        this.sprite.textures = this.textures.dying;
        this.sprite.animationSpeed = ANIM_SPEED;
        this.sprite.loop = false;
        this.sprite.currentFrame = 0;
        this.sprite.play();
        break;
    }
  }

  // Determine walk direction when resuming patrol after detection.
  // Uses position so resuming at a waypoint doesn't immediately re-trigger idle.
  private resumePatrol() {
    if (this.container.x <= this.originX - PATROL_DISTANCE) {
      this.setState("walk-right");
    } else if (this.container.x >= this.originX) {
      this.setState("walk-left");
    } else {
      this.setState(this.patrolGoingLeft ? "walk-left" : "walk-right");
    }
  }

  // ─── EnemyBase interface ────────────────────────────────────────────────────

  hit() {
    if (this.state === "dying") return;
    this.setState("dying");
  }

  hitbox(): Rect {
    return {
      x: this.container.x - FRAME_W / 2 + 8,
      y: this.container.y - FRAME_H,
      w: FRAME_W - 16,
      h: FRAME_H,
    };
  }

  // Detection zone always extends in front of the enemy
  detectionZone(): Rect {
    const x = this.container.x;
    const y = this.container.y;
    if (this.facingLeft) {
      return {
        x: x - FRAME_W / 2 - ALERT_DISTANCE,
        y: y - FRAME_H,
        w: ALERT_DISTANCE,
        h: FRAME_H,
      };
    }
    return {
      x: x + FRAME_W / 2,
      y: y - FRAME_H,
      w: ALERT_DISTANCE,
      h: FRAME_H,
    };
  }

  update(playerX: number, playerY: number, _playerMoving: boolean) {
    if (this.state === "dying") return;

    const dz = this.detectionZone();
    const detected =
      playerX >= dz.x &&
      playerX <= dz.x + dz.w &&
      playerY >= dz.y &&
      playerY <= dz.y + dz.h;

    // ─── ALERT / SHOOT: keep attacking while player is detected ──────────────
    if (this.state === "alert" || this.state === "shoot") {
      if (!detected) this.resumePatrol();
      return;
    }

    // ─── PLAYER SPOTTED: face them and raise gun ─────────────────────────────
    if (detected) {
      this.facingLeft = playerX < this.container.x;
      this.setState("alert");
      return;
    }

    // ─── PATROL ──────────────────────────────────────────────────────────────
    switch (this.state) {
      case "walk-left":
        this.container.x -= WALK_SPEED;
        if (this.container.x <= this.originX - PATROL_DISTANCE) {
          this.container.x = this.originX - PATROL_DISTANCE;
          this.setState("idle");
        }
        break;

      case "walk-right":
        this.container.x += WALK_SPEED;
        if (this.container.x >= this.originX) {
          this.container.x = this.originX;
          this.setState("idle");
        }
        break;

      case "idle":
        this.idleTimer--;
        if (this.idleTimer <= 0) {
          // Turn around — walk the opposite direction to the one we arrived from
          this.setState(this.facingLeft ? "walk-right" : "walk-left");
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
