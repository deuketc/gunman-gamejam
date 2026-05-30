import { AnimatedSprite, Assets, Container, Rectangle, Texture } from "pixi.js";

const INV_PATH       = "/assets/granade_inventory.png";
const INV_FRAME_SIZE = 16;

export class Inventory {
  readonly container: Container;
  private grenadeSprite: AnimatedSprite;
  private grenades = 0;

  constructor(screenW: number, screenH: number) {
    this.container = new Container();

    const sheet = Assets.get<Texture>(INV_PATH);
    const frames = [0, 1].map(
      (i) =>
        new Texture({
          source: sheet.source,
          frame:  new Rectangle(i * INV_FRAME_SIZE, 0, INV_FRAME_SIZE, INV_FRAME_SIZE),
        }),
    );

    this.grenadeSprite = new AnimatedSprite(frames);
    this.grenadeSprite.anchor.set(0, 1);
    this.grenadeSprite.loop = false;
    this.grenadeSprite.currentFrame = 0; // frame 0 = empty

    this.container.addChild(this.grenadeSprite);
    this.container.position.set(8, screenH - 8);

    void screenW; // reserved for future multi-slot layout
  }

  addGrenade() {
    this.grenades++;
    this.grenadeSprite.currentFrame = 1;
  }

  useGrenade(): boolean {
    if (this.grenades <= 0) return false;
    this.grenades--;
    this.grenadeSprite.currentFrame = this.grenades > 0 ? 1 : 0;
    return true;
  }

  get grenadeCount(): number { return this.grenades; }
}
