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
} from "../entities/enemies/EnemyStatic";
import { EnemyDrone } from "../entities/enemies/EnemyDrone";
import { EnemyLaser } from "../entities/projectiles/EnemyLaser";
import { Door } from "../entities/interactables/Door";
import { Inventory } from "../entities/Inventory";
import { GrenadeProjectile } from "../entities/projectiles/GrenadeProjectile";
import { Explosion } from "../entities/Explosion";

function pointInRect(px: number, py: number, r: Rect): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
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
  private inventory!: Inventory;
  private grenades: GrenadeProjectile[] = [];
  private explosions: Explosion[] = [];
  private debugMode = false;
  private debugGfx: Graphics;

  constructor(app: Application) {
    this.screenW = app.screen.width;
    this.screenH = app.screen.height;
    this.groundY = this.screenH - 42;
    const groundY = this.groundY;
    this.container = new Container();

    const bg = Sprite.from("/assets/background_01.png");
    bg.width = this.screenW;
    bg.height = this.screenH;
    this.container.addChild(bg);

    const ground = new Graphics();
    ground.moveTo(0, groundY).lineTo(this.screenW, groundY);
    this.container.addChild(ground);

    const enemy1 = new EnemyStatic(this.screenW - 50, groundY, ENEMY_V1);
    this.enemies.push(enemy1);
    this.container.addChild(enemy1.container);

    const enemy2 = new EnemyStatic(207 + 180, groundY - 109, ENEMY_V2);
    this.enemies.push(enemy2);
    this.container.addChild(enemy2.container);

    const drone = new EnemyDrone(this.screenW / 2 + 110, 42);
    this.enemies.push(drone);
    this.container.addChild(drone.container);

    this.platforms = [
      { x: 0, y: groundY - 230, w: 228 },
      { x: 175, y: groundY - 110, w: 281 },
      { x: 316, y: groundY - 215, w: 134 },
      { x: 538, y: groundY - 230, w: 102 },
    ];

    // Ladder connecting platform #1 (top-left) to platform #2 (middle)
    this.ladders = [{ x: 181, y: groundY - 230, w: 20, h: 120 }];

    const door = new Door(15, 214);
    door.onOpen = () => this.inventory.addGrenade();
    this.doors.push(door);
    this.container.addChild(door.container);

    this.player = new Player(100, groundY, this.screenW, groundY);
    this.player.setPlatforms(this.platforms);
    this.player.setLadders(this.ladders);
    this.lastPlayerX = 50;
    this.container.addChild(this.player.container);

    // Debug overlay always on top
    this.debugGfx = new Graphics();
    this.container.addChild(this.debugGfx);

    // HUD — inventory sits above everything
    this.inventory = new Inventory(this.screenW, this.screenH);
    this.container.addChild(this.inventory.container);
  }

  update(dt: number) {
    // Toggle debug overlay
    if (Input.isJustPressed("Backquote")) this.debugMode = !this.debugMode;

    this.player.update(dt);

    // Door interactions
    if (!this.player.dead && this.player.grounded && Input.isAnyJustPressed("ArrowUp", "KeyW")) {
      const px = this.player.container.x;
      const py = this.player.container.y;
      for (const d of this.doors) {
        const iz = d.interactionZone();
        if (px >= iz.x && px <= iz.x + iz.w && py >= iz.y && py <= iz.y + iz.h) {
          d.interact();
        }
      }
    }

    // When dead, pass off-screen coords so enemies lose detection and resume patrol
    const playerX = this.player.dead ? -9999 : this.player.container.x;
    const playerY = this.player.dead ? -9999 : this.player.container.y;
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
      }
    }

    // Update grenades — physics then explosion on impact
    for (const g of this.grenades) g.update(this.groundY, this.platforms);

    // Grenade contact with enemies while in flight
    for (const g of this.grenades) {
      if (g.dead) continue;
      const ghb = g.hitbox();
      if (!ghb) continue;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (rectsOverlap(ghb, e.hitbox())) {
          if (e.hitByExplosion) e.hitByExplosion();
          else e.hit();
          g.detonateNow();
          break;
        }
      }
    }
    this.grenades = this.grenades.filter((g) => {
      if (!g.dead) return true;
      this.container.removeChild(g.container);
      if (g.exploded) {
        const ex = new Explosion(g.container.x, g.container.y);
        this.explosions.push(ex);
        this.container.addChild(ex.container);
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
      for (const e of this.enemies) {
        const dz = e.detectionZone();
        const hb = e.hitbox();
        // Detection zone — yellow
        this.debugGfx
          .rect(dz.x, dz.y, dz.w, dz.h)
          .fill({ color: 0xffff00, alpha: 0.1 })
          .stroke({ color: 0xffff00, width: 1 });
        // Hitbox — red
        this.debugGfx
          .rect(hb.x, hb.y, hb.w, hb.h)
          .fill({ color: 0xff0000, alpha: 0.15 })
          .stroke({ color: 0xff0000, width: 1 });
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
