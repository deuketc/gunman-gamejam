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
  | "jump-land-left"
  | "jump-land-right"
  | "jump-hang-left"
  | "jump-hang-right"
  | "shoot-cycle-left"
  | "shoot-cycle-right"
  | "shoot-ready-left"
  | "shoot-ready-right"
  | "shoot-lower-left"
  | "shoot-lower-right"
  | "turn-right"
  | "turn-right-back"
  | "turn-left"
  | "turn-left-back"
  | "platform-jump-right"
  | "platform-jump-left"
  | "platform-jump-hang-right"
  | "platform-jump-hang-left"
  | "platform-jump-land-right"
  | "platform-jump-land-left"
  | "platform-pull-up-right"
  | "platform-pull-up-left"
  | "fall-right"
  | "fall-left"
  | "fall-land-right"
  | "fall-land-left";

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
const WALK_R_PATH = "/assets/gunman-ani-stand-shutgun-walk-right.png";
const SHOOT_R_PATH = "/assets/gunman-ani-stand-shutgun-shoot-right.png";
const IDLE_FRONT_PATH = "/assets/gunman-ani-stand-shutgun-idle-right.png";
const TURN_R_PATH = "/assets/gunman-ani-stand-shutgun-turn-around-right.png";
const TURN_FRAME_COUNT = 3;
const TURN_ANIM_SPEED = 0.2;
const PLATFORM_JUMP_PATH =
  "/assets/gunman-ani-stand-shutgun-jump-to-platform-right.png";
const PLATFORM_JUMP_FRAME_W = 128;
const PLATFORM_JUMP_FRAME_H = 128;
const PLATFORM_JUMP_FRAMES = 9;
const PLATFORM_JUMP_LAUNCH_FRAME = 6; // 0-indexed: physics fire here
const PLATFORM_JUMP_STARTUP_COUNT = 6; // frames 0-5 play while grounded
const PLATFORM_JUMP_ANIM_SPEED = 0.2;
const PLATFORM_JUMP_STRENGTH = 5.5; // slightly lower than normal jump
const PLATFORM_JUMP_Y_OFFSET = 32; // shift 128px frame down to align feet with ground
const PULL_UP_PATH =
  "/assets/gunman-ani-stand-shutgun-pull-up-to-platform-right.png";
const PULL_UP_FRAME_W = 128;
const PULL_UP_FRAME_H = 160;
const PULL_UP_FRAMES = 13;
const PULL_UP_ANIM_SPEED = 0.2;
const PULL_UP_Y_OFFSET = 13; // centres 160px frame on platform ledge (80 - hangOffset 67)
const FALL_PATH = "/assets/gunman-ani-fall-shutgun-right.png";
const FALL_FRAME_W = 128;
const FALL_FRAME_H = 128;
const FALL_INTRO_FRAMES = 3; // frames 0-2: play then freeze while falling
const FALL_LAND_FRAMES = 4; // frames 3-6: play on ground contact
const FALL_ANIM_SPEED = 0.25;
const FALL_Y_OFFSET = 32; // same standard offset as other 128px sprites

// Long jump (left / right jump with run-up animation)
const LONG_JUMP_PATH = "/assets/gunman-ani-right-jump-long.png";
const LONG_JUMP_FRAME_W = 128;
const LONG_JUMP_FRAME_H = 128;
const LONG_JUMP_LAUNCH_FRAME = 2; // frame index when physics fires (after 2 startup frames)
const LONG_JUMP_AIR_END = 8; // frames 0–7 played during startup + air phase
const LONG_JUMP_LAND_START = 8; // frames 8–10: cooldown on landing
const LONG_JUMP_LAND_FRAMES = 3;
const LONG_JUMP_ANIM_SPEED = 0.2;
const LONG_JUMP_Y_OFFSET = 32; // standard 128px offset
const LONG_JUMP_STRENGTH = 5;
const LONG_JUMP_HANG_Y_OFFSET = 47; // sprite offset when hanging after a long jump (container.y = p.y + 52)
const LONG_JUMP_PULL_UP_Y_OFFSET = 28; // sprite offset for pull-up animation from long-jump hang // slightly less height than platform jump
const LONG_JUMP_SPEED_X = 3; // more horizontal range than old jump (was 2)

const IDLE_FRONT_FRAMES = 17;
const IDLE_TRIGGER_FRAMES = 240; // 4 seconds at 60 fps
const IDLE_ANIM_SPEED = 0.1; // relaxed pace
const FRAME_W = 64;
const FRAME_H = 64;
const WALK_FRAMES = 9;
const SHOOT_CYCLE_FRAMES = 6; // frames 1–6  (0-indexed: 0–5)
const SHOOT_LOWER_FRAMES = 4; // frames 7–10 (0-indexed: 6–9)
const SHOOT_FIRE_FRAME = 3; // 0-indexed = frame 4 (1-indexed) — bullet spawns here
const MOVE_SPEED = 1;
const GRAVITY = 0.3;
const WALK_ANIM_SPEED = 0.18;
const SHOOT_ANIM_SPEED = 0.25;
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
  private pendingJumpVX = 0;
  private shootWasDown = false;
  private shootHoldTimer = 0;
  private pendingBullets: PendingBullet[] = [];
  private idleTimer = 0;
  private lastFacingLeft = false;
  private hangPlatformY = 0;
  private pullUpYOffset = PULL_UP_Y_OFFSET; // set per hang type so pull-up aligns correctly

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
    const wR = Assets.get<Texture>(WALK_R_PATH);
    const sR = Assets.get<Texture>(SHOOT_R_PATH);
    const idleF = Assets.get<Texture>(IDLE_FRONT_PATH);
    const turnR = Assets.get<Texture>(TURN_R_PATH);
    const pjR = Assets.get<Texture>(PLATFORM_JUMP_PATH);
    const puR = Assets.get<Texture>(PULL_UP_PATH);
    const fallR = Assets.get<Texture>(FALL_PATH);
    const ljR = Assets.get<Texture>(LONG_JUMP_PATH);

    const standR = new Texture({
      source: stand.source,
      frame: new Rectangle(0, 0, FRAME_W, FRAME_H),
    });
    // Ready frame = frame 0 of the shoot sheet (gun fully raised, waiting to fire)
    const readyR = new Texture({
      source: sR.source,
      frame: new Rectangle(0, 0, FRAME_W, FRAME_H),
    });

    // Left states reuse right-facing textures — the sprite is flipped via scale.x = -1
    this.textures = {
      "idle-right": [standR],
      "idle-left": [standR],
      "idle-front": cropFrames(idleF, 0, IDLE_FRONT_FRAMES),
      "walk-right": cropFrames(wR, 0, WALK_FRAMES),
      "walk-left": cropFrames(wR, 0, WALK_FRAMES),
      // Long jump: frames 0–7 cover startup (0–1) + air (2–7)
      "jump-right": cropFrames(
        ljR,
        0,
        LONG_JUMP_AIR_END,
        LONG_JUMP_FRAME_W,
        LONG_JUMP_FRAME_H,
      ),
      "jump-left": cropFrames(
        ljR,
        0,
        LONG_JUMP_AIR_END,
        LONG_JUMP_FRAME_W,
        LONG_JUMP_FRAME_H,
      ),
      // Hang: reuse platform-jump sheet frozen at its last frame (the dedicated hang pose)
      "jump-hang-right": cropFrames(
        pjR,
        0,
        PLATFORM_JUMP_FRAMES,
        PLATFORM_JUMP_FRAME_W,
        PLATFORM_JUMP_FRAME_H,
      ),
      "jump-hang-left": cropFrames(
        pjR,
        0,
        PLATFORM_JUMP_FRAMES,
        PLATFORM_JUMP_FRAME_W,
        PLATFORM_JUMP_FRAME_H,
      ),
      // Landing cooldown: frames 8–10
      "jump-land-right": cropFrames(
        ljR,
        LONG_JUMP_LAND_START,
        LONG_JUMP_LAND_FRAMES,
        LONG_JUMP_FRAME_W,
        LONG_JUMP_FRAME_H,
      ),
      "jump-land-left": cropFrames(
        ljR,
        LONG_JUMP_LAND_START,
        LONG_JUMP_LAND_FRAMES,
        LONG_JUMP_FRAME_W,
        LONG_JUMP_FRAME_H,
      ),
      "shoot-cycle-right": cropFrames(sR, 0, SHOOT_CYCLE_FRAMES),
      "shoot-cycle-left": cropFrames(sR, 0, SHOOT_CYCLE_FRAMES),
      "shoot-ready-right": [readyR],
      "shoot-ready-left": [readyR],
      "shoot-lower-right": cropFrames(
        sR,
        SHOOT_CYCLE_FRAMES,
        SHOOT_LOWER_FRAMES,
      ),
      "shoot-lower-left": cropFrames(
        sR,
        SHOOT_CYCLE_FRAMES,
        SHOOT_LOWER_FRAMES,
      ),
      "turn-right": cropFrames(turnR, 0, TURN_FRAME_COUNT),
      "turn-right-back": [...cropFrames(turnR, 0, TURN_FRAME_COUNT)].reverse(),
      "turn-left": cropFrames(turnR, 0, TURN_FRAME_COUNT),
      "turn-left-back": [...cropFrames(turnR, 0, TURN_FRAME_COUNT)].reverse(),
      "platform-jump-right": cropFrames(
        pjR,
        0,
        PLATFORM_JUMP_FRAMES,
        PLATFORM_JUMP_FRAME_W,
        PLATFORM_JUMP_FRAME_H,
      ),
      "platform-jump-left": cropFrames(
        pjR,
        0,
        PLATFORM_JUMP_FRAMES,
        PLATFORM_JUMP_FRAME_W,
        PLATFORM_JUMP_FRAME_H,
      ),
      "platform-jump-hang-right": cropFrames(
        pjR,
        0,
        PLATFORM_JUMP_FRAMES,
        PLATFORM_JUMP_FRAME_W,
        PLATFORM_JUMP_FRAME_H,
      ),
      "platform-jump-hang-left": cropFrames(
        pjR,
        0,
        PLATFORM_JUMP_FRAMES,
        PLATFORM_JUMP_FRAME_W,
        PLATFORM_JUMP_FRAME_H,
      ),
      "platform-jump-land-right": [
        ...cropFrames(
          pjR,
          0,
          PLATFORM_JUMP_STARTUP_COUNT,
          PLATFORM_JUMP_FRAME_W,
          PLATFORM_JUMP_FRAME_H,
        ),
      ].reverse(),
      "platform-jump-land-left": [
        ...cropFrames(
          pjR,
          0,
          PLATFORM_JUMP_STARTUP_COUNT,
          PLATFORM_JUMP_FRAME_W,
          PLATFORM_JUMP_FRAME_H,
        ),
      ].reverse(),
      "platform-pull-up-right": cropFrames(
        puR,
        0,
        PULL_UP_FRAMES,
        PULL_UP_FRAME_W,
        PULL_UP_FRAME_H,
      ),
      "platform-pull-up-left": cropFrames(
        puR,
        0,
        PULL_UP_FRAMES,
        PULL_UP_FRAME_W,
        PULL_UP_FRAME_H,
      ),
      "fall-right": cropFrames(
        fallR,
        0,
        FALL_INTRO_FRAMES,
        FALL_FRAME_W,
        FALL_FRAME_H,
      ),
      "fall-left": cropFrames(
        fallR,
        0,
        FALL_INTRO_FRAMES,
        FALL_FRAME_W,
        FALL_FRAME_H,
      ),
      "fall-land-right": cropFrames(
        fallR,
        FALL_INTRO_FRAMES,
        FALL_LAND_FRAMES,
        FALL_FRAME_W,
        FALL_FRAME_H,
      ),
      "fall-land-left": cropFrames(
        fallR,
        FALL_INTRO_FRAMES,
        FALL_LAND_FRAMES,
        FALL_FRAME_W,
        FALL_FRAME_H,
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

      // Platform jump: physics launch at frame 6 while animation keeps playing
      if (
        frame === PLATFORM_JUMP_LAUNCH_FRAME &&
        (this.state === "platform-jump-right" ||
          this.state === "platform-jump-left")
      ) {
        this.isGrounded = false;
        this.velocityY = -PLATFORM_JUMP_STRENGTH;
        this.velocityX = 0;
      }

      // Long jump: physics launch at frame 2 (after 2-frame windup on ground)
      if (
        frame === LONG_JUMP_LAUNCH_FRAME &&
        (this.state === "jump-right" || this.state === "jump-left") &&
        this.isGrounded
      ) {
        this.isGrounded = false;
        this.velocityY = -LONG_JUMP_STRENGTH;
        this.velocityX = this.pendingJumpVX;
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
        case "turn-right-back":
          this.setState("idle-right");
          break;
        case "turn-left-back":
          this.setState("idle-left");
          break;
        case "platform-jump-land-right":
          this.setState("idle-right");
          break;
        case "platform-jump-land-left":
          this.setState("idle-left");
          break;
        case "jump-land-right":
          this.setState("idle-right");
          break;
        case "jump-land-left":
          this.setState("idle-left");
          break;
        case "fall-land-right":
          this.setState("idle-right");
          break;
        case "fall-land-left":
          this.setState("idle-left");
          break;
        case "platform-pull-up-right":
          this.container.y = this.hangPlatformY;
          this.isGrounded = true;
          this.setState("idle-right");
          break;
        case "platform-pull-up-left":
          this.container.y = this.hangPlatformY;
          this.isGrounded = true;
          this.setState("idle-left");
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
    this.sprite.scale.x =
      next.includes("-left") || (next === "idle-front" && this.lastFacingLeft)
        ? -1
        : 1;
    this.sprite.position.set(0, 0); // reset frame offset; overridden below for 128px sprites

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
    } else if (
      next === "turn-right" ||
      next === "turn-right-back" ||
      next === "turn-left" ||
      next === "turn-left-back"
    ) {
      this.sprite.animationSpeed = TURN_ANIM_SPEED;
      this.sprite.loop = false;
      this.sprite.currentFrame = 0;
      this.sprite.play();
    } else if (
      next === "platform-jump-right" ||
      next === "platform-jump-left" ||
      next === "platform-jump-land-right" ||
      next === "platform-jump-land-left"
    ) {
      this.sprite.position.set(0, PLATFORM_JUMP_Y_OFFSET);
      this.sprite.animationSpeed = PLATFORM_JUMP_ANIM_SPEED;
      this.sprite.loop = false;
      this.sprite.currentFrame = 0;
      this.sprite.play();
    } else if (
      next === "platform-jump-hang-right" ||
      next === "platform-jump-hang-left"
    ) {
      this.pullUpYOffset = PULL_UP_Y_OFFSET; // standard hang offset
      this.sprite.position.set(0, PLATFORM_JUMP_Y_OFFSET);
      this.sprite.loop = false;
      this.sprite.currentFrame = PLATFORM_JUMP_FRAMES - 1; // frozen at last frame
      // don't call play() — sprite stays still
    } else if (
      next === "platform-pull-up-right" ||
      next === "platform-pull-up-left"
    ) {
      this.sprite.position.set(0, this.pullUpYOffset);
      this.sprite.animationSpeed = PULL_UP_ANIM_SPEED;
      this.sprite.loop = false;
      this.sprite.currentFrame = 0;
      this.sprite.play();
    } else if (
      next === "fall-right" ||
      next === "fall-left" ||
      next === "fall-land-right" ||
      next === "fall-land-left"
    ) {
      this.sprite.position.set(0, FALL_Y_OFFSET);
      this.sprite.animationSpeed = FALL_ANIM_SPEED;
      this.sprite.loop = false;
      this.sprite.currentFrame = 0;
      this.sprite.play();
    } else if (
      next === "jump-right" ||
      next === "jump-left" ||
      next === "jump-land-right" ||
      next === "jump-land-left"
    ) {
      this.sprite.position.set(0, LONG_JUMP_Y_OFFSET);
      this.sprite.animationSpeed = LONG_JUMP_ANIM_SPEED;
      this.sprite.loop = false;
      this.sprite.currentFrame = 0;
      this.sprite.play();
    } else if (next === "jump-hang-right" || next === "jump-hang-left") {
      this.pullUpYOffset = LONG_JUMP_PULL_UP_Y_OFFSET; // pull-up must align from lower snap position
      this.sprite.position.set(0, LONG_JUMP_HANG_Y_OFFSET);
      this.sprite.loop = false;
      this.sprite.currentFrame = PLATFORM_JUMP_FRAMES - 1; // frozen at dedicated hang frame
      // don't call play() — sprite stays still
    }
    // idle, shoot-ready: stopped at frame 0
  }

  hit() {
    if (this.dead) return;
    this.dead = true;
    this.velocityX = 0;
    this.velocityY = 0;
    this.sprite.scale.x = 1;
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

  detectionZone(): Rect {
    const cx = this.container.x;
    const cy = this.container.y;
    const platformJumping =
      this.state === "platform-jump-right" ||
      this.state === "platform-jump-left" ||
      this.state === "platform-jump-hang-right" ||
      this.state === "platform-jump-hang-left";
    const yShift = platformJumping ? -15 : 0;
    if (!this.isGrounded) {
      return { x: cx - 10, y: cy - 52 + yShift, w: 20, h: 52 };
    }
    return { x: cx - 12, y: cy - 58 + yShift, w: 24, h: 58 };
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

  // Starts the pull-up animation from any hang state.
  private startPullUp() {
    const isLeft = this.state.includes("-left");
    this.setState(isLeft ? "platform-pull-up-left" : "platform-pull-up-right");
  }

  // Drop from a platform hang — reverts to the airborne jump state so landing triggers the land animation.
  private startHangDrop() {
    if (this.state === "platform-jump-hang-left")
      this.state = "platform-jump-left";
    else if (this.state === "platform-jump-hang-right")
      this.state = "platform-jump-right";
    else if (this.state === "jump-hang-left") this.state = "jump-left";
    else this.state = "jump-right";
    this.velocityY = 2; // nudge downward so physics take over
  }

  private startTurnBack() {
    const fwdFrame = this.sprite.currentFrame;
    const backStart = Math.max(0, TURN_FRAME_COUNT - 1 - fwdFrame);
    const backState: PlayerState =
      this.state === "turn-left" ? "turn-left-back" : "turn-right-back";
    this.state = backState;
    this.sprite.stop();
    this.sprite.textures = this.textures[backState];
    this.sprite.scale.x = backState.includes("-left") ? -1 : 1;
    this.sprite.animationSpeed = TURN_ANIM_SPEED;
    this.sprite.loop = false;
    this.sprite.currentFrame = backStart;
    this.sprite.play();
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
    const jump = Input.isDown("Space");
    const turnKey = Input.isAnyDown("ArrowUp", "KeyW");
    const shootDown = Input.isAnyDown("ControlLeft", "ControlRight");
    const shootJust = shootDown && !this.shootWasDown;
    this.shootWasDown = shootDown;

    // --- AIRBORNE ---
    if (!this.isGrounded) {
      // --- HANGING: frozen on platform underside ---
      if (
        this.state === "platform-jump-hang-right" ||
        this.state === "platform-jump-hang-left" ||
        this.state === "jump-hang-right" ||
        this.state === "jump-hang-left"
      ) {
        if (Input.isAnyDown("ArrowDown", "KeyS")) this.startHangDrop();
        else if (turnKey) this.startPullUp();
        return;
      }

      // --- PULLING UP: animation plays, no physics ---
      if (
        this.state === "platform-pull-up-right" ||
        this.state === "platform-pull-up-left"
      ) {
        return;
      }

      this.velocityY += GRAVITY;
      this.container.x = Math.max(
        FRAME_W / 2,
        Math.min(this.screenW - FRAME_W / 2, this.container.x + this.velocityX),
      );
      const prevY = this.container.y;
      this.container.y += this.velocityY;

      // --- Platform grab: detection zone top meets a platform edge ---
      if (
        this.state === "platform-jump-right" ||
        this.state === "platform-jump-left" ||
        this.state === "jump-right" ||
        this.state === "jump-left"
      ) {
        // platform-jump has a +15 raise; long jump uses the plain airborne top (cy - 52)
        const isLongJump =
          this.state === "jump-right" || this.state === "jump-left";
        const hangOffset = isLongJump ? 52 : 67;
        const dzTop = this.container.y - hangOffset;
        const prevDzTop = prevY - hangOffset;
        const dz = this.detectionZone();
        for (const p of this.platforms) {
          const xOverlap = dz.x < p.x + p.w && dz.x + dz.w > p.x;

          // Case 1: ascending — dzTop crosses platform surface from below
          const verticalGrab =
            this.velocityY < 0 && dzTop <= p.y && prevDzTop > p.y;

          // Case 2: descending — dzTop crosses platform surface from above
          const descendingGrab =
            this.velocityY > 0 && dzTop >= p.y && prevDzTop < p.y;

          if (xOverlap && (verticalGrab || descendingGrab)) {
            this.hangPlatformY = p.y; // remember for pull-up landing
            this.container.y = p.y + hangOffset; // snap detection zone top to platform surface
            this.velocityX = 0;
            this.velocityY = 0;
            if (this.state === "jump-right") this.setState("jump-hang-right");
            else if (this.state === "jump-left")
              this.setState("jump-hang-left");
            else if (this.state === "platform-jump-left")
              this.setState("platform-jump-hang-left");
            else this.setState("platform-jump-hang-right");
            return;
          }
        }
      }

      const floor = this.effectiveFloor(this.container.x, prevY);
      if (this.container.y >= floor) {
        this.container.y = floor;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isGrounded = true;
        if (this.state === "platform-jump-right") {
          this.setState("platform-jump-land-right");
        } else if (this.state === "platform-jump-left") {
          this.setState("platform-jump-land-left");
        } else if (this.state === "jump-right") {
          this.setState("jump-land-right");
        } else if (this.state === "jump-left") {
          this.setState("jump-land-left");
        } else if (this.state === "fall-right") {
          this.setState("fall-land-right");
        } else if (this.state === "fall-left") {
          this.setState("fall-land-left");
        } else {
          this.setState(this.facingLeft() ? "idle-left" : "idle-right");
        }
      }
      return;
    }

    // --- IDLE FRONT: any input exits back to last facing direction ---
    if (this.state === "idle-front") {
      if (!left && !right && !jump && !turnKey && !shootJust) return;
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

    // --- LOCKED ANIMATIONS: platform jump, land, hang, fall land, long jump startup/land ---
    if (
      this.state === "platform-jump-right" ||
      this.state === "platform-jump-left" ||
      this.state === "platform-jump-hang-right" ||
      this.state === "platform-jump-hang-left" ||
      this.state === "platform-jump-land-right" ||
      this.state === "platform-jump-land-left" ||
      this.state === "fall-land-right" ||
      this.state === "fall-land-left" ||
      this.state === "jump-right" || // long jump startup (isGrounded, pre-launch)
      this.state === "jump-left" ||
      this.state === "jump-land-right" ||
      this.state === "jump-land-left"
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

      if (!left && !right && !jump && !turnKey) return;
      // Movement or turn key pressed — drop the gun immediately and fall through
      this.setState(isLeft ? "idle-left" : "idle-right");
    }

    // --- TURN FORWARD: playing forward, paused while key held ---
    if (this.state === "turn-right" || this.state === "turn-left") {
      if (jump) {
        this.setState(
          this.state === "turn-left"
            ? "platform-jump-left"
            : "platform-jump-right",
        );
        return;
      }
      if (!turnKey) this.startTurnBack();
      return;
    }

    // --- TURN BACK: animation drives itself; onComplete → idle ---
    if (this.state === "turn-right-back" || this.state === "turn-left-back") {
      return;
    }

    // --- GROUNDED: turn, jump, new shot, or walk ---
    if (turnKey && !left && !right) {
      this.setState(this.facingLeft() ? "turn-left" : "turn-right");
      return;
    }

    if (jump) {
      // Long jump: animation handles startup timing; physics fire at onFrameChange frame 2
      if (left && !right) {
        this.pendingJumpVX = -LONG_JUMP_SPEED_X;
        this.setState("jump-left");
      } else if (right && !left) {
        this.pendingJumpVX = LONG_JUMP_SPEED_X;
        this.setState("jump-right");
      } else {
        this.pendingJumpVX = 0;
        this.setState(this.facingLeft() ? "jump-left" : "jump-right");
      }
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
      this.setState(this.facingLeft() ? "fall-left" : "fall-right");
    }
  }
}
