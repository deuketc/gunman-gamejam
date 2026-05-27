import { AnimatedSprite, Assets, Container, Rectangle, Texture } from "pixi.js";
import type { EnemyBase, PendingShot, Rect } from "./EnemyBase";

type DroneState = "fly-left" | "fly-right" | "dying";

const FLY_PATH   = "/assets/drone-ani-flying-left.png";
const DEATH_PATH = "/assets/drone-ani-explodes-left.png";

const FRAME_W        = 64;
const FRAME_H        = 64;
const FLY_FRAMES     = 12;
const DEATH_FRAMES   = 9;
const FLY_SPEED      = 0.5;     // px per frame
const PATROL_DIST    = 200;     // px each side from origin
const DETECT_RADIUS  = 110;     // px radius around drone
const SHOOT_INTERVAL = 300;     // 5 s at 60 fps
const SHOOT_FIRST    = 60;      // 1 s delay before first shot on detection
const LASER_SPEED    = 8;       // px per frame
const ANIM_SPEED     = 0.2;

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

export class EnemyDrone implements EnemyBase {
  readonly container: Container;
  dead = false;
  readonly removeOnDeath = true; // removed from scene once death animation finishes

  private sprite: AnimatedSprite;
  private state: DroneState = "fly-left";
  private flyTextures: Texture[];
  private deathTextures: Texture[];
  private pendingShots: PendingShot[] = [];

  private originX: number;
  private facingLeft = true;
  private shootTimer = SHOOT_FIRST;

  constructor(x: number, y: number) {
    this.container = new Container();
    this.originX = x;

    const flySheet   = Assets.get<Texture>(FLY_PATH);
    const deathSheet = Assets.get<Texture>(DEATH_PATH);

    this.flyTextures   = cropFrames(flySheet,   0, FLY_FRAMES,   FRAME_W, FRAME_H);
    this.deathTextures = cropFrames(deathSheet, 0, DEATH_FRAMES, FRAME_W, FRAME_H);

    this.sprite = new AnimatedSprite(this.flyTextures);
    this.sprite.anchor.set(0.5, 0.5); // centred — drone is airborne, not ground-anchored
    this.sprite.animationSpeed = ANIM_SPEED;
    this.sprite.loop = true;
    this.sprite.play();

    this.sprite.onComplete = () => {
      if (this.state === "dying") this.dead = true;
    };

    this.container.addChild(this.sprite);
    this.container.position.set(x, y);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private applyFacing() {
    this.sprite.scale.x = this.facingLeft ? 1 : -1;
  }

  private setState(next: DroneState) {
    this.state = next;
    this.sprite.stop();

    if (next === "fly-left" || next === "fly-right") {
      this.facingLeft = next === "fly-left";
      this.applyFacing();
      this.sprite.textures = this.flyTextures;
      this.sprite.animationSpeed = ANIM_SPEED;
      this.sprite.loop = true;
      this.sprite.currentFrame = 0;
      this.sprite.play();
    } else if (next === "dying") {
      this.sprite.scale.x = 1;
      this.sprite.textures = this.deathTextures;
      this.sprite.animationSpeed = ANIM_SPEED;
      this.sprite.loop = false;
      this.sprite.currentFrame = 0;
      this.sprite.play();
    }
  }

  // ─── EnemyBase interface ──────────────────────────────────────────────────

  hit() {
    if (this.state === "dying") return;
    this.setState("dying");
  }

  hitbox(): Rect {
    return {
      x: this.container.x - FRAME_W / 2 + 8,
      y: this.container.y - FRAME_H / 2 + 8,
      w: FRAME_W - 16,
      h: FRAME_H - 16,
    };
  }

  // Returns bounding square of detection circle for debug overlay
  detectionZone(): Rect {
    return {
      x: this.container.x - DETECT_RADIUS,
      y: this.container.y - DETECT_RADIUS,
      w: DETECT_RADIUS * 2,
      h: DETECT_RADIUS * 2,
    };
  }

  update(playerX: number, playerY: number, _playerMoving: boolean) {
    if (this.state === "dying") return;

    // Radius-based detection
    const dx = playerX - this.container.x;
    const dy = playerY - this.container.y;
    const detected = Math.sqrt(dx * dx + dy * dy) <= DETECT_RADIUS;

    if (detected) {
      // Face the player
      this.facingLeft = playerX < this.container.x;
      this.applyFacing();

      // Shoot timer — only counts down while player is in range
      this.shootTimer--;
      if (this.shootTimer <= 0) {
        this.shootTimer = SHOOT_INTERVAL;
        const angle = Math.atan2(dy, dx);
        this.pendingShots.push({
          x:         this.container.x,
          y:         this.container.y,
          vx:        Math.cos(angle) * LASER_SPEED,
          vy:        Math.sin(angle) * LASER_SPEED,
          color:     0x00cc44,  // green glow
          coreColor: 0x88ffaa,  // light green core
        });
      }
    }

    // Patrol — continues regardless of detection
    if (this.state === "fly-left") {
      this.container.x -= FLY_SPEED;
      if (this.container.x <= this.originX - PATROL_DIST) {
        this.container.x = this.originX - PATROL_DIST;
        this.setState("fly-right");
      }
    } else if (this.state === "fly-right") {
      this.container.x += FLY_SPEED;
      if (this.container.x >= this.originX) {
        this.container.x = this.originX;
        this.setState("fly-left");
      }
    }
  }

  takePendingShots(): PendingShot[] {
    const out = this.pendingShots.slice();
    this.pendingShots = [];
    return out;
  }
}
