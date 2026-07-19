import { Container, Graphics } from "pixi.js";

const BAR_WIDTH_RATIO = 0.5;
const BAR_HEIGHT = 24;

export class Preloader {
  readonly container: Container;
  private barFill: Graphics;
  private barX: number;
  private barY: number;
  private barWidth: number;

  constructor(screenW: number, screenH: number) {
    this.container = new Container();

    const bg = new Graphics().rect(0, 0, screenW, screenH).fill(0x000000);
    this.container.addChild(bg);

    this.barWidth = screenW * BAR_WIDTH_RATIO;
    this.barX = (screenW - this.barWidth) / 2;
    this.barY = screenH / 2 - BAR_HEIGHT / 2;

    const barBg = new Graphics()
      .rect(this.barX, this.barY, this.barWidth, BAR_HEIGHT)
      .fill(0x222222);
    this.container.addChild(barBg);

    this.barFill = new Graphics();
    this.container.addChild(this.barFill);

    this.setProgress(0);
  }

  setProgress(fraction: number) {
    const clamped = Math.max(0, Math.min(1, fraction));
    this.barFill.clear();
    if (clamped <= 0) return;
    this.barFill
      .rect(this.barX, this.barY, this.barWidth * clamped, BAR_HEIGHT)
      .fill(0x4caf50);
  }
}
