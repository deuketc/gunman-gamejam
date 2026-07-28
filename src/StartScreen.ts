import { Container, Graphics, Text } from "pixi.js";

const BUTTON_WIDTH = 220;
const BUTTON_HEIGHT = 64;

export class StartScreen {
  readonly container: Container;
  onStart?: () => void;

  constructor(screenW: number, screenH: number) {
    this.container = new Container();

    const bg = new Graphics().rect(0, 0, screenW, screenH).fill(0x000000);
    this.container.addChild(bg);

    const button = new Graphics()
      .rect(-BUTTON_WIDTH / 2, -BUTTON_HEIGHT / 2, BUTTON_WIDTH, BUTTON_HEIGHT)
      .fill(0x2a7a2a);
    button.position.set(screenW / 2, screenH / 2);
    button.eventMode = "static";
    button.cursor = "pointer";
    button.on("pointertap", () => this.onStart?.());
    this.container.addChild(button);

    const label = new Text({
      text: "START",
      style: { fill: 0xffffff, fontSize: 18, fontFamily: '"Press Start 2P"' },
    });
    label.anchor.set(0.5);
    label.position.set(screenW / 2, screenH / 2);
    label.eventMode = "none"; // clicks pass through to the button beneath
    this.container.addChild(label);
  }
}
