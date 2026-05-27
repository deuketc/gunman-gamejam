import { Application, Container, Graphics, Sprite } from "pixi.js";
import { Input } from "../input/Input";
import { Player } from "../entities/Player";
import type { Platform } from "../entities/Platform";
import { Bullet } from "../entities/projectiles/Bullet";
import type { EnemyBase, Rect } from "../entities/enemies/EnemyBase";
import { EnemyStatic, ENEMY_V1, ENEMY_V2 } from "../entities/enemies/EnemyStatic";
import { EnemyLaser } from "../entities/projectiles/EnemyLaser";

function pointInRect(px: number, py: number, r: Rect): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export class GameScene {
  readonly container: Container;
  private player: Player;
  private enemies: EnemyBase[] = [];
  private bullets: Bullet[] = [];
  private lasers: EnemyLaser[] = [];
  private screenW: number;
  private screenH: number;
  private lastPlayerX = 0;
  private platforms: Platform[] = [];
  private debugMode = false;
  private debugGfx: Graphics;

  constructor(app: Application) {
    this.screenW = app.screen.width;
    this.screenH = app.screen.height;
    const groundY = this.screenH - 42;
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

    this.platforms = [
      { x: 0, y: groundY - 230, w: 228 },
      { x: 207, y: groundY - 110, w: 250 },
      { x: 316, y: groundY - 215, w: 134 },
      { x: 538, y: groundY - 230, w: 102 },
    ];

    this.player = new Player(100, groundY, this.screenW, groundY);
    this.player.setPlatforms(this.platforms);
    this.lastPlayerX = 50;
    this.container.addChild(this.player.container);

    // Debug overlay always on top
    this.debugGfx = new Graphics();
    this.container.addChild(this.debugGfx);
  }

  update(dt: number) {
    // Toggle debug overlay
    if (Input.isJustPressed("Backquote")) this.debugMode = !this.debugMode;

    this.player.update(dt);

    // When dead, pass off-screen coords so enemies lose detection and resume patrol
    const playerX = this.player.dead ? -9999 : this.player.container.x;
    const playerY = this.player.dead ? -9999 : this.player.container.y;
    const playerMoving = Math.abs(playerX - this.lastPlayerX) > 0.1;
    this.lastPlayerX = playerX;

    // Update enemies (skip dead — they stay in the scene but do nothing)
    for (const e of this.enemies)
      if (!e.dead) e.update(playerX, playerY, playerMoving);

    // Collect enemy shots
    for (const e of this.enemies)
      if (!e.dead) {
        for (const s of e.takePendingShots()) {
          const laser = new EnemyLaser(s.x, s.y, s.vx, s.color, s.coreColor);
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
      // Player position crosshair
      this.debugGfx
        .moveTo(playerX - 4, playerY)
        .lineTo(playerX + 4, playerY)
        .moveTo(playerX, playerY - 4)
        .lineTo(playerX, playerY + 4)
        .stroke({ color: 0x00ff00, width: 1 });
    }

    Input.flush();
  }
}
