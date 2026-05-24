import { AnimatedSprite, Assets, Container, Rectangle, Texture } from "pixi.js";
import { Input } from "../input/Input";
import type { Platform, Rect } from "./Platform";

type PlayerState =
  | "idle-left"
  | "idle-right"
  | "idle-front"
  | "walk-left"
  | "walk-right"
  | "jump-left"
  | "jump-right"
  | "shoot-cycle-left"
  | "shoot-cycle-right"
  | "shoot-ready-left"
  | "shoot-ready-right"
  | "shoot-lower-left"
  | "shoot-lower-right";

interface PendingBullet {
  x: number;
  y: number;
  angle: number;
}

const DEATH_PATH = "/assets/gunman-ani-stand-death-right.png";
const DEATH_FRAME_W = 128;
const DEATH_FRAME_H = 128;
const DEATH_FRAME_COUNT = 15;
const STAND_PATH = "/assets/gunman-stand-left-right.png";
const WALK_L_PATH = "/assets/gunman-ani-stand-shutgun-walk-left.png";
const WALK_R_PATH = "/assets/gunman-ani-stand-shutgun-walk-right.png";
const SHOOT_L_PATH = "/assets/gunman-ani-stand-shutgun-shoot-left.png";
const SHOOT_R_PATH = "/assets/gunman-ani-stand-shutgun-shoot-right.png";
const IDLE_FRONT_PATH = "/assets/gunman-ani-stand-shutgun-idle-front.png";
const IDLE_FRONT_FRAMES = 10;
const IDLE_TRIGGER_FRAMES = 300; // ~5 seconds at 60 fps
const IDLE_ANIM_SPEED = 0.1; // relaxed pace
const FRAME_W = 64;
const FRAME_H = 64;
const WALK_FRAMES = 9;
const SHOOT_CYCLE_FRAMES = 6; // frames 1–6  (0-indexed: 0–5)
const SHOOT_LOWER_FRAMES = 4; // frames 7–10 (0-indexed: 6–9)
const SHOOT_FIRE_FRAME = 3; // 0-indexed = frame 4 (1-indexed) — bullet spawns here
const MOVE_SPEED = 1;
const JUMP_SPEED_X = 2;
const JUMP_STRENGTH = 9;
const GRAVITY = 0.5;
const WALK_ANIM_SPEED = 0.18;
const SHOOT_ANIM_SPEED = 0.25;
const PRE_JUMP_FRAMES = 6;
const SHOOT_HOLD_FRAMES = 90; // idle frames before gun auto-lowers

function cropFrames(
  sheet: Texture,
  start: number,
  count: number,
  fw = FRAME_W,
  fh = FRAME_H,
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

export class Player {
  readonly container: Container;
  dead = false;
  private sprite: AnimatedSprite;
  private deathFrames: Texture[] = [];
  private textures: Record<PlayerState, Texture[]>;
  private state: PlayerState = "idle-right";
  private screenW: number;
  private groundY: number;
  private platforms: Platform[] = [];
  private velocityX = 0;
  private velocityY = 0;
  private isGrounded = true;
  private preJumpTimer = 0;
  private pendingJumpVX = 0;
  private pendingJumpState: "jump-left" | "jump-right" = "jump-right";
  private shootWasDown = false;
  private shootHoldTimer = 0;
  private pendingBullets: PendingBullet[] = [];
  private idleTimer = 0;
  private lastFacingLeft = false;

  constructor(x: number, y: number, screenW: number, groundY: number) {
    this.screenW = screenW;
    this.groundY = groundY;
    this.container = new Container();

    const deathSheet = Assets.get<Texture>(DEATH_PATH);
    this.deathFrames = cropFrames(
      deathSheet,
      0,
      DEATH_FRAME_COUNT,
      DEATH_FRAME_W,
      DEATH_FRAME_H,
    );

    const stand = Assets.get<Texture>(STAND_PATH);
    const wL = Assets.get<Texture>(WALK_L_PATH);
    const wR = Assets.get<Texture>(WALK_R_PATH);
    const sL = Assets.get<Texture>(SHOOT_L_PATH);
    const sR = Assets.get<Texture>(SHOOT_R_PATH);
    const idleF = Assets.get<Texture>(IDLE_FRONT_PATH);

    const standR = new Texture({
      source: stand.source,
      frame: new Rectangle(0, 0, FRAME_W, FRAME_H),
    });
    const standL = new Texture({
      source: stand.source,
      frame: new Rectangle(FRAME_W, 0, FRAME_W, FRAME_H),
    });
    // Ready frame = frame 0 of the shoot sheet (gun fully raised, waiting to fire)
    const readyR = new Texture({
      source: sR.source,
      frame: new Rectangle(0, 0, FRAME_W, FRAME_H),
    });
    const readyL = new Texture({
      source: sL.source,
      frame: new Rectangle(0, 0, FRAME_W, FRAME_H),
    });

    this.textures = {
      "idle-right": [standR],
      "idle-left": [standL],
      "idle-front": cropFrames(idleF, 0, IDLE_FRONT_FRAMES),
      "walk-right": cropFrames(wR, 0, WALK_FRAMES),
      "walk-left": cropFrames(wL, 0, WALK_FRAMES),
      "jump-right": [standR],
      "jump-left": [standL],
      "shoot-cycle-right": cropFrames(sR, 0, SHOOT_CYCLE_FRAMES),
      "shoot-cycle-left": cropFrames(sL, 0, SHOOT_CYCLE_FRAMES),
      "shoot-ready-right": [readyR],
      "shoot-ready-left": [readyL],
      "shoot-lower-right": cropFrames(
        sR,
        SHOOT_CYCLE_FRAMES,
        SHOOT_LOWER_FRAMES,
      ),
      "shoot-lower-left": cropFrames(
        sL,
        SHOOT_CYCLE_FRAMES,
        SHOOT_LOWER_FRAMES,
      ),
    };

    this.sprite = new AnimatedSprite(this.textures["idle-front"]);
    this.sprite.anchor.set(0.5, 1);
    this.sprite.animationSpeed = IDLE_ANIM_SPEED;
    this.sprite.loop = true;
    this.sprite.play();
    this.state = "idle-front";

    // Bullet spawns when the shot frame is reached in the cycle
    this.sprite.onFrameChange = (frame: number) => {
      if (
        frame === SHOOT_FIRE_FRAME &&
        (this.state === "shoot-cycle-left" ||
          this.state === "shoot-cycle-right")
      ) {
        this.spawnPellets();
      }
    };

    // Drive state transitions when non-looping animations finish
    this.sprite.onComplete = () => {
      switch (this.state) {
        case "shoot-cycle-left":
          this.shootHoldTimer = SHOOT_HOLD_FRAMES;
          this.setState("shoot-ready-left");
          break;
        case "shoot-cycle-right":
          this.shootHoldTimer = SHOOT_HOLD_FRAMES;
          this.setState("shoot-ready-right");
          break;
        case "shoot-lower-left":
          this.setState("idle-left");
          break;
        case "shoot-lower-right":
          this.setState("idle-right");
          break;
      }
    };

    this.container.addChild(this.sprite);
    this.container.position.set(x, y);
  }

  private setState(next: PlayerState) {
    if (this.state === next) return;
    this.state = next;
    this.sprite.stop();
    this.sprite.textures = this.textures[next];

    if (
      next === "walk-left" ||
      next === "walk-right" ||
      next === "idle-front"
    ) {
      this.sprite.animationSpeed =
        next === "idle-front" ? IDLE_ANIM_SPEED : WALK_ANIM_SPEED;
      this.sprite.loop = true;
      this.sprite.currentFrame = 0;
      this.sprite.play();
    } else if (
      next === "shoot-cycle-left" ||
      next === "shoot-cycle-right" ||
      next === "shoot-lower-left" ||
      next === "shoot-lower-right"
    ) {
      this.sprite.animationSpeed = SHOOT_ANIM_SPEED;
      this.sprite.loop = false;
      this.sprite.currentFrame = 0;
      this.sprite.play();
    }
    // idle, jump, shoot-ready: stopped at frame 0
  }

  hit() {
    if (this.dead) return;
    this.dead = true;
    this.velocityX = 0;
    this.velocityY = 0;
    this.sprite.onComplete = undefined;
    this.sprite.textures = this.deathFrames;
    this.sprite.position.set(0, 32); // shift down so centred frame sits at ground level
    this.sprite.loop = false;
    this.sprite.currentFrame = 0;
    this.sprite.play();
  }

  hurtbox(): Rect {
    const cx = this.container.x;
    const cy = this.container.y;
    if (!this.isGrounded) {
      return { x: cx - 10, y: cy - 52, w: 20, h: 52 };
    }
    return { x: cx - 12, y: cy - 58, w: 24, h: 58 };
  }

  setPlatforms(platforms: Platform[]) {
    this.platforms = platforms;
  }

  // Returns the highest floor surface at x that is at or below fromY.
  // One-way: only counts surfaces the player is above, so they can jump up through.
  private effectiveFloor(x: number, fromY: number): number {
    let floor = this.groundY;
    for (const p of this.platforms) {
      if (x >= p.x && x <= p.x + p.w && p.y >= fromY && p.y < floor) {
        floor = p.y;
      }
    }
    return floor;
  }

  private facingLeft(): boolean {
    if (this.state === "idle-front") return this.lastFacingLeft;
    return this.state.endsWith("-left");
  }

  private spawnPellets() {
    const left = this.facingLeft();
    const base = left ? Math.PI : 0;
    const barrelX = this.container.x + (left ? -18 : 15);
    const barrelY = this.container.y - 49;
    this.pendingBullets.push({ x: barrelX, y: barrelY, angle: base });
  }

  takePendingBullets(): PendingBullet[] {
    const out = this.pendingBullets.slice();
    this.pendingBullets = [];
    return out;
  }

  update(_dt: number) {
    if (this.dead) return;
    const left = Input.isAnyDown("ArrowLeft", "KeyA");
    const right = Input.isAnyDown("ArrowRight", "KeyD");
    const jump = Input.isAnyDown("Space", "ArrowUp", "KeyW");
    const shootDown = Input.isAnyDown("ControlLeft", "ControlRight");
    const shootJust = shootDown && !this.shootWasDown;
    this.shootWasDown = shootDown;

    // --- AIRBORNE ---
    if (!this.isGrounded) {
      this.velocityY += GRAVITY;
      this.container.x = Math.max(
        FRAME_W / 2,
        Math.min(this.screenW - FRAME_W / 2, this.container.x + this.velocityX),
      );
      const prevY = this.container.y;
      this.container.y += this.velocityY;
      const floor = this.effectiveFloor(this.container.x, prevY);
      if (this.container.y >= floor) {
        this.container.y = floor;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isGrounded = true;
        this.setState(this.facingLeft() ? "idle-left" : "idle-right");
      }
      return;
    }

    // --- JUMP STARTUP ---
    if (this.preJumpTimer > 0) {
      this.preJumpTimer--;
      if (this.preJumpTimer === 0) {
        this.isGrounded = false;
        this.velocityY = -JUMP_STRENGTH;
        this.velocityX = this.pendingJumpVX;
        this.setState(this.pendingJumpState);
      }
      return;
    }

    // --- IDLE FRONT: any input exits back to last facing direction ---
    if (this.state === "idle-front") {
      if (!left && !right && !jump && !shootJust) return;
      this.idleTimer = 0;
      this.setState(this.lastFacingLeft ? "idle-left" : "idle-right");
      // fall through so the input is handled this frame
    }

    // --- SHOOT CYCLE / LOWER: locked until animation completes ---
    if (
      this.state === "shoot-cycle-left" ||
      this.state === "shoot-cycle-right" ||
      this.state === "shoot-lower-left" ||
      this.state === "shoot-lower-right"
    ) {
      return;
    }

    // --- SHOOT READY: gun raised, waiting ---
    if (
      this.state === "shoot-ready-left" ||
      this.state === "shoot-ready-right"
    ) {
      const isLeft = this.state === "shoot-ready-left";

      if (shootJust) {
        // Replay the cycle from the top
        this.setState(isLeft ? "shoot-cycle-left" : "shoot-cycle-right");
        return;
      }

      this.shootHoldTimer--;
      if (this.shootHoldTimer <= 0) {
        // Timed out — play the put-away animation
        this.setState(isLeft ? "shoot-lower-left" : "shoot-lower-right");
        return;
      }

      if (!left && !right && !jump) return;
      // Movement key pressed — drop the gun immediately and fall through
      this.setState(isLeft ? "idle-left" : "idle-right");
    }

    // --- GROUNDED: jump, new shot, or walk ---
    if (jump) {
      if (left && !right) {
        this.pendingJumpVX = -JUMP_SPEED_X;
        this.pendingJumpState = "jump-left";
        this.setState("idle-left");
      } else if (right && !left) {
        this.pendingJumpVX = JUMP_SPEED_X;
        this.pendingJumpState = "jump-right";
        this.setState("idle-right");
      } else {
        this.pendingJumpVX = 0;
        this.pendingJumpState = this.facingLeft() ? "jump-left" : "jump-right";
      }
      this.preJumpTimer = PRE_JUMP_FRAMES;
      return;
    }

    if (shootJust) {
      this.setState(
        this.facingLeft() ? "shoot-cycle-left" : "shoot-cycle-right",
      );
      return;
    }

    if (left && !right) {
      this.idleTimer = 0;
      this.setState("walk-left");
      this.container.x = Math.max(FRAME_W / 2, this.container.x - MOVE_SPEED);
    } else if (right && !left) {
      this.idleTimer = 0;
      this.setState("walk-right");
      this.container.x = Math.min(
        this.screenW - FRAME_W / 2,
        this.container.x + MOVE_SPEED,
      );
    } else {
      this.idleTimer++;
      if (this.idleTimer >= IDLE_TRIGGER_FRAMES) {
        this.lastFacingLeft = this.facingLeft();
        this.setState("idle-front");
      } else {
        this.setState(this.facingLeft() ? "idle-left" : "idle-right");
      }
    }

    // --- EDGE CHECK: start falling if no floor under current position ---
    const edgeFloor = this.effectiveFloor(
      this.container.x,
      this.container.y - 1,
    );
    if (edgeFloor > this.container.y) {
      this.isGrounded = false;
      this.velocityY = 0;
    }
  }
}
