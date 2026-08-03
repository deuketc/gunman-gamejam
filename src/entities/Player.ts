import { AnimatedSprite, Assets, Container, Rectangle, Texture } from "pixi.js";
import { Input } from "../input/Input";
import { Sfx } from "../audio/Sfx";
import type { Platform, Ladder, Rect } from "./Platform";

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
  | "fall-land-left"
  | "ladder"
  | "throw-right"
  | "throw-left"
  | "win";

interface PendingBullet {
  x: number;
  y: number;
  angle: number;
}

interface PendingGrenade {
  x: number;
  y: number;
  facingLeft: boolean;
}

const DEATH_PATH = "/assets/player-ani-death.png";
const DEATH_FRAME_W = 128;
const DEATH_FRAME_H = 128;
const DEATH_FRAME_COUNT = 11;
const STAND_PATH = "/assets/player-static-south-east.png";
const STAND_FRAME_W = 128;
const STAND_FRAME_H = 128;
const STAND_Y_OFFSET = 0;
const WALK_R_PATH = "/assets/player-ani-walk.png";
const WALK_FRAME_W = 128;
const WALK_FRAME_H = 128;
const WALK_Y_OFFSET = 0;
const WALK_LOOP_START = 3; // first frame of the loop portion
const SHOOT_R_PATH = "/assets/player-ani-shoot.png";
const SHOOT_FRAME_W = 128;
const SHOOT_FRAME_H = 128;
const SHOOT_Y_OFFSET = 0;
const IDLE_FRONT_PATH = "/assets/player-ani-idle.png";
const IDLE_FRONT_FRAME_W = 128;
const IDLE_FRONT_FRAME_H = 128;
const IDLE_FRONT_Y_OFFSET = 0;
const TURN_R_PATH = "/assets/player-ani-turn-around.png";
const TURN_FRAME_W = 128;
const TURN_FRAME_H = 128;
const TURN_Y_OFFSET = 0;
const TURN_FRAME_COUNT = 3;
const TURN_ANIM_SPEED = 0.2;
const PLATFORM_JUMP_PATH = "/assets/player-ani-jump-to-platform.png";
const PLATFORM_JUMP_FRAME_W = 128;
const PLATFORM_JUMP_FRAME_H = 256;
const PLATFORM_JUMP_FRAMES = 7;
const PLATFORM_JUMP_LAUNCH_FRAME = 5; // 0-indexed: physics fire here
const PLATFORM_JUMP_STARTUP_COUNT = 5; // frames 0-4 play while grounded
const PLATFORM_JUMP_ANIM_SPEED = 0.2;
const PLATFORM_JUMP_STRENGTH = 12; // slightly lower than normal jump
const PLATFORM_JUMP_Y_OFFSET = 64; // shift 128px frame down to align feet with ground
const PULL_UP_PATH = "/assets/player-ani-pull-up-to-platform.png";
const PULL_UP_FRAME_W = 128;
const PULL_UP_FRAME_H = 256;
const PULL_UP_FRAMES = 9;
const PULL_UP_ANIM_SPEED = 0.2;
const PULL_UP_Y_OFFSET = PLATFORM_JUMP_Y_OFFSET - 54; // matches hang frame offset so the hang->pull-up transition doesn't jump
const LADDER_PULL_UP_Y_OFFSET = PULL_UP_Y_OFFSET + 50; // ladder-top exit snaps in higher than a platform jump, so pull up sits lower
const FALL_PATH = "/assets/player-ani-fall-from-platform.png";
const FALL_FRAME_W = 128;
const FALL_FRAME_H = 128;
const FALL_INTRO_FRAMES = 2; // frames 0-1: play then freeze while falling
const FALL_LAND_FRAMES = 3; // frames 1-3: play on ground contact
const FALL_ANIM_SPEED = 0.25;
const FALL_Y_OFFSET = 0;

const THROW_PATH = "/assets/player-ani-throw-grenade.png";
const THROW_FRAME_W = 128;
const THROW_FRAME_H = 128;
const THROW_FRAMES = 9;
const THROW_SPAWN_FRAME = 6;
const THROW_ANIM_SPEED = 0.2;

const WIN_PATH = "/assets/player-ani-winning.png";
const WIN_FRAME_W = 128;
const WIN_FRAME_H = 128;
const WIN_FRAMES = 10;
const WIN_Y_OFFSET = 0;
const WIN_ANIM_SPEED = 0.2;

const LADDER_PATH = "/assets/player-ani-ladder-climb.png";
const LADDER_FRAME_W = 128;
const LADDER_FRAME_H = 256;
const LADDER_FRAMES = 7;
const LADDER_Y_OFFSET = 32; // standard 128px frame offset
const LADDER_ANIM_SPEED = 0.2;
const LADDER_CLIMB_START = 0; // first frame of climb loop
const LADDER_CLIMB_END = 6; // last frame of climb loop
const LADDER_SPEED = 1.5; // px per tick while climbing
const LADDER_SCRUB = 0.15; // animation frames advanced per tick of movement

// Long jump (left / right jump with run-up animation)
const LONG_JUMP_PATH = "/assets/player-ani-jump-forward.png";
const LONG_JUMP_FRAME_W = 256;
const LONG_JUMP_FRAME_H = 128;
const LONG_JUMP_LAUNCH_FRAME = 2; // frame index when physics fires (after 2 startup frames)
const LONG_JUMP_AIR_END = 3; // frames 0–2 played during startup + air phase
const LONG_JUMP_LAND_START = 5; // frames 5–6: cooldown on landing
const LONG_JUMP_LAND_FRAMES = 2;
const LONG_JUMP_ANIM_SPEED = 0.2;
const LONG_JUMP_Y_OFFSET = 0; // standard 128px offset
const LONG_JUMP_STRENGTH = 10;
const LONG_JUMP_HANG_Y_OFFSET = 128; // sprite offset when hanging after a long jump (container.y = p.y + 52)
const LONG_JUMP_PULL_UP_Y_OFFSET = 72; // sprite offset for pull-up animation from long-jump hang // slightly less height than platform jump
const LONG_JUMP_SPEED_X = 6; // more horizontal range than old jump (was 2)

const IDLE_FRONT_FRAMES = 16;
const IDLE_ANIM_SPEED = 0.1; // relaxed pace
const IDLE_TRIGGER_FRAMES = 60; // 1 second at 60 fps
const FRAME_W = 64;
const FRAME_H = 64;
const AIRBORNE_DETECTION_HALF_W = 10; // half-width of detectionZone() while airborne
const WALK_FRAMES = 17;
const SHOOT_CYCLE_FRAMES = 13; // frames 0–12 (raise + fire + reload)
const SHOOT_LOWER_START = 12; // frames 12–14: put-away
const SHOOT_LOWER_FRAMES = 3;
const SHOOT_FIRE_FRAME = 3; // 0-indexed: bullet spawns here
const MOVE_SPEED = 1.5;
const GRAVITY = 0.6;
const WALK_ANIM_SPEED = 0.3;
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
  won = false;
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
  private pendingGrenades: PendingGrenade[] = [];
  private idleTimer = 0;
  private lastFacingLeft = false;
  private hangPlatformY = 0;
  private dropGrabCooldown = 0; // suppresses re-grabbing the ledge just dropped from
  private pullUpYOffset = PULL_UP_Y_OFFSET; // set per hang type so pull-up aligns correctly
  private ladders: Ladder[] = [];
  private activeLadder: Ladder | null = null;
  private ladderFrameAccum = 0;
  private hasGrenade = false;
  private winAnimDone = false;

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
    const throwR = Assets.get<Texture>(THROW_PATH);
    const ladderSheet = Assets.get<Texture>(LADDER_PATH);
    const winR = Assets.get<Texture>(WIN_PATH);

    const standR = new Texture({
      source: stand.source,
      frame: new Rectangle(0, 0, STAND_FRAME_W, STAND_FRAME_H),
    });
    // Ready frame = frame 0 of the shoot sheet (gun fully raised, waiting to fire)
    const readyR = new Texture({
      source: sR.source,
      frame: new Rectangle(12 * SHOOT_FRAME_W, 0, SHOOT_FRAME_W, SHOOT_FRAME_H),
    });

    // Left states reuse right-facing textures — the sprite is flipped via scale.x = -1
    this.textures = {
      "idle-right": [standR],
      "idle-left": [standR],
      "idle-front": cropFrames(
        idleF,
        0,
        IDLE_FRONT_FRAMES,
        IDLE_FRONT_FRAME_W,
        IDLE_FRONT_FRAME_H,
      ),
      "walk-right": cropFrames(wR, 0, WALK_FRAMES, WALK_FRAME_W, WALK_FRAME_H),
      "walk-left": cropFrames(wR, 0, WALK_FRAMES, WALK_FRAME_W, WALK_FRAME_H),
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
      "shoot-cycle-right": cropFrames(
        sR,
        0,
        SHOOT_CYCLE_FRAMES,
        SHOOT_FRAME_W,
        SHOOT_FRAME_H,
      ),
      "shoot-cycle-left": cropFrames(
        sR,
        0,
        SHOOT_CYCLE_FRAMES,
        SHOOT_FRAME_W,
        SHOOT_FRAME_H,
      ),
      "shoot-ready-right": [readyR],
      "shoot-ready-left": [readyR],
      "shoot-lower-right": cropFrames(
        sR,
        SHOOT_LOWER_START,
        SHOOT_LOWER_FRAMES,
        SHOOT_FRAME_W,
        SHOOT_FRAME_H,
      ),
      "shoot-lower-left": cropFrames(
        sR,
        SHOOT_LOWER_START,
        SHOOT_LOWER_FRAMES,
        SHOOT_FRAME_W,
        SHOOT_FRAME_H,
      ),
      "turn-right": cropFrames(
        turnR,
        0,
        TURN_FRAME_COUNT,
        TURN_FRAME_W,
        TURN_FRAME_H,
      ),
      "turn-right-back": [
        ...cropFrames(turnR, 0, TURN_FRAME_COUNT, TURN_FRAME_W, TURN_FRAME_H),
      ].reverse(),
      "turn-left": cropFrames(
        turnR,
        0,
        TURN_FRAME_COUNT,
        TURN_FRAME_W,
        TURN_FRAME_H,
      ),
      "turn-left-back": [
        ...cropFrames(turnR, 0, TURN_FRAME_COUNT, TURN_FRAME_W, TURN_FRAME_H),
      ].reverse(),
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
      ladder: cropFrames(
        ladderSheet,
        0,
        LADDER_FRAMES,
        LADDER_FRAME_W,
        LADDER_FRAME_H,
      ),
      "throw-right": cropFrames(
        throwR,
        0,
        THROW_FRAMES,
        THROW_FRAME_W,
        THROW_FRAME_H,
      ),
      "throw-left": cropFrames(
        throwR,
        0,
        THROW_FRAMES,
        THROW_FRAME_W,
        THROW_FRAME_H,
      ),
      win: cropFrames(winR, 0, WIN_FRAMES, WIN_FRAME_W, WIN_FRAME_H),
    };

    this.sprite = new AnimatedSprite(this.textures["idle-front"]);
    this.sprite.anchor.set(0.5, 1);
    this.sprite.position.set(0, IDLE_FRONT_Y_OFFSET);
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
        Sfx.play("jump");
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
        Sfx.play("jump");
      }

      // Throw: spawn grenade at frame 15
      if (
        (this.state === "throw-right" || this.state === "throw-left") &&
        frame === THROW_SPAWN_FRAME
      ) {
        const left = this.state === "throw-left";
        this.pendingGrenades.push({
          x: this.container.x + (left ? -40 : 40),
          y: this.container.y - 80,
          facingLeft: left,
        });
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
        case "walk-right":
        case "walk-left":
          this.sprite.currentFrame = WALK_LOOP_START;
          this.sprite.play();
          break;
        case "throw-right":
          this.setState("idle-right");
          break;
        case "throw-left":
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
        case "win":
          this.winAnimDone = true;
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
      next.includes("-left") ||
      ((next === "idle-front" || next === "ladder") && this.lastFacingLeft)
        ? -1
        : 1;
    this.sprite.position.set(0, 0); // reset frame offset; overridden below for 128px sprites

    if (next === "walk-left" || next === "walk-right") {
      this.sprite.position.set(0, WALK_Y_OFFSET);
      this.sprite.animationSpeed = WALK_ANIM_SPEED;
      this.sprite.loop = false; // onComplete restarts from WALK_LOOP_START
      this.sprite.currentFrame = 0;
      this.sprite.play();
    } else if (next === "idle-front") {
      this.sprite.position.set(0, IDLE_FRONT_Y_OFFSET);
      this.sprite.animationSpeed = IDLE_ANIM_SPEED;
      this.sprite.loop = true;
      this.sprite.currentFrame = 0;
      this.sprite.play();
    } else if (
      next === "shoot-cycle-left" ||
      next === "shoot-cycle-right" ||
      next === "shoot-lower-left" ||
      next === "shoot-lower-right"
    ) {
      this.sprite.position.set(0, SHOOT_Y_OFFSET);
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
      this.sprite.position.set(0, TURN_Y_OFFSET);
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
    } else if (next === "throw-right" || next === "throw-left") {
      this.sprite.animationSpeed = THROW_ANIM_SPEED;
      this.sprite.loop = false;
      this.sprite.currentFrame = 0;
      this.sprite.play();
    } else if (next === "win") {
      this.sprite.position.set(0, WIN_Y_OFFSET);
      this.sprite.animationSpeed = WIN_ANIM_SPEED;
      this.sprite.loop = false;
      this.sprite.currentFrame = 0;
      this.sprite.play();
    } else if (next === "ladder") {
      this.sprite.position.set(0, LADDER_Y_OFFSET);
      this.sprite.animationSpeed = LADDER_ANIM_SPEED;
      this.sprite.loop = false;
      this.sprite.currentFrame = 0;
      this.sprite.stop(); // manual frame stepping drives the climb loop
    } else if (next === "idle-right" || next === "idle-left") {
      this.sprite.position.set(0, STAND_Y_OFFSET);
    } else if (next === "shoot-ready-left" || next === "shoot-ready-right") {
      this.sprite.position.set(0, SHOOT_Y_OFFSET);
    }
  }

  hit() {
    if (this.dead) return;
    this.dead = true;
    this.velocityX = 0;
    this.velocityY = 0;
    this.sprite.scale.x = 1;
    this.sprite.onComplete = undefined;
    this.sprite.textures = this.deathFrames;
    this.sprite.position.set(0, 0);
    this.sprite.loop = false;
    this.sprite.currentFrame = 0;
    this.sprite.play();
    Sfx.play("deathplayer");
  }

  win() {
    if (this.dead || this.won) return;
    this.won = true;
    this.velocityX = 0;
    this.velocityY = 0;
    this.setState("win");
  }

  get grounded(): boolean {
    return this.isGrounded;
  }

  get winComplete(): boolean {
    return this.winAnimDone;
  }

  hurtbox(): Rect {
    const cx = this.container.x;
    const cy = this.container.y;
    if (!this.isGrounded) {
      return { x: cx - 20, y: cy - 104, w: 40, h: 104 };
    }
    return { x: cx - 24, y: cy - 116, w: 48, h: 116 };
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
    if (this.state === "ladder") {
      return { x: cx - 20, y: cy - 164, w: 40, h: 144 };
    }
    if (!this.isGrounded) {
      return {
        x: cx - AIRBORNE_DETECTION_HALF_W,
        y: cy - 104 + yShift,
        w: AIRBORNE_DETECTION_HALF_W * 2,
        h: 104,
      };
    }
    return { x: cx - 24, y: cy - 116 + yShift, w: 48, h: 116 };
  }

  setPlatforms(platforms: Platform[]) {
    this.platforms = platforms;
  }

  setLadders(ladders: Ladder[]) {
    this.ladders = ladders;
  }

  setHasGrenade(has: boolean) {
    this.hasGrenade = has;
  }

  private enterLadder(ladder: Ladder) {
    this.lastFacingLeft = this.facingLeft();
    this.activeLadder = ladder;
    this.isGrounded = false;
    this.velocityX = 0;
    this.velocityY = 0;
    this.ladderFrameAccum = 0;
    this.container.x = ladder.x + ladder.w / 2;
    this.setState("ladder");
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
    if (this.state === "idle-front" || this.state === "ladder")
      return this.lastFacingLeft;
    return this.state.endsWith("-left");
  }

  private spawnPellets() {
    const left = this.facingLeft();
    const base = left ? Math.PI : 0;
    const barrelX = this.container.x + (left ? -55 : 55);
    const barrelY = this.container.y - 94;
    this.pendingBullets.push({ x: barrelX, y: barrelY, angle: base });
    Sfx.play("gunshot");
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
    this.dropGrabCooldown = 30; // ~0.25s — long enough to clear the ledge before re-grab checks resume
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
    this.sprite.position.set(0, TURN_Y_OFFSET);
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

  takePendingGrenades(): PendingGrenade[] {
    const out = this.pendingGrenades.slice();
    this.pendingGrenades = [];
    return out;
  }

  update(_dt: number) {
    if (this.dead || this.won) return;

    const left = Input.isAnyDown("ArrowLeft", "KeyA");
    const right = Input.isAnyDown("ArrowRight", "KeyD");
    const jump = Input.isDown("Space");
    const turnKey = Input.isAnyDown("ArrowUp", "KeyW");
    const shootDown = Input.isAnyDown("ControlLeft", "ControlRight");
    const shootJust = shootDown && !this.shootWasDown;
    this.shootWasDown = shootDown;

    // --- AIRBORNE ---
    if (!this.isGrounded) {
      // --- LADDER: climbing ---
      if (this.state === "ladder") {
        const l = this.activeLadder!;
        this.container.x = l.x + l.w / 2; // pin to ladder centre

        const down = Input.isAnyDown("ArrowDown", "KeyS");
        const climbRange = LADDER_CLIMB_END - LADDER_CLIMB_START + 1; // 7 frames

        if (turnKey) {
          this.container.y -= LADDER_SPEED;
          this.ladderFrameAccum += LADDER_SCRUB;
          if (this.ladderFrameAccum >= 1) {
            this.ladderFrameAccum -= 1;
            const offset =
              (this.sprite.currentFrame - LADDER_CLIMB_START + 1) % climbRange;
            this.sprite.currentFrame = LADDER_CLIMB_START + offset;
          }
          // Exit top — detection zone top meets upper platform
          if (this.detectionZone().y <= l.y) {
            this.hangPlatformY = l.y;
            this.pullUpYOffset = LADDER_PULL_UP_Y_OFFSET;
            this.container.y = l.y + 67;
            this.activeLadder = null;
            this.setState(
              this.lastFacingLeft
                ? "platform-pull-up-left"
                : "platform-pull-up-right",
            );
          }
        } else if (down) {
          this.container.y += LADDER_SPEED;
          this.ladderFrameAccum -= LADDER_SCRUB;
          if (this.ladderFrameAccum <= -1) {
            this.ladderFrameAccum += 1;
            const offset =
              (((this.sprite.currentFrame - LADDER_CLIMB_START - 1) %
                climbRange) +
                climbRange) %
              climbRange;
            this.sprite.currentFrame = LADDER_CLIMB_START + offset;
          }
          // Exit bottom — feet reach lower platform
          if (this.container.y >= l.y + l.h) {
            this.container.y = l.y + l.h;
            this.activeLadder = null;
            this.isGrounded = true;
            this.setState(this.lastFacingLeft ? "idle-left" : "idle-right");
          }
        }
        return;
      }

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
      if (this.dropGrabCooldown > 0) this.dropGrabCooldown--;

      // --- Platform grab: detection zone top meets a platform edge ---
      if (
        this.dropGrabCooldown <= 0 &&
        (this.state === "platform-jump-right" ||
          this.state === "platform-jump-left" ||
          this.state === "jump-right" ||
          this.state === "jump-left")
      ) {
        const isLongJump =
          this.state === "jump-right" || this.state === "jump-left";
        // grabOffset matches the detection zone top so the grab fires exactly when
        // the yellow debug box crosses the platform surface
        const grabOffset = isLongJump ? 52 : 119;
        // hangOffset controls where the player snaps to when hanging
        const hangOffset = isLongJump ? 52 : 115;
        const dzTop = this.container.y - grabOffset;
        const prevDzTop = prevY - grabOffset;
        const cx = this.container.x;
        // some x margin for platform-jump so the player doesn't need pixel-perfect
        // positioning — matches the airborne detection zone's own half-width
        const grabMarginX = isLongJump ? 0 : AIRBORNE_DETECTION_HALF_W;
        for (const p of this.platforms) {
          const xOverlap =
            cx + grabMarginX > p.x && cx - grabMarginX < p.x + p.w;

          // Case 1: ascending — dzTop crosses platform surface from below
          const verticalGrab =
            this.velocityY < 0 && dzTop <= p.y && prevDzTop > p.y;

          // Case 2: descending — dzTop crosses platform surface from above
          const descendingGrab =
            this.velocityY > 0 && dzTop >= p.y && prevDzTop < p.y;

          if (xOverlap && (verticalGrab || descendingGrab)) {
            this.hangPlatformY = p.y;
            this.container.y = p.y + hangOffset;
            this.velocityX = 0;
            this.velocityY = 0;
            if (this.state === "jump-right") this.setState("jump-hang-right");
            else if (this.state === "jump-left")
              this.setState("jump-hang-left");
            else if (this.state === "platform-jump-left") {
              this.pullUpYOffset = PULL_UP_Y_OFFSET;
              this.setState("platform-jump-hang-left");
            } else {
              this.pullUpYOffset = PULL_UP_Y_OFFSET;
              this.setState("platform-jump-hang-right");
            }
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
          Sfx.play("landing");
        } else if (this.state === "jump-left") {
          this.setState("jump-land-left");
          Sfx.play("landing");
        } else if (this.state === "fall-right") {
          this.setState("fall-land-right");
          Sfx.play("landing");
        } else if (this.state === "fall-left") {
          this.setState("fall-land-left");
          Sfx.play("landing");
        } else {
          this.setState(this.facingLeft() ? "idle-left" : "idle-right");
        }
      }
      return;
    }

    // --- IDLE FRONT: any input exits back to last facing direction ---
    if (this.state === "idle-front") {
      const throwJust = Input.isJustPressed("KeyG") && this.hasGrenade;
      if (!left && !right && !jump && !turnKey && !shootJust && !throwJust)
        return;
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
      this.state === "jump-land-left" ||
      this.state === "throw-right" ||
      this.state === "throw-left"
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
        // Re-fire: spawn bullet immediately, jump to fire frame, play reload
        this.spawnPellets();
        this.setState(isLeft ? "shoot-cycle-left" : "shoot-cycle-right");
        this.sprite.currentFrame = SHOOT_FIRE_FRAME;
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
      if (Input.isJustPressed("KeyG") && this.hasGrenade) {
        this.setState(
          this.state === "turn-left" ? "throw-left" : "throw-right",
        );
        return;
      }
      // Ladder entry when fully turned (frame 2) and Up/W held
      if (turnKey && this.sprite.currentFrame === TURN_FRAME_COUNT - 1) {
        const dzCx = this.container.x;
        const dzCy = this.container.y - 29;
        for (const l of this.ladders) {
          if (
            dzCx >= l.x &&
            dzCx <= l.x + l.w &&
            dzCy >= l.y &&
            dzCy <= l.y + l.h
          ) {
            this.enterLadder(l);
            return;
          }
        }
      }
      if (!turnKey) this.startTurnBack();
      return;
    }

    // --- TURN BACK: animation drives itself; onComplete → idle ---
    if (this.state === "turn-right-back" || this.state === "turn-left-back") {
      if (Input.isJustPressed("KeyG") && this.hasGrenade) {
        this.setState(
          this.state === "turn-left-back" ? "throw-left" : "throw-right",
        );
      }
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

    if (Input.isJustPressed("KeyG") && this.hasGrenade) {
      this.setState(this.facingLeft() ? "throw-left" : "throw-right");
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
