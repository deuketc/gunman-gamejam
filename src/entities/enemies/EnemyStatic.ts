import { AnimatedSprite, Assets, Container, Rectangle, Texture } from "pixi.js";
import type { EnemyBase, PendingShot, Rect } from "./EnemyBase";

type EnemyState =
  | "walk-left"
  | "walk-right"
  | "idle"
  | "alert"
  | "shoot"
  | "dying"
  | "grenade-dying"
  | "stumble"
  | "stumble-2"
  | "stumble-super";

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

  // Idle-specific overrides (optional — falls back to frameW/frameH if omitted)
  idleFrameW?: number;
  idleFrameH?: number;
  idleFacingRight?: boolean;

  // Walk-specific overrides (optional — falls back to frameW/frameH if omitted)
  walkFrameW?: number;
  walkFrameH?: number;
  walkFacingRight?: boolean;

  // Raise/shoot-specific overrides (optional — falls back to frameW/frameH if omitted)
  raiseFrameW?: number;
  raiseFrameH?: number;
  raiseFacingRight?: boolean;

  // Frame counts
  idleFrameCount: number;
  walkFrameCount: number;
  alertFrameCount: number; // raise-gun section (0-indexed start = 0)
  shootFrameStart: number; // 0-indexed first frame of shoot loop on raise sheet
  shootFrameCount: number;
  deathFrameCount: number;

  // Hit points before death (default 1)
  hitPoints?: number;

  // Stumble animation on non-lethal hit — optional
  stumblePath?: string;
  stumbleFrameCount?: number;
  stumbleFrameW?: number;
  stumbleFrameH?: number;
  stumbleFacingRight?: boolean;

  // Second stumble (combo hit while stumble-1 is playing) — optional
  stumble2Path?: string;
  stumble2FrameCount?: number;
  stumble2FrameW?: number;
  stumble2FrameH?: number;
  stumble2FacingRight?: boolean;

  // Super stumble (combo hit while stumble-2 is playing) — optional
  stumbleSuperPath?: string;
  stumbleSuperFrameCount?: number;
  stumbleSuperFrameW?: number;
  stumbleSuperFrameH?: number;
  stumbleSuperFacingRight?: boolean;

  // Death sprite Y offset — optional, defaults to 32
  deathYOffset?: number;

  // Grenade death — optional, falls back to regular death if omitted
  grenadePath?: string;
  grenadeFrameW?: number;
  grenadeFrameH?: number;
  grenadeFrameCount?: number;

  // Laser colours — optional, fall back to default blue
  laserColor?: number;
  laserCoreColor?: number;

  // Behaviour — all optional, fall back to defaults below
  stationary?: boolean; // never walks — stays idle until player detected
  startWalkRight?: boolean; // start walking right instead of left (default false)
  shootFireFrame?: number; // which frame of the shoot loop spawns the laser (default 1)
  shootDelay?: number; // extra ticks to pause between shoot loops (default 0 = continuous)
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
  idlePath: "/assets/tvman-ani-idle.png",
  walkPath: "/assets/tvman-ani-walk.png",
  raisePath: "/assets/tvman-ani-shoot.png",
  deathPath: "/assets/enemy-ani-stand-facing-idle-death-from-bullet.png",
  frameW: 128,
  frameH: 128,
  deathFrameW: 128,
  deathFrameH: 128,
  idleFrameW: 128,
  idleFrameH: 128,
  idleFacingRight: true,
  idleFrameCount: 16,
  walkFrameW: 128,
  walkFrameH: 128,
  walkFacingRight: true,
  walkFrameCount: 12,
  raiseFrameW: 128,
  raiseFrameH: 128,
  raiseFacingRight: true,
  alertFrameCount: 10, // frames 0–9: raise gun
  shootFrameStart: 10, // frame 10: first shoot frame
  shootFrameCount: 6, // frames 10–15
  deathFrameCount: 11,
  barrelOffsetY: -100,
  shootDelay: 60,
  hitPoints: 3,
  laserColor: 0xcc0000,
  laserCoreColor: 0xff8888,
  stumblePath: "/assets/soldier-ani-shot-stumble.png",
  stumbleFrameCount: 11,
  stumbleFrameW: 128,
  stumbleFrameH: 128,
  stumbleFacingRight: true,
  stumble2Path: "/assets/soldier-ani-shot-stumble-02.png",
  stumble2FrameCount: 11,
  stumble2FrameW: 128,
  stumble2FrameH: 128,
  stumble2FacingRight: true,
  stumbleSuperPath: "/assets/soldier-ani-shot-stumble-03.png",
  stumbleSuperFrameCount: 8,
  stumbleSuperFrameW: 128,
  stumbleSuperFrameH: 128,
  stumbleSuperFacingRight: true,
  grenadePath: "/assets/enemy-ani-stand-facing-granade-explotion.png",
  grenadeFrameW: 128,
  grenadeFrameH: 120,
  grenadeFrameCount: 13,
};

export const ENEMY_V2: EnemyStaticConfig = {
  idlePath: "/assets/hood-ani-idle.png",
  walkPath: "/assets/hood-ani-walk.png",
  raisePath: "/assets/hood-ani-shoot.png",
  deathPath: "/assets/hood-ani-death.png",
  frameW: 128,
  frameH: 128,
  deathFrameW: 128,
  deathFrameH: 128,
  idleFrameW: 128,
  idleFrameH: 128,
  idleFacingRight: true,
  walkFrameW: 128,
  walkFrameH: 128,
  walkFacingRight: true,
  raiseFrameW: 128,
  raiseFrameH: 128,
  raiseFacingRight: true,
  idleFrameCount: 17,
  walkFrameCount: 13,
  alertFrameCount: 5, // frames 0–4: raise gun
  shootFrameStart: 5, // frame 5: first shoot frame
  shootFrameCount: 5, // frames 5–9
  deathFrameCount: 17,
  barrelOffsetY: -95,
  shootFireFrame: 0, // fire on first frame of shoot loop
  startWalkRight: true,
  patrolDistance: 100, // shorter than default (200) to stay on platform
  idleTicks: 600, // 10 s (default 5 s + 5 s extra)
  shootDelay: 90,
  hitPoints: 2,
  deathYOffset: 0,
  stumblePath: "/assets/hood-ani-stumble.png",
  stumbleFrameCount: 9,
  stumbleFrameW: 128,
  stumbleFrameH: 128,
  stumbleFacingRight: true,
  laserColor: 0xcc0000,
  laserCoreColor: 0xff8888,
};

export const ENEMY_V3: EnemyStaticConfig = {
  idlePath: "/assets/ninja-ani-idle-long.png",
  walkPath: "/assets/ninja-ani-walk.png",
  raisePath: "/assets/ninja-ani-attack.png",
  deathPath: "/assets/ninja-ani-death.png",
  frameW: 128,
  frameH: 128,
  deathFrameW: 128,
  deathFrameH: 128,
  idleFrameW: 128,
  idleFrameH: 128,
  idleFacingRight: true,
  walkFrameW: 128,
  walkFrameH: 128,
  walkFacingRight: true,
  raiseFrameW: 128,
  raiseFrameH: 256,
  raiseFacingRight: true,
  idleFrameCount: 70,
  walkFrameCount: 14,
  alertFrameCount: 5, // frames 0–4: wind-up
  shootFrameStart: 5, // frame 5: attack
  shootFrameCount: 7, // frames 5–11
  shootFireFrame: 0,
  deathFrameCount: 17,
  deathYOffset: 0,
  barrelOffsetY: -80,
  stationary: true,
  walkAnimSpeed: 0,
  patrolDistance: 100,
  idleTicks: 420,
  hitPoints: 2,
  alertDistance: 400,
};

// ─── Behaviour defaults ───────────────────────────────────────────────────────

const DEFAULT_WALK_SPEED = 0.5;
const DEFAULT_PATROL_DISTANCE = 200;
const DEFAULT_IDLE_TICKS = 300; // 5 s at 60 fps
const DEFAULT_ALERT_DISTANCE = 200;
const DEFAULT_LASER_SPEED = 10;
const DEFAULT_BARREL_OFFSET_X = 24;
const DEFAULT_BARREL_OFFSET_Y = -42;
const DEFAULT_ANIM_SPEED = 0.15;
const DEFAULT_WALK_ANIM_SPEED = 0.2;
const STUMBLE_HIT_COOLDOWN = 2; // ticks to block same-frame pellets from chaining

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
    stumble: Texture[] | null;
    stumble2: Texture[] | null;
    stumbleSuper: Texture[] | null;
  };
  private health: number;
  private enraged = false;
  private pendingShots: PendingShot[] = [];
  private stumbleExitTime = 0; // Date.now() timestamp when combo window closes

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
  private deathYOffset: number;
  private stationary: boolean;
  private shootFireFrame: number;
  private shootDelay: number;
  private shootDelayTimer = 0;
  private stumbleCooldown = 0; // prevents same-shot pellets from chaining the combo
  private lastSeenPlayerX = 0;
  private idleFacingRight: boolean;
  private walkFacingRight: boolean;
  private raiseFacingRight: boolean;
  private stumbleFacingRight: boolean;
  private stumble2FacingRight: boolean;
  private stumbleSuperFacingRight: boolean;

  constructor(x: number, y: number, config: EnemyStaticConfig) {
    this.container = new Container();
    this.originX = x;

    // Resolve behaviour with defaults
    this.walkSpeed = config.walkSpeed ?? DEFAULT_WALK_SPEED;
    this.patrolDistance = config.patrolDistance ?? DEFAULT_PATROL_DISTANCE;
    this.idleTicks = config.idleTicks ?? DEFAULT_IDLE_TICKS;
    this.alertDistance = config.alertDistance ?? DEFAULT_ALERT_DISTANCE;
    this.laserSpeed = config.laserSpeed ?? DEFAULT_LASER_SPEED;
    this.barrelOffsetX = config.barrelOffsetX ?? DEFAULT_BARREL_OFFSET_X;
    this.barrelOffsetY = config.barrelOffsetY ?? DEFAULT_BARREL_OFFSET_Y;
    this.deathYOffset = config.deathYOffset ?? 32;
    this.stationary = config.stationary ?? false;
    this.animSpeed = config.animSpeed ?? DEFAULT_ANIM_SPEED;
    this.walkAnimSpeed = config.walkAnimSpeed ?? DEFAULT_WALK_ANIM_SPEED;
    this.frameW = config.frameW;
    this.frameH = config.frameH;
    this.laserColor = config.laserColor;
    this.laserCoreColor = config.laserCoreColor;
    this.shootFireFrame = config.shootFireFrame ?? 1;
    this.shootDelay = config.shootDelay ?? 0;
    this.idleFacingRight = config.idleFacingRight ?? false;
    this.walkFacingRight = config.walkFacingRight ?? false;
    this.raiseFacingRight = config.raiseFacingRight ?? false;
    this.stumbleFacingRight = config.stumbleFacingRight ?? false;
    this.stumble2FacingRight = config.stumble2FacingRight ?? false;
    this.stumbleSuperFacingRight = config.stumbleSuperFacingRight ?? false;

    const idleSheet = Assets.get<Texture>(config.idlePath);
    const walkSheet = Assets.get<Texture>(config.walkPath);
    const raiseSheet = Assets.get<Texture>(config.raisePath);
    const deathSheet = Assets.get<Texture>(config.deathPath);
    const grenadeSheet = config.grenadePath
      ? Assets.get<Texture>(config.grenadePath)
      : null;
    const stumbleSheet = config.stumblePath
      ? Assets.get<Texture>(config.stumblePath)
      : null;
    const stumble2Sheet = config.stumble2Path
      ? Assets.get<Texture>(config.stumble2Path)
      : null;
    const stumbleSuperSheet = config.stumbleSuperPath
      ? Assets.get<Texture>(config.stumbleSuperPath)
      : null;

    this.textures = {
      idle: cropFrames(
        idleSheet,
        0,
        config.idleFrameCount,
        config.idleFrameW ?? config.frameW,
        config.idleFrameH ?? config.frameH,
      ),
      walk: cropFrames(
        walkSheet,
        0,
        config.walkFrameCount,
        config.walkFrameW ?? config.frameW,
        config.walkFrameH ?? config.frameH,
      ),
      alert: cropFrames(
        raiseSheet,
        0,
        config.alertFrameCount,
        config.raiseFrameW ?? config.frameW,
        config.raiseFrameH ?? config.frameH,
      ),
      shoot: cropFrames(
        raiseSheet,
        config.shootFrameStart,
        config.shootFrameCount,
        config.raiseFrameW ?? config.frameW,
        config.raiseFrameH ?? config.frameH,
      ),
      dying: cropFrames(
        deathSheet,
        0,
        config.deathFrameCount,
        config.deathFrameW,
        config.deathFrameH,
      ),
      grenadeDying: grenadeSheet
        ? cropFrames(
            grenadeSheet,
            0,
            config.grenadeFrameCount!,
            config.grenadeFrameW!,
            config.grenadeFrameH!,
          )
        : null,
      stumble: stumbleSheet
        ? cropFrames(
            stumbleSheet,
            0,
            config.stumbleFrameCount ?? 4,
            config.stumbleFrameW ?? config.frameW,
            config.stumbleFrameH ?? config.frameH,
          )
        : null,
      stumble2: stumble2Sheet
        ? cropFrames(
            stumble2Sheet,
            0,
            config.stumble2FrameCount ?? 4,
            config.stumble2FrameW ?? config.frameW,
            config.stumble2FrameH ?? config.frameH,
          )
        : null,
      stumbleSuper: stumbleSuperSheet
        ? cropFrames(
            stumbleSuperSheet,
            0,
            config.stumbleSuperFrameCount ?? 4,
            config.stumbleSuperFrameW ?? config.frameW,
            config.stumbleSuperFrameH ?? config.frameH,
          )
        : null,
    };

    this.health = config.hitPoints ?? 1;

    this.state = this.stationary
      ? "idle"
      : config.startWalkRight
        ? "walk-right"
        : "walk-left";
    this.facingLeft = !config.startWalkRight;
    this.patrolGoingLeft = !config.startWalkRight;

    const initTextures = this.stationary
      ? this.textures.idle
      : this.textures.walk;
    const initFacingRight = this.stationary
      ? this.idleFacingRight
      : this.walkFacingRight;
    const initAnimSpeed = this.stationary ? this.animSpeed : this.walkAnimSpeed;
    this.sprite = new AnimatedSprite(initTextures);
    this.sprite.anchor.set(0.5, 1);
    this.sprite.scale.x = initFacingRight
      ? this.facingLeft
        ? -1
        : 1
      : this.facingLeft
        ? 1
        : -1;
    this.sprite.animationSpeed = initAnimSpeed;
    this.sprite.loop = true;
    this.sprite.play();

    // Fire a laser on the configured shoot frame
    this.sprite.onFrameChange = (frame: number) => {
      if (this.state === "shoot" && frame === this.shootFireFrame) {
        this.pendingShots.push({
          x:
            this.container.x +
            (this.facingLeft ? -this.barrelOffsetX : this.barrelOffsetX),
          y: this.container.y + this.barrelOffsetY,
          vx: this.facingLeft ? -this.laserSpeed : this.laserSpeed,
          color: this.laserColor,
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
      } else if (this.state === "stumble-super") {
        this.sprite.stop(); // freeze on last frame
        this.dead = true;
      }
    };

    this.container.addChild(this.sprite);
    this.container.position.set(x, y);
  }

  private setState(next: EnemyState) {
    this.stumbleExitTime = 0;
    this.state = next;
    this.sprite.stop();
    this.sprite.position.set(0, 0);

    switch (next) {
      case "walk-left":
        this.facingLeft = true;
        this.patrolGoingLeft = true;
        this.sprite.scale.x = this.walkFacingRight ? -1 : 1;
        this.sprite.textures = this.textures.walk;
        this.sprite.animationSpeed = this.walkAnimSpeed;
        this.sprite.loop = true;
        this.sprite.currentFrame = 0;
        this.sprite.play();
        break;

      case "walk-right":
        this.facingLeft = false;
        this.patrolGoingLeft = false;
        this.sprite.scale.x = this.walkFacingRight ? 1 : -1;
        this.sprite.textures = this.textures.walk;
        this.sprite.animationSpeed = this.walkAnimSpeed;
        this.sprite.loop = true;
        this.sprite.currentFrame = 0;
        this.sprite.play();
        break;

      case "idle":
        this.sprite.scale.x = this.idleFacingRight
          ? this.facingLeft
            ? -1
            : 1
          : this.facingLeft
            ? 1
            : -1;
        this.sprite.textures = this.textures.idle;
        this.sprite.animationSpeed = this.animSpeed;
        this.sprite.loop = true;
        this.sprite.currentFrame = 0;
        this.sprite.play();
        this.idleTimer = this.idleTicks;
        break;

      case "alert":
        this.sprite.scale.x = this.raiseFacingRight
          ? this.facingLeft
            ? -1
            : 1
          : this.facingLeft
            ? 1
            : -1;
        this.sprite.textures = this.textures.alert;
        this.sprite.animationSpeed = this.animSpeed;
        this.sprite.loop = false;
        this.sprite.currentFrame = 0;
        this.sprite.play();
        break;

      case "shoot":
        this.sprite.scale.x = this.raiseFacingRight
          ? this.facingLeft
            ? -1
            : 1
          : this.facingLeft
            ? 1
            : -1;
        this.sprite.textures = this.textures.shoot;
        this.sprite.animationSpeed = this.animSpeed;
        this.sprite.loop = this.shootDelay <= 0; // play-once when delay is set
        this.sprite.currentFrame = 0;
        this.sprite.play();
        break;

      case "stumble":
        this.sprite.scale.x = this.stumbleFacingRight
          ? this.facingLeft
            ? -1
            : 1
          : this.facingLeft
            ? 1
            : -1;
        this.sprite.textures = this.textures.stumble!;
        this.sprite.animationSpeed = this.animSpeed;
        this.sprite.loop = false;
        this.sprite.currentFrame = 0;
        this.sprite.play();
        this.stumbleExitTime =
          Date.now() +
          (this.textures.stumble!.length / this.animSpeed / 60) * 1000;
        break;

      case "stumble-2":
        this.sprite.scale.x = this.stumble2FacingRight
          ? this.facingLeft
            ? -1
            : 1
          : this.facingLeft
            ? 1
            : -1;
        this.sprite.textures = this.textures.stumble2!;
        this.sprite.animationSpeed = this.animSpeed;
        this.sprite.loop = false;
        this.sprite.currentFrame = 0;
        this.sprite.play();
        this.stumbleExitTime =
          Date.now() +
          (this.textures.stumble2!.length / this.animSpeed / 60) * 1000;
        break;

      case "stumble-super":
        this.sprite.scale.x = this.stumbleSuperFacingRight
          ? this.facingLeft
            ? -1
            : 1
          : this.facingLeft
            ? 1
            : -1;
        this.sprite.textures = this.textures.stumbleSuper!;
        this.sprite.animationSpeed = this.animSpeed;
        this.sprite.loop = false;
        this.sprite.currentFrame = 0;
        this.sprite.play();
        break;

      case "dying":
        this.sprite.scale.x = 1;
        this.sprite.position.set(0, this.deathYOffset);
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
    if (this.enraged) {
      this.setState("alert");
      return;
    }
    if (this.stationary) {
      this.setState("idle");
      return;
    }
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
    console.log(
      `hit() state=${this.state} cooldown=${this.stumbleCooldown} hp=${this.health}`,
    );
    if (this.state === "dying" || this.state === "grenade-dying") return;
    if (this.state === "stumble-super") return;
    if (this.stumbleCooldown > 0) return;

    // Shot in the back while patrolling/idle — spin around and go berserk
    const isPassive =
      this.state === "walk-left" ||
      this.state === "walk-right" ||
      this.state === "idle";
    const backTurned =
      (this.facingLeft && this.lastSeenPlayerX > this.container.x) ||
      (!this.facingLeft && this.lastSeenPlayerX < this.container.x);
    if (isPassive && !this.enraged && backTurned) {
      this.facingLeft = !this.facingLeft;
      this.health--;
      this.enraged = true;
      if (this.health <= 0) {
        this.setState("dying");
      } else if (this.textures.stumble) {
        this.stumbleCooldown = STUMBLE_HIT_COOLDOWN;
        this.setState("stumble");
      } else {
        this.setState("alert");
      }
      return;
    }
    // Combo chain — each escalation costs HP
    if (this.state === "stumble-2") {
      this.health--;
      this.enraged = true;
      if (this.textures.stumbleSuper) {
        this.stumbleCooldown = STUMBLE_HIT_COOLDOWN;
        console.log("3 - super hit");
        this.setState("stumble-super");
      } else if (this.health <= 0) {
        this.setState("dying");
      }
      return;
    }
    if (this.state === "stumble") {
      this.health--;
      this.enraged = true;
      if (this.health <= 0) {
        this.setState("dying");
      } else if (this.textures.stumble2) {
        this.stumbleCooldown = STUMBLE_HIT_COOLDOWN;
        console.log("2 - stumble 2");
        this.setState("stumble-2");
      }
      return;
    }
    this.health--;
    this.enraged = true;
    if (this.health <= 0) {
      this.setState("dying");
    } else if (this.textures.stumble) {
      this.stumbleCooldown = STUMBLE_HIT_COOLDOWN;
      console.log("1 - stumble");
      this.setState("stumble");
    }
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

  hitboxColor(): number {
    switch (this.state) {
      case "walk-left":
      case "walk-right":
        return 0x00ff88; // green — patrolling
      case "idle":
        return 0xffff00; // yellow — idle
      case "alert":
        return 0xff8800; // orange — raising gun
      case "shoot":
        return 0xff0000; // red — firing
      case "stumble":
        return 0x00aaff; // blue — hit 1
      case "stumble-2":
        return 0xaa00ff; // purple — hit 2
      case "stumble-super":
        return 0xff00ff; // magenta — super hit
      case "dying":
      case "grenade-dying":
        return 0x444444; // grey — dead
    }
  }

  detectionZone(): Rect {
    if (this.enraged) {
      return { x: -2000, y: -2000, w: 4000, h: 4000 };
    }
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
    this.lastSeenPlayerX = playerX;
    if (this.stumbleCooldown > 0) this.stumbleCooldown--;
    if (this.stumbleExitTime > 0 && Date.now() >= this.stumbleExitTime) {
      this.stumbleExitTime = 0;
      this.resumePatrol();
    }
    if (
      this.state === "dying" ||
      this.state === "grenade-dying" ||
      this.state === "stumble" ||
      this.state === "stumble-2" ||
      this.state === "stumble-super"
    )
      return;

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
        if (!this.stationary) {
          this.idleTimer--;
          if (this.idleTimer <= 0) {
            this.setState(this.facingLeft ? "walk-right" : "walk-left");
          }
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
