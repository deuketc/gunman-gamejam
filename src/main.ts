import "./style.css";
import { Application, Assets } from "pixi.js";
import { Game } from "./Game";

async function main() {
  const app = new Application();
  await app.init({
    width: 800,
    height: 600,
    backgroundColor: 0x050510,
    antialias: true,
  });

  document.body.appendChild(app.canvas);

  await Assets.load([
    '/assets/gunman-stand-left-right.png',
    '/assets/gunman-ani-stand-shutgun-walk-left.png',
    '/assets/gunman-ani-stand-shutgun-walk-right.png',
    '/assets/gunman-ani-stand-shutgun-shoot-left.png',
    '/assets/gunman-ani-stand-shutgun-shoot-right.png',
    '/assets/gunman-ani-stand-shutgun-idle-front.png',
  ]);

  const game = new Game(app);
  game.start();
}

main();
