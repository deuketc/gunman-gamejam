import { Container, Graphics, Sprite } from "pixi.js";

// The frame image has a dark inset track baked in — these are its bounds as
// a fraction of the frame's rendered size, measured against
// preloader-static.png, where the fill bar has to sit.
const TRACK_X_RATIO = 0.0824;
const TRACK_Y_RATIO = 0.2958;
const TRACK_W_RATIO = 0.8244;
const TRACK_H_RATIO = 0.3944;

export class Preloader {
  readonly container: Container;
  private barFill: Graphics;
  private barX: number;
  private barY: number;
  private barWidth: number;
  private barHeight: number;

  constructor(screenW: number, screenH: number) {
    this.container = new Container();

    const bg = new Graphics().rect(0, 0, screenW, screenH).fill(0x000000);
    this.container.addChild(bg);

    const frame = Sprite.from("/assets/preloader-static.png");
    frame.anchor.set(0.5);
    frame.position.set(screenW / 2, screenH / 2);
    this.container.addChild(frame);

    const frameX = screenW / 2 - frame.width / 2;
    const frameY = screenH / 2 - frame.height / 2;
    this.barX = frameX + frame.width * TRACK_X_RATIO;
    this.barY = frameY + frame.height * TRACK_Y_RATIO;
    this.barWidth = frame.width * TRACK_W_RATIO;
    this.barHeight = frame.height * TRACK_H_RATIO;

    this.barFill = new Graphics();
    this.container.addChild(this.barFill);

    this.setProgress(0);
  }

  setProgress(fraction: number) {
    const clamped = Math.max(0, Math.min(1, fraction));
    this.barFill.clear();
    if (clamped <= 0) return;
    this.barFill
      .rect(this.barX, this.barY, this.barWidth * clamped, this.barHeight)
      .fill(0x4dd8f0);
  }
}
