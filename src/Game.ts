import { Application } from 'pixi.js';
import { GameScene } from './scenes/GameScene';
import type { MusicPlayer } from './audio/MusicPlayer';

// Gameplay speeds/timers were tuned per-tick against a ~120Hz display, not
// scaled by elapsed time. Stepping the simulation at a fixed 120Hz here
// (independent of the display's actual refresh rate) reproduces that same
// feel on every monitor instead of speeding up/slowing down with refresh rate.
const LOGIC_HZ = 120;
const LOGIC_STEP_MS = 1000 / LOGIC_HZ;
const MAX_STEPS_PER_FRAME = 5; // avoid a spiral of death after a lag spike
// Backgrounded tabs throttle/pause requestAnimationFrame, so elapsedMS can
// balloon to tens of seconds the moment the tab regains focus. Clamping it
// discards that backlog instead of queuing it up to fast-forward through.
const MAX_FRAME_MS = LOGIC_STEP_MS * MAX_STEPS_PER_FRAME;

export class Game {
  private app: Application;
  private scene: GameScene;
  private accumulatorMs = 0;

  constructor(app: Application, music: MusicPlayer) {
    this.app = app;
    this.scene = new GameScene(app, music);
  }

  start() {
    this.app.stage.addChild(this.scene.container);
    this.app.ticker.add((ticker) => {
      this.accumulatorMs += Math.min(ticker.elapsedMS, MAX_FRAME_MS);
      let steps = 0;
      while (this.accumulatorMs >= LOGIC_STEP_MS && steps < MAX_STEPS_PER_FRAME) {
        this.scene.update(1);
        this.accumulatorMs -= LOGIC_STEP_MS;
        steps++;
      }
    });
  }
}
