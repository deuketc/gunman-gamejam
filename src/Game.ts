import { Application } from 'pixi.js';
import { GameScene } from './scenes/GameScene';

export class Game {
  private app: Application;
  private scene: GameScene;

  constructor(app: Application) {
    this.app = app;
    this.scene = new GameScene(app);
  }

  start() {
    this.app.stage.addChild(this.scene.container);
    this.app.ticker.add((ticker) => {
      this.scene.update(ticker.deltaTime);
    });
  }
}
