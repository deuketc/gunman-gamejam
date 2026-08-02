import { Container, Graphics, Sprite, Text } from "pixi.js";

export class StartScreen {
  readonly container: Container;
  onStart?: () => void;

  constructor(screenW: number, screenH: number) {
    this.container = new Container();

    const bg = new Graphics().rect(0, 0, screenW, screenH).fill(0x000000);
    this.container.addChild(bg);

    const button = Sprite.from("/assets/start-button-static.png");
    button.anchor.set(0.5);
    button.position.set(screenW / 2, screenH / 2);
    button.eventMode = "static";
    button.cursor = "pointer";
    button.on("pointertap", () => this.onStart?.());
    this.container.addChild(button);

    const buttonTopY = screenH / 2 - button.height / 2;

    const title = new Text({
      text: "GUNMAN GAMEJAM",
      style: { fill: 0xdcf0ff, fontSize: 40, fontFamily: '"Press Start 2P"' },
    });
    title.anchor.set(0.5);
    title.position.set(screenW / 2, buttonTopY - 90);
    this.container.addChild(title);

    const subtitle = new Text({
      text: "64bit",
      style: { fill: 0x8fb4c8, fontSize: 16, fontFamily: '"Press Start 2P"' },
    });
    subtitle.anchor.set(0.5);
    subtitle.position.set(screenW / 2, buttonTopY - 40);
    this.container.addChild(subtitle);

    const label = new Text({
      text: "START",
      style: {
        fill: 0x8fe8ff,
        fontSize: Math.round(button.width * 0.08),
        fontFamily: '"Press Start 2P"',
      },
    });
    label.anchor.set(0.5);
    label.position.set(screenW / 2, screenH / 2);
    label.eventMode = "none"; // clicks pass through to the button beneath
    this.container.addChild(label);

    const hint = new Text({
      text: 'Press "F11" for fullscreen mode',
      style: { fill: 0x8fa0aa, fontSize: 10, fontFamily: '"Press Start 2P"' },
    });
    hint.anchor.set(0.5);
    hint.position.set(screenW / 2, screenH / 2 + button.height / 2 + 70);
    this.container.addChild(hint);
  }
}
