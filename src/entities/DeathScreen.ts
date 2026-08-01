import { Container, Graphics, Sprite, Text, Assets, Texture } from "pixi.js";

const DEATH_DELAY_TICKS = 3 * 120; // 3s after death before the fade begins (fixed 120Hz logic rate — see Game.ts)
const FADE_TICKS = 1 * 120; // 1s fade duration
const FADE_ALPHA = 0.7;

const SKULL_PATH = "/assets/skull.png";

type Phase = "waiting" | "fading" | "done";

// Shown after the player dies: waits a beat, fades the screen to ~70% black,
// then reveals a skull icon and a restart prompt. GameScene drives this by
// calling update(player.dead) every tick — there's no in-app restart, so
// once triggered this just sits there waiting for the player to hit F5.
export class DeathScreen {
  readonly container: Container;
  onFadeStart?: () => void;
  private overlay: Graphics;
  private skull: Sprite;
  private label: Text;
  private phase: Phase = "waiting";
  private timer = 0;

  constructor(screenW: number, screenH: number) {
    this.container = new Container();

    this.overlay = new Graphics().rect(0, 0, screenW, screenH).fill(0x000000);
    this.overlay.alpha = 0;
    this.container.addChild(this.overlay);

    this.skull = new Sprite(Assets.get<Texture>(SKULL_PATH));
    this.skull.anchor.set(0.5);
    this.skull.position.set(screenW / 2, screenH / 2 - 30);
    this.skull.visible = false;
    this.container.addChild(this.skull);

    this.label = new Text({
      text: "F5 to restart",
      style: { fill: 0xffffff, fontSize: 16, fontFamily: '"Press Start 2P"' },
    });
    this.label.anchor.set(0.5);
    this.label.position.set(screenW / 2, screenH / 2 + 30);
    this.label.visible = false;
    this.container.addChild(this.label);
  }

  update(playerDead: boolean) {
    if (!playerDead || this.phase === "done") return;
    this.timer++;

    if (this.phase === "waiting") {
      if (this.timer >= DEATH_DELAY_TICKS) {
        this.phase = "fading";
        this.timer = 0;
        this.onFadeStart?.();
      }
      return;
    }

    if (this.phase === "fading") {
      const t = Math.min(1, this.timer / FADE_TICKS);
      this.overlay.alpha = t * FADE_ALPHA;
      if (t >= 1) {
        this.skull.visible = true;
        this.label.visible = true;
        this.phase = "done";
      }
    }
  }
}
