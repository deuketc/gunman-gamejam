import { AnimatedSprite, Assets, Container, Graphics, Rectangle, Text, Texture } from "pixi.js";

const REVEAL_DELAY_TICKS = 3 * 120; // 3s after the win pose settles before the fade begins (fixed 120Hz logic rate — see Game.ts)
const FADE_TICKS = 1 * 120; // 1s fade duration
const FADE_ALPHA = 0.7;

const DANCE_PATH = "/assets/tvman-ani-dance.png";
const DANCE_FRAME_W = 128;
const DANCE_FRAME_H = 128;
const DANCE_FRAME_COUNT = 29;
const DANCE_ANIM_SPEED = 0.25;

function cropFrames(sheet: Texture, count: number, fw: number, fh: number): Texture[] {
  return Array.from(
    { length: count },
    (_, i) =>
      new Texture({ source: sheet.source, frame: new Rectangle(i * fw, 0, fw, fh) }),
  );
}

export interface Achievements {
  medal: boolean;
  grenade: boolean;
  enemiesDown: boolean;
}

type Phase = "waiting" | "fading" | "done";

function checklistLine(label: string, achieved: boolean): string {
  return `[${achieved ? "X" : " "}] ${label}`;
}

// Shown once the win pose finishes playing: waits a beat, fades the screen to
// ~70% black, then reveals a "WELL DONE!" title, an achievement checklist,
// and a restart prompt. GameScene drives this by calling update() every tick
// with the current win state and achievement flags.
export class WinScreen {
  readonly container: Container;
  private overlay: Graphics;
  private title: Text;
  private medalLine: Text;
  private grenadeLine: Text;
  private enemiesLine: Text;
  private restart: Text;
  private danceSprite: AnimatedSprite;
  private phase: Phase = "waiting";
  private timer = 0;

  constructor(screenW: number, screenH: number) {
    this.container = new Container();

    this.overlay = new Graphics().rect(0, 0, screenW, screenH).fill(0x000000);
    this.overlay.alpha = 0;
    this.container.addChild(this.overlay);

    const cx = screenW / 2;

    this.title = new Text({
      text: "WELL DONE!",
      style: { fill: 0xffffff, fontSize: 28, fontFamily: '"Press Start 2P"' },
    });
    this.title.anchor.set(0.5);
    this.title.position.set(cx, screenH / 2 - 110);
    this.title.visible = false;
    this.container.addChild(this.title);

    const lineStyle = {
      fill: 0xffffff,
      fontSize: 14,
      fontFamily: '"Press Start 2P"',
    };

    this.medalLine = new Text({ text: "", style: lineStyle });
    this.medalLine.anchor.set(0.5);
    this.medalLine.position.set(cx, screenH / 2 - 40);
    this.medalLine.visible = false;
    this.container.addChild(this.medalLine);

    this.grenadeLine = new Text({ text: "", style: lineStyle });
    this.grenadeLine.anchor.set(0.5);
    this.grenadeLine.position.set(cx, screenH / 2 - 10);
    this.grenadeLine.visible = false;
    this.container.addChild(this.grenadeLine);

    this.enemiesLine = new Text({ text: "", style: lineStyle });
    this.enemiesLine.anchor.set(0.5);
    this.enemiesLine.position.set(cx, screenH / 2 + 20);
    this.enemiesLine.visible = false;
    this.container.addChild(this.enemiesLine);

    this.restart = new Text({
      text: "PRESS F5 TO RESTART",
      style: { fill: 0xffffff, fontSize: 16, fontFamily: '"Press Start 2P"' },
    });
    this.restart.anchor.set(0.5);
    this.restart.position.set(cx, screenH / 2 + 90);
    this.restart.visible = false;
    this.container.addChild(this.restart);

    const danceSheet = Assets.get<Texture>(DANCE_PATH);
    const danceFrames = cropFrames(danceSheet, DANCE_FRAME_COUNT, DANCE_FRAME_W, DANCE_FRAME_H);
    this.danceSprite = new AnimatedSprite(danceFrames);
    this.danceSprite.anchor.set(0.5, 1);
    this.danceSprite.animationSpeed = DANCE_ANIM_SPEED;
    this.danceSprite.loop = true;
    this.danceSprite.position.set(cx, screenH / 2 + 90 + 160);
    this.danceSprite.visible = false;
    this.danceSprite.play();
    this.container.addChild(this.danceSprite);
  }

  update(winAnimDone: boolean, achievements: Achievements) {
    if (!winAnimDone || this.phase === "done") return;
    this.timer++;

    if (this.phase === "waiting") {
      if (this.timer >= REVEAL_DELAY_TICKS) {
        this.phase = "fading";
        this.timer = 0;
      }
      return;
    }

    if (this.phase === "fading") {
      const t = Math.min(1, this.timer / FADE_TICKS);
      this.overlay.alpha = t * FADE_ALPHA;
      if (t >= 1) {
        this.medalLine.text = checklistLine("MEDAL ACQUIRED?", achievements.medal);
        this.grenadeLine.text = checklistLine("USED GRENADE?", achievements.grenade);
        this.enemiesLine.text = checklistLine(
          "DISABLED ALL ENEMIES?",
          achievements.enemiesDown,
        );

        const allDone =
          achievements.medal && achievements.grenade && achievements.enemiesDown;

        this.title.text = allDone ? "MASTERY" : "WELL DONE!";
        this.title.visible = true;
        this.medalLine.visible = true;
        this.grenadeLine.visible = true;
        this.enemiesLine.visible = true;
        this.restart.visible = true;
        this.danceSprite.visible = allDone;
        this.phase = "done";
      }
    }
  }
}
