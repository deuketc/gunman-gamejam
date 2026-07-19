import { AnimatedSprite, Assets, Container, Rectangle, Texture } from "pixi.js";
import { MusicPlayer } from "../audio/MusicPlayer";

const BUTTON_PATH = "/assets/music-toggle.png";
const FRAME_SIZE = 32; // adjust to match the actual spritesheet frame size

export class MusicToggleButton {
  readonly container: Container;
  private sprite: AnimatedSprite;
  private music: MusicPlayer;

  constructor(screenW: number, music: MusicPlayer) {
    this.music = music;
    this.container = new Container();

    const sheet = Assets.get<Texture>(BUTTON_PATH);
    const frames = [0, 1].map(
      (i) =>
        new Texture({
          source: sheet.source,
          frame: new Rectangle(i * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE),
        }),
    );

    this.sprite = new AnimatedSprite(frames);
    this.sprite.anchor.set(1, 0);
    this.sprite.loop = false;
    this.sprite.currentFrame = 0; // frame 0 = music on, frame 1 = muted

    this.sprite.eventMode = "static";
    this.sprite.cursor = "pointer";
    this.sprite.on("pointertap", () => this.toggle());

    this.container.addChild(this.sprite);
    this.container.position.set(screenW - 8, 8);
  }

  private toggle() {
    if (this.music.isPaused) {
      this.music.resume();
    } else {
      this.music.pause();
    }
    this.sprite.currentFrame = this.music.isPaused ? 1 : 0;
  }
}
