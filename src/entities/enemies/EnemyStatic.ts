import { AnimatedSprite, Assets, Container, Rectangle, Texture } from "pixi.js";
import type { EnemyBase, PendingShot, Rect } from "./EnemyBase";

type EnemyState =
  | "walk-left"
  | "walk-right"
  | "idle"
  | "alert"
  | "shoot"
  | "dying"
  | "grenade-dying";

// ─── Config ──────────────────────────────────────────────────────────────────

export interface EnemyStaticConfig {
  // Asset paths
  idlePath: string;
  walkPath: string;
  raisePath: string; // single sheet: alert frames first, then shoot loop frames
  deathPath: string;

  // Standard frame size (walk / idle / alert / shoot)
  frameW: number;
  frameH: number;

  // Death frame size (often larger)
  deathFrameW: number;
  deathFrameH: number;

  // Frame counts
  idleFrameCount: number;
  walkFrameCount: number;
  alertFrameCount: number;  // raise-gun section (0-indexed start = 0)
  shootFrameStart: number;  // 0-indexed first frame of shoot loop on raise sheet
  shootFrameCount: number;
  deathFrameCount: number;

  // Grenade death — optional, falls back to regular death if omitted
  grenadePath?:       string;
  grenadeFrameW?:     number;
  grenadeFrameH?:     number;
  grenadeFrameCount?: number;

  // Laser colours — optional, fall back to default blue
  laserColor?: number;
  laserCoreColor?: number;

  // Behaviour — all optional, fall back to defaults below
  startWalkRight?: boolean; // start walking right instead of left (default false)
  shootFireFrame?: number;  // which frame of the shoot loop spawns the laser (default 1)
  shootDelay?: number;     // extra ticks to pause between shoot loops (default 0 = continuous)
  walkSpeed?: number;
  patrolDistance?: number;
  idleTicks?: number;
  alertDistance?: number;
  laserSpeed?: number;
  barrelOffsetX?: number;
  barrelOffsetY?: number;
  animSpeed?: number;
  walkAnimSpeed?: number;
}

// ─── Preset configs ───────────────────────────────────────────────────────────

export const ENEMY_V1: EnemyStaticConfig = {
  idlePath:  "/assets/enemy-ani-stand-facing-idle.png",
  walkPath:  "/assets/enemy-ani-walk-with-gun-left.png",
  raisePath: "/assets/enemy-ani-stand-facing-raise-gun.png",
  deathPath: "/assets/enemy-ani-stand-facing-idle-death-from-bullet.png",
  frameW: 64, frameH: 64,
  deathFrameW: 128, deathFrameH: 128,
  idleFrameCount:  13,
  walkFrameCount:  14,
  alertFrameCount: 7,  // frames 0–6: raise gun
  shootFrameStart: 7,  // frame 7: first shoot frame
  shootFrameCount: 3,  // frames 7–9
  deathFrameCount: 16,
  barrelOffsetY:      -47, // 5 px higher than default (-42)
  shootDelay:         60,  // ~1 s pause at frame 9 before shooting again
  grenadePath:        "/assets/enemy-ani-stand-facing-granade-explotion.png",
  grenadeFrameW:      128,
  grenadeFrameH:      120,
  grenadeFrameCount:  13,
};

export const ENEMY_V2: EnemyStaticConfig = {
  idlePath:  "/assets/enemy-ani-ver2-idle.png",
  walkPath:  "/assets/enemy-ani-ver2-walk.png",
  raisePath: "/assets/enemy-ani-ver2-shoot.png",
  deathPath: "/assets/enemy-ani-ver2-death.png",
  frameW: 64, frameH: 64,
  deathFrameW: 128, deathFrameH: 128,
  idleFrameCount:  12,
  walkFrameCount:  10,
  alertFrameCount: 7,  // frames 0–6 (1-indexed: 1–7)
  shootFrameStart: 7,  // frame 7  (1-indexed: 8)
  shootFrameCount: 4,  // frames 7–10 (1-indexed: 8–11)
  deathFrameCount: 13,
  barrelOffsetY:   -50, // 8 px higher than default (-42)
  shootFireFrame:  0,   // fire 1 frame earlier than default (1)
  startWalkRight:  true,
  patrolDistance:  100, // shorter than default (200) to stay on platform
  idleTicks:       600, // 10 s (default 5 s + 5 s extra)
  shootDelay:      90,  // ~1.5 s pause between shoot loops
  laserColor:      0xcc0000,
  laserCoreColor:  0xff8888,
};

// ─── Behaviour defaults ───────────────────────────────────────────────────────

const DEFAULT_WALK_SPEED      = 0.5;
const DEFAULT_PATROL_DISTANCE = 200;
const DEFAULT_IDLE_TICKS      = 300;   // 5 s at 60 fps
const DEFAULT_ALERT_DISTANCE  = 200;
const DEFAULT_LASER_SPEED     = 10;
const DEFAULT_BARREL_OFFSET_X = 24;
const DEFAULT_BARREL_OFFSET_Y = -42;
const DEFAULT_ANIM_SPEED      = 0.15;
const DEFAULT_WALK_ANIM_SPEED = 0.2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Class ────────────────────────────────────────────────────────────────────

export class EnemyStatic implements EnemyBase {
  readonly container: Container;
  dead = false;

  private sprite: AnimatedSprite;
  private state: EnemyState;
  private textures: {
    idle: Texture[];
    walk: Texture[];
    alert: Texture[];
    shoot: Texture[];
    dying: Texture[];
    grenadeDying: Texture[] | null;
  };
  private pendingShots: PendingShot[] = [];

  private originX: number;
  private facingLeft = true;
  private patrolGoingLeft = true;
  private idleTimer = 0;

  // Resolved behaviour values
  private walkSpeed: number;
  private patrolDistance: number;
  private idleTicks: number;
  private alertDistance: number;
  private laserSpeed: number;
  private barrelOffsetX: number;
  private barrelOffsetY: number;
  private animSpeed: number;
  private walkAnimSpeed: number;
  private frameW: number;
  private frameH: number;
  private laserColor: number | undefined;
  private laserCoreColor: number | undefined;
  private shootFireFrame: number;
  private shootDelay: number;
  private shootDelayTimer = 0;

  constructor(x: number, y: number, config: EnemyStaticConfig) {
    this.container = new Container();
    this.originX = x;

    // Resolve behaviour with defaults
    this.walkSpeed      = config.walkSpeed      ?? DEFAULT_WALK_SPEED;
    this.patrolDistance = config.patrolDistance ?? DEFAULT_PATROL_DISTANCE;
    this.idleTicks      = config.idleTicks      ?? DEFAULT_IDLE_TICKS;
    this.alertDistance  = config.alertDistance  ?? DEFAULT_ALERT_DISTANCE;
    this.laserSpeed     = config.laserSpeed     ?? DEFAULT_LASER_SPEED;
    this.barrelOffsetX  = config.barrelOffsetX  ?? DEFAULT_BARREL_OFFSET_X;
    this.barrelOffsetY  = config.barrelOffsetY  ?? DEFAULT_BARREL_OFFSET_Y;
    this.animSpeed      = config.animSpeed      ?? DEFAULT_ANIM_SPEED;
    this.walkAnimSpeed  = config.walkAnimSpeed  ?? DEFAULT_WALK_ANIM_SPEED;
    this.frameW         = config.frameW;
    this.frameH         = config.frameH;
    this.laserColor     = config.laserColor;
    this.laserCoreColor = config.laserCoreColor;
    this.shootFireFrame = config.shootFireFrame ?? 1;
    this.shootDelay     = config.shootDelay ?? 0;

    const idleSheet    = Assets.get<Texture>(config.idlePath);
    const walkSheet    = Assets.get<Texture>(config.walkPath);
    const raiseSheet   = Assets.get<Texture>(config.raisePath);
    const deathSheet   = Assets.get<Texture>(config.deathPath);
    const grenadeSheet = config.grenadePath ? Assets.get<Texture>(config.grenadePath) : null;

    this.textures = {
      idle:  cropFrames(idleSheet,  0,                      config.idleFrameCount,  config.frameW,      config.frameH),
      walk:  cropFrames(walkSheet,  0,                      config.walkFrameCount,  config.frameW,      config.frameH),
      alert: cropFrames(raiseSheet, 0,                      config.alertFrameCount, config.frameW,      config.frameH),
      shoot: cropFrames(raiseSheet, config.shootFrameStart, config.shootFrameCount, config.frameW,      config.frameH),
      dying: cropFrames(deathSheet, 0,                      config.deathFrameCount, config.deathFrameW, config.deathFrameH),
      grenadeDying: grenadeSheet
        ? cropFrames(grenadeSheet, 0, config.grenadeFrameCount!, config.grenadeFrameW!, config.grenadeFrameH!)
        : null,
    };

    this.state = config.startWalkRight ? "walk-right" : "walk-left";
    this.facingLeft = !config.startWalkRight;
    this.patrolGoingLeft = !config.startWalkRight;

    this.sprite = new AnimatedSprite(this.textures.walk);
    this.sprite.anchor.set(0.5, 1);
    this.sprite.scale.x = this.facingLeft ? 1 : -1;
    this.sprite.animationSpeed = this.walkAnimSpeed;
    this.sprite.loop = true;
    this.sprite.play();

    // Fire a laser on the configured shoot frame
    this.sprite.onFrameChange = (frame: number) => {
      if (this.state === "shoot" && frame === this.shootFireFrame) {
        this.pendingShots.push({
          x:  this.container.x + (this.facingLeft ? -this.barrelOffsetX : this.barrelOffsetX),
          y:  this.container.y + this.barrelOffsetY,
          vx:        this.facingLeft ? -this.laserSpeed : this.laserSpeed,
          color:     this.laserColor,
          coreColor: this.laserCoreColor,
        });
      }
      if (this.state === "grenade-dying" && frame === 12) {
        this.sprite.stop();
        this.dead = true;
      }
    };

    this.sprite.onComplete = () => {
      if (this.state === "alert") {
        this.setState("shoot");
      } else if (this.state === "shoot") {
        // Freeze at last frame (gun fired) and wait before shooting again
        if (this.shootDelay > 0) {
          this.shootDelayTimer = this.shootDelay;
        } else {
          this.sprite.currentFrame = 0;
          this.sprite.play();
        }
      } else if (this.state === "dying" || this.state === "grenade-dying") {
        this.dead = true;
      }
    };

    this.container.addChild(this.sprite);
    this.container.position.set(x, y);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

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
        this.sprite.animationSpeed = this.walkAnimSpeed;
        this.sprite.loop = true;
        this.sprite.currentFrame = 0;
        this.sprite.play();
        break;

      case "walk-right":
        this.facingLeft = false;
        this.patrolGoingLeft = false;
        this.applyFacing();
        this.sprite.textures = this.textures.walk;
        this.sprite.animationSpeed = this.walkAnimSpeed;
        this.sprite.loop = true;
        this.sprite.currentFrame = 0;
        this.sprite.play();
        break;

      case "idle":
        this.applyFacing();
        this.sprite.textures = this.textures.idle;
        this.sprite.animationSpeed = this.animSpeed;
        this.sprite.loop = true;
        this.sprite.currentFrame = 0;
        this.sprite.play();
        this.idleTimer = this.idleTicks;
        break;

      case "alert":
        this.applyFacing();
        this.sprite.textures = this.textures.alert;
        this.sprite.animationSpeed = this.animSpeed;
        this.sprite.loop = false;
        this.sprite.currentFrame = 0;
        this.sprite.play();
        break;

      case "shoot":
        this.applyFacing();
        this.sprite.textures = this.textures.shoot;
        this.sprite.animationSpeed = this.animSpeed;
        this.sprite.loop = this.shootDelay <= 0; // play-once when delay is set
        this.sprite.currentFrame = 0;
        this.sprite.play();
        break;

      case "dying":
        this.sprite.scale.x = 1;
        this.sprite.position.set(0, 32);
        this.sprite.textures = this.textures.dying;
        this.sprite.animationSpeed = this.animSpeed;
        this.sprite.loop = false;
        this.sprite.currentFrame = 0;
        this.sprite.play();
        break;

      case "grenade-dying":
        this.sprite.scale.x = 1;
        this.sprite.position.set(0, 40); // 128x120 frame — slightly more offset
        this.sprite.textures = this.textures.grenadeDying!;
        this.sprite.animationSpeed = this.animSpeed;
        this.sprite.loop = false;
        this.sprite.currentFrame = 0;
        this.sprite.play();
        break;
    }
  }

  private resumePatrol() {
    if (this.container.x <= this.originX - this.patrolDistance) {
      this.setState("walk-right");
    } else if (this.container.x >= this.originX) {
      this.setState("walk-left");
    } else {
      this.setState(this.patrolGoingLeft ? "walk-left" : "walk-right");
    }
  }

  // ─── EnemyBase interface ──────────────────────────────────────────────────

  hit() {
    if (this.state === "dying" || this.state === "grenade-dying") return;
    this.setState("dying");
  }

  hitByExplosion() {
    if (this.state === "dying" || this.state === "grenade-dying") return;
    if (this.textures.grenadeDying) {
      this.setState("grenade-dying");
    } else {
      this.setState("dying");
    }
  }

  hitbox(): Rect {
    return {
      x: this.container.x - this.frameW / 2 + 8,
      y: this.container.y - this.frameH,
      w: this.frameW - 16,
      h: this.frameH,
    };
  }

  detectionZone(): Rect {
    const x = this.container.x;
    const y = this.container.y;
    const nearEdge = this.frameW / 2 - 30;
    if (this.facingLeft) {
      return {
        x: x - nearEdge - this.alertDistance,
        y: y - this.frameH,
        w: this.alertDistance,
        h: this.frameH,
      };
    }
    return {
      x: x + nearEdge,
      y: y - this.frameH,
      w: this.alertDistance,
      h: this.frameH,
    };
  }

  update(playerX: number, playerY: number, _playerMoving: boolean) {
    if (this.state === "dying" || this.state === "grenade-dying") return;

    // Shoot delay countdown — resume animation once timer expires
    if (this.shootDelayTimer > 0) {
      this.shootDelayTimer--;
      if (this.shootDelayTimer === 0 && this.state === "shoot") {
        this.sprite.currentFrame = 0; // restart from frame 7 (index 0 of shoot textures)
        this.sprite.play();
      }
    }

    const dz = this.detectionZone();
    const detected =
      playerX >= dz.x &&
      playerX <= dz.x + dz.w &&
      playerY >= dz.y &&
      playerY <= dz.y + dz.h;

    if (this.state === "alert" || this.state === "shoot") {
      if (!detected) this.resumePatrol();
      return;
    }

    if (detected) {
      this.facingLeft = playerX < this.container.x;
      this.setState("alert");
      return;
    }

    switch (this.state) {
      case "walk-left":
        this.container.x -= this.walkSpeed;
        if (this.container.x <= this.originX - this.patrolDistance) {
          this.container.x = this.originX - this.patrolDistance;
          this.setState("idle");
        }
        break;

      case "walk-right":
        this.container.x += this.walkSpeed;
        if (this.container.x >= this.originX) {
          this.container.x = this.originX;
          this.setState("idle");
        }
        break;

      case "idle":
        this.idleTimer--;
        if (this.idleTimer <= 0) {
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
