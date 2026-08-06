import { Application, Container, Graphics, Sprite } from "pixi.js";
import { Input } from "../input/Input";
import { Player } from "../entities/Player";
import type { Platform, Ladder } from "../entities/Platform";
import { Bullet } from "../entities/projectiles/Bullet";
import type { EnemyBase, Rect } from "../entities/enemies/EnemyBase";
import {
  EnemyStatic,
  ENEMY_V1,
  ENEMY_V2,
  ENEMY_V3,
} from "../entities/enemies/EnemyStatic";
import { EnemyDrone } from "../entities/enemies/EnemyDrone";
import { EnemyLaser } from "../entities/projectiles/EnemyLaser";
import { Door } from "../entities/interactables/Door";
import { Keypad } from "../entities/interactables/Keypad";
import { DoorLight } from "../entities/interactables/DoorLight";
import { Inventory } from "../entities/Inventory";
import { Medal } from "../entities/Medal";
import { GrenadeProjectile } from "../entities/projectiles/GrenadeProjectile";
import { Explosion } from "../entities/Explosion";
import { Sfx } from "../audio/Sfx";
import type { MusicPlayer } from "../audio/MusicPlayer";
import { MusicToggleButton } from "../entities/MusicToggleButton";
import { IntroSequence } from "../entities/IntroSequence";
import { DeathScreen } from "../entities/DeathScreen";
import { WinScreen } from "../entities/WinScreen";
import { BackgroundSprite } from "../entities/BackgroundSprite";
import { Rain } from "../entities/Rain";
import { trackEvent } from "../analytics";

function pointInRect(px: number, py: number, r: Rect): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

export class GameScene {
  readonly container: Container;
  private player: Player;
  private enemies: EnemyBase[] = [];
  private bullets: Bullet[] = [];
  private lasers: EnemyLaser[] = [];
  private screenW: number;
  private screenH: number;
  private groundY = 0;
  private lastPlayerX = 0;
  private platforms: Platform[] = [];
  private ladders: Ladder[] = [];
  private doors: Door[] = [];
  private keypad!: Keypad;
  private inventory!: Inventory;
  private medal!: Medal;
  private musicToggle!: MusicToggleButton;
  private grenades: GrenadeProjectile[] = [];
  private explosions: Explosion[] = [];
  private debugMode = false;
  private debugGfx: Graphics;
  private intro: IntroSequence;
  private introDone = false;
  private deathScreen!: DeathScreen;
  private winScreen!: WinScreen;
  private music: MusicPlayer;
  private winZone: Rect;
  private winTriggered = false;
  private medalAcquired = false;
  private usedGrenade = false;
  private rain: Rain;

  constructor(app: Application, music: MusicPlayer) {
    this.music = music;
    this.screenW = app.screen.width;
    this.screenH = app.screen.height;
    this.groundY = this.screenH - 58;
    const groundY = this.groundY;
    this.container = new Container();

    const bg = Sprite.from("/assets/background_01_720.png");
    bg.width = this.screenW;
    bg.height = this.screenH;
    this.container.addChild(bg);

    this.rain = new Rain(this.screenW, this.screenH);
    this.container.addChild(this.rain.container);

    const ground = new Graphics();
    ground.moveTo(0, groundY).lineTo(this.screenW, groundY);
    this.container.addChild(ground);

    // Background decoration — purely visual, no gameplay logic
    const billboard = new BackgroundSprite(616, 48, {
      path: "/assets/billboard.png",
      frameW: 43,
      frameH: 21,
      frameCount: 15,
    });
    this.container.addChild(billboard.container);

    const enemy1 = new EnemyStatic(this.screenW - 76, groundY, ENEMY_V1);
    this.enemies.push(enemy1);
    this.container.addChild(enemy1.container);

    const enemy2 = new EnemyStatic(798, groundY - 218, ENEMY_V2);
    this.enemies.push(enemy2);
    this.container.addChild(enemy2.container);

    const enemy3 = new EnemyStatic(330, groundY - 460, ENEMY_V3);
    this.enemies.push(enemy3);
    this.container.addChild(enemy3.container);

    const drone = new EnemyDrone(this.screenW / 2 + 244, 105);
    this.enemies.push(drone);
    this.container.addChild(drone.container);

    this.platforms = [
      { x: 24, y: groundY - 460, w: 456 },
      { x: 374, y: groundY - 220, w: 562 },
      { x: 656, y: groundY - 430, w: 268 },
      { x: 1100, y: groundY - 460, w: 204 },
    ];

    // Ladder connecting platform #1 (top-left) to platform #2 (middle)
    this.ladders = [{ x: 381, y: groundY - 460, w: 50, h: 240 }];

    // End-of-game trigger — invisible, sits at the far (right) end of the
    // top-right platform (#4). Reaching it plays the win animation, stops
    // controls, and cuts the music.
    const winPlatform = this.platforms[3];
    this.winZone = {
      x: winPlatform.x + winPlatform.w - 90,
      y: winPlatform.y - 140,
      w: 90,
      h: 140,
    };

    const door = new Door(75, 519);
    door.onOpen = () => {
      this.inventory.addGrenade();
      Sfx.play("collect");
    };
    this.doors.push(door);
    this.container.addChild(door.container);

    // Door 2 — starts locked; unlocked via the keypad
    const door2Light = new DoorLight(43, 9);
    this.container.addChild(door2Light.container);

    const door2 = new Door(55, 52, {
      path: "/assets/door-02-ani-open.png",
      frameW: 84,
      frameH: 143,
      frameCount: 10,
      locked: true,
    });
    door2.onOpen = () => {
      this.medal.award();
      this.medalAcquired = true;
      Sfx.play("medal");
    };
    this.doors.push(door2);
    this.container.addChild(door2.container);

    this.keypad = new Keypad(888, 543);
    this.keypad.onUnlock = () => {
      door2.locked = false;
      door2Light.setUnlocked();
    };
    this.container.addChild(this.keypad.container);

    this.player = new Player(274, groundY, this.screenW, groundY);
    this.player.setPlatforms(this.platforms);
    this.player.setLadders(this.ladders);
    this.player.container.visible = false; // revealed once the intro's run-in reaches this spot
    this.lastPlayerX = 124;
    this.container.addChild(this.player.container);

    // Run-in sprite sits at gameplay depth, same as the player, so
    // foreground props occlude it correctly (see fadeContainer below).
    this.intro = new IntroSequence(this.screenW, this.screenH, groundY, 274);
    this.container.addChild(this.intro.container);

    const foreground1 = Sprite.from("/assets/foreground-static-01.png");
    foreground1.position.set(21, 555);
    this.container.addChild(foreground1);

    // Debug overlay always on top
    this.debugGfx = new Graphics();
    this.container.addChild(this.debugGfx);

    // HUD — inventory sits above everything
    this.inventory = new Inventory(this.screenW, this.screenH);
    this.container.addChild(this.inventory.container);

    this.medal = new Medal(48, this.screenH - 8);
    this.container.addChild(this.medal.container);

    this.musicToggle = new MusicToggleButton(this.screenW, music);
    this.container.addChild(this.musicToggle.container);

    // Intro's fade rect sits above everything — covers the whole scene during the fade
    this.container.addChild(this.intro.fadeContainer);

    // Death screen sits above absolutely everything, including the intro
    this.deathScreen = new DeathScreen(this.screenW, this.screenH);
    this.deathScreen.onFadeStart = () => {
      this.music.stop();
      Sfx.play("lose");
    };
    this.container.addChild(this.deathScreen.container);

    // Win screen — same layer as the death screen (mutually exclusive)
    this.winScreen = new WinScreen(this.screenW, this.screenH);
    this.winScreen.onReveal = (achievements) => {
      trackEvent("game_complete");
      if (achievements.medal && achievements.grenade && achievements.enemiesDown) {
        trackEvent("game_mastery");
      }
    };
    this.container.addChild(this.winScreen.container);
  }

  update(dt: number) {
    this.rain.update(dt);

    if (!this.introDone) {
      this.intro.update(dt);
      if (this.intro.hasControl) this.player.container.visible = true;
      if (this.intro.finished) {
        this.container.removeChild(
          this.intro.container,
          this.intro.fadeContainer,
        );
        this.introDone = true;
      }
    }

    // Toggle debug overlay
    if (Input.isJustPressed("Backquote")) this.debugMode = !this.debugMode;

    this.deathScreen.update(this.player.dead);
    this.winScreen.update(this.player.winComplete, {
      medal: this.medalAcquired,
      grenade: this.usedGrenade,
      enemiesDown: this.enemies.every((e) => e.dead),
    });

    if (this.intro.hasControl) {
      this.player.setHasGrenade(this.inventory.grenadeCount > 0);
      this.player.update(dt);

      // End-of-game trigger — reaching the far edge of the top-right platform
      // plays the win animation, cuts controls, and stops the music.
      if (
        !this.winTriggered &&
        !this.player.dead &&
        rectsOverlap(this.player.detectionZone(), this.winZone)
      ) {
        this.winTriggered = true;
        this.player.win();
        this.music.stop();
        Sfx.play("win");
      }

      // Door interactions
      if (
        !this.player.dead &&
        !this.player.won &&
        this.player.grounded &&
        Input.isAnyJustPressed("ArrowUp", "KeyW")
      ) {
        const px = this.player.container.x;
        const py = this.player.container.y;
        for (const d of this.doors) {
          const iz = d.interactionZone();
          if (
            px >= iz.x &&
            px <= iz.x + iz.w &&
            py >= iz.y &&
            py <= iz.y + iz.h
          ) {
            d.interact();
          }
        }

        if (rectsOverlap(this.player.detectionZone(), this.keypad.hitbox())) {
          this.keypad.interact();
        }
      }
    }

    // Before control is handed over (or once dead), pass off-screen coords so
    // enemies lose detection and just patrol/idle instead of reacting
    const playerX =
      !this.intro.hasControl || this.player.dead
        ? -9999
        : this.player.container.x;
    const playerY =
      !this.intro.hasControl || this.player.dead
        ? -9999
        : this.player.container.y;
    const playerMoving = Math.abs(playerX - this.lastPlayerX) > 0.1;
    this.lastPlayerX = playerX;

    // Update enemies (skip dead — they stay in the scene but do nothing)
    for (const e of this.enemies)
      if (!e.dead) e.update(playerX, playerY, playerMoving);

    // Remove dead enemies that have removeOnDeath set (e.g. drone)
    this.enemies = this.enemies.filter((e) => {
      if (e.dead && e.removeOnDeath) {
        this.container.removeChild(e.container);
        return false;
      }
      return true;
    });

    // Collect enemy shots
    for (const e of this.enemies)
      if (!e.dead) {
        for (const s of e.takePendingShots()) {
          const laser = new EnemyLaser(
            s.x,
            s.y,
            s.vx,
            s.vy ?? 0,
            s.color,
            s.coreColor,
          );
          this.lasers.push(laser);
          this.container.addChild(laser.container);
        }
      }

    // Player bullets — move, then check hits against enemy hitboxes
    for (const b of this.bullets) b.update(this.screenW, this.screenH);
    this.bullets = this.bullets.filter((b) => {
      if (b.dead) {
        this.container.removeChild(b.container);
        return false;
      }
      const hit = this.enemies.find(
        (e) => !e.dead && pointInRect(b.container.x, b.container.y, e.hitbox()),
      );
      if (hit) {
        hit.hit();
        b.dead = true;
        this.container.removeChild(b.container);
        return false;
      }
      return true;
    });

    // Dead enemies stay in the scene — no removal.

    // Spawn grenades — only if inventory has one
    for (const g of this.player.takePendingGrenades()) {
      if (this.inventory.useGrenade()) {
        const grenade = new GrenadeProjectile(g.x, g.y, g.facingLeft);
        this.grenades.push(grenade);
        this.container.addChild(grenade.container);
        this.usedGrenade = true;
      }
    }

    // Update grenades — physics then explosion on impact
    for (const g of this.grenades) g.update(this.groundY, this.platforms);
    this.grenades = this.grenades.filter((g) => {
      if (!g.dead) return true;
      this.container.removeChild(g.container);
      if (g.exploded) {
        const ex = new Explosion(g.container.x, g.container.y);
        this.explosions.push(ex);
        this.container.addChild(ex.container);
        Sfx.play("grenade");
        // Blast damage — hit enemies within radius
        const r = g.blastRadius();
        for (const e of this.enemies) {
          if (e.dead) continue;
          const hb = e.hitbox();
          const ex_x = g.container.x;
          const ex_y = g.container.y;
          const cx = hb.x + hb.w / 2;
          const cy = hb.y + hb.h / 2;
          if (Math.sqrt((cx - ex_x) ** 2 + (cy - ex_y) ** 2) <= r) {
            if (e.hitByExplosion) e.hitByExplosion();
            else e.hit();
          }
        }
      }
      return false;
    });

    // Clean up finished explosions
    this.explosions = this.explosions.filter((ex) => {
      if (!ex.dead) return true;
      this.container.removeChild(ex.container);
      return false;
    });

    // Spawn player bullets
    for (const b of this.player.takePendingBullets()) {
      const bullet = new Bullet(b.x, b.y, b.angle);
      this.bullets.push(bullet);
      this.container.addChild(bullet.container);
    }

    // Enemy lasers — move then check vs player hurtbox
    for (const l of this.lasers) l.update(this.screenW, this.screenH);
    this.lasers = this.lasers.filter((l) => {
      if (l.dead) {
        this.container.removeChild(l.container);
        return false;
      }
      if (!this.player.dead) {
        const hb = this.player.hurtbox();
        if (pointInRect(l.container.x, l.container.y, hb)) {
          this.player.hit();
          l.dead = true;
          this.container.removeChild(l.container);
          return false;
        }
      }
      return true;
    });

    // Debug overlay
    this.debugGfx.clear();
    if (this.debugMode) {
      this.debugGfx
        .moveTo(0, this.groundY)
        .lineTo(this.screenW, this.groundY)
        .stroke({ color: 0x00ff44, width: 1 });
      for (const p of this.platforms) {
        this.debugGfx
          .moveTo(p.x, p.y)
          .lineTo(p.x + p.w, p.y)
          .stroke({ color: 0x00ff44, width: 1 });
      }
      for (const l of this.ladders) {
        this.debugGfx
          .rect(l.x, l.y, l.w, l.h)
          .fill({ color: 0x00ffff, alpha: 0.15 })
          .stroke({ color: 0x00ffff, width: 1 });
      }
      for (const d of this.doors) {
        const iz = d.interactionZone();
        this.debugGfx
          .rect(iz.x, iz.y, iz.w, iz.h)
          .fill({ color: 0xff00ff, alpha: 0.15 })
          .stroke({ color: 0xff00ff, width: 1 });
      }
      {
        const khb = this.keypad.hitbox();
        this.debugGfx
          .rect(khb.x, khb.y, khb.w, khb.h)
          .fill({ color: 0xff00ff, alpha: 0.15 })
          .stroke({ color: 0xff00ff, width: 1 });
      }
      {
        const wz = this.winZone;
        this.debugGfx
          .rect(wz.x, wz.y, wz.w, wz.h)
          .fill({ color: 0x00ffaa, alpha: 0.15 })
          .stroke({ color: 0x00ffaa, width: 1 });
      }
      for (const e of this.enemies) {
        const dz = e.detectionZone();
        const hb = e.hitbox();
        // Detection zone — yellow
        this.debugGfx
          .rect(dz.x, dz.y, dz.w, dz.h)
          .fill({ color: 0xffff00, alpha: 0.1 })
          .stroke({ color: 0xffff00, width: 1 });
        // Hitbox — colour reflects enemy state
        const hbColor = e.hitboxColor ? e.hitboxColor() : 0xff0000;
        this.debugGfx
          .rect(hb.x, hb.y, hb.w, hb.h)
          .fill({ color: hbColor, alpha: 0.15 })
          .stroke({ color: hbColor, width: 1 });
      }
      // Player hurtbox — red
      if (!this.player.dead) {
        const phb = this.player.hurtbox();
        this.debugGfx
          .rect(phb.x, phb.y, phb.w, phb.h)
          .fill({ color: 0xff0000, alpha: 0.15 })
          .stroke({ color: 0xff0000, width: 1 });
        // Player detection zone — yellow
        const pdz = this.player.detectionZone();
        this.debugGfx
          .rect(pdz.x, pdz.y, pdz.w, pdz.h)
          .fill({ color: 0xffff00, alpha: 0.1 })
          .stroke({ color: 0xffff00, width: 1 });
      }
      // Grenade hitboxes — orange
      for (const g of this.grenades) {
        const ghb = g.hitbox();
        if (ghb) {
          this.debugGfx
            .rect(ghb.x, ghb.y, ghb.w, ghb.h)
            .fill({ color: 0xff8800, alpha: 0.4 })
            .stroke({ color: 0xff8800, width: 1 });
        }
      }
      // Explosion hitboxes — red-orange
      for (const ex of this.explosions) {
        const ehb = ex.hitbox();
        this.debugGfx
          .rect(ehb.x, ehb.y, ehb.w, ehb.h)
          .fill({ color: 0xff4400, alpha: 0.2 })
          .stroke({ color: 0xff4400, width: 1 });
      }
      // Player position crosshair — centred on hurtbox
      if (!this.player.dead) {
        const phb = this.player.hurtbox();
        const cx = phb.x + phb.w / 2;
        const cy = phb.y + phb.h / 2;
        this.debugGfx
          .moveTo(cx - 4, cy)
          .lineTo(cx + 4, cy)
          .moveTo(cx, cy - 4)
          .lineTo(cx, cy + 4)
          .stroke({ color: 0x00ff00, width: 1 });
      }
    }

    Input.flush();
  }
}
