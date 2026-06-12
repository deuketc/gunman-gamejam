# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start Vite dev server (hot reload)
npm run build      # tsc + vite build
npx tsc --noEmit   # type-check only (no output files)
```

No test runner is configured.

## Architecture

**Stack:** PixiJS v8 + TypeScript, bundled with Vite. Canvas is 1280×720 rendered internally, scaled to fill the viewport via CSS (`width: min(100vw, calc(100vh * 16/9))`).

**Boot flow:** `main.ts` → preloads every asset with `Assets.load([...])` → creates `Game` → `Game` creates `GameScene` and registers a ticker callback that calls `scene.update(dt)` every frame.

**All assets must be preloaded in `main.ts`** before any entity constructor runs. Adding a new sprite requires adding its path to the `Assets.load` array there.

### Entity patterns

`GameScene` owns all live entities (player, enemies, bullets, lasers, grenades, explosions, doors, inventory). It handles all cross-entity collision detection each tick.

**Pending-shot / pending-bullet / pending-grenade drain pattern:** entities queue outgoing projectiles internally and expose a `takePending*()` method. GameScene drains these each tick, constructs the projectile objects, and adds them to the scene.

**`EnemyBase` interface** (`src/entities/enemies/EnemyBase.ts`) is what all enemies must implement: `hit()`, `hitByExplosion?()`, `hitbox()`, `detectionZone()`, `update()`, `takePendingShots()`. The optional `removeOnDeath` flag tells GameScene to remove the container after death.

**`Input.flush()`** must be called at the end of `GameScene.update()` to clear `justPressed` state. All input is read via the `Input` singleton.

### Sprite / animation conventions

**`cropFrames(sheet, startFrame, count, fw, fh)`** is a local helper in both `Player.ts` and `EnemyStatic.ts` that slices a horizontal spritesheet into `Texture[]` using `Rectangle` crops.

**Anchor:** ground-based sprites use `anchor.set(0.5, 1)` (bottom-centre). The drone uses `anchor.set(0.5, 0.5)`.

**Y-offset pattern for 128px sprites:** because the character doesn't fill the full 128px frame height, `sprite.position.set(0, offset)` (typically 7) pushes the sprite down so feet align with `container.y`. This must be set in each relevant `setState` branch — the default reset at the top of `setState` is `position.set(0, 0)`.

**Facing convention:**
- Old sprites (64px) are drawn facing **left** → `scale.x = facingLeft ? 1 : -1`
- New/replacement sprites (128px) are drawn facing **right** → `scale.x = facingLeft ? -1 : 1`

### Player state machine

`Player` uses a `PlayerState` string-union type. `setState(next)` handles all sprite/animation transitions. Key points:
- Walk uses `loop = false` + `onComplete` restart from `WALK_LOOP_START = 3` (startup frames 0–2 play once).
- Shoot cycle plays frames 0–18 (fire at frame 5), pauses at frame 18 (`shoot-ready`), then frames 19–23 on timeout (`shoot-lower`). Re-fire from ready spawns the bullet immediately and jumps to frame 5.
- `onFrameChange` handles bullet spawn (shoot), grenade spawn (throw frame 15), physics launch (jumps), and ladder entry freeze.

### EnemyStatic config system

`EnemyStaticConfig` drives all behaviour from data. Per-sprite frame-size and facing overrides (`idleFrameW/H`, `walkFrameW/H`, `raiseFrameW/H`, `stumbleFrameW/H`, `*FacingRight`) fall back to the base `frameW/frameH` if omitted. The base `frameW/frameH` is used for `hitbox()` and `detectionZone()` dimensions.

**ENEMY_V1** is fully upgraded to 128px right-facing sprites. **ENEMY_V2** remains on the original 64px left-facing sprites.

**Enrage mechanic:** on first hit, `enraged = true` and `detectionZone()` returns a 4000×4000 rect. After a stumble animation, `resumePatrol()` checks `enraged` and skips straight to `setState("alert")` to avoid a blank-sprite gap.

### Scene layout

`groundY = screenH - 58`. All platform and ladder Y values are expressed as `groundY - N`. The single ladder connects platform #1 (top-left) to platform #2 (middle). Debug overlay toggled with the backtick key.
