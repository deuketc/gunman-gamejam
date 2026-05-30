import "./style.css";
import { Application, Assets } from "pixi.js";
import { Game } from "./Game";

async function main() {
  const app = new Application();
  await app.init({
    width: 640,
    height: 360,
    backgroundColor: 0x050510,
    antialias: true,
  });

  document.body.appendChild(app.canvas);

  await Assets.load([
    "/assets/background_01.png",
    "/assets/gunman-stand-left-right.png",
    "/assets/gunman-ani-stand-shutgun-walk-right.png",
    "/assets/gunman-ani-stand-shutgun-shoot-right.png",
    "/assets/gunman-ani-stand-shutgun-idle-right.png",
    "/assets/enemy-static-stand-facing-with-gun.png",
    "/assets/enemy-ani-walk-with-gun-left.png",
    "/assets/enemy-ani-stand-facing-idle.png",
    "/assets/enemy-ani-stand-facing-raise-gun.png",
    "/assets/enemy-ani-stand-facing-idle-death-from-bullet.png",
    "/assets/gunman-ani-stand-death-right.png",
    "/assets/gunman-ani-stand-shutgun-turn-around-right.png",
    "/assets/gunman-ani-stand-shutgun-jump-to-platform-right.png",
    "/assets/gunman-ani-stand-shutgun-pull-up-to-platform-right.png",
    "/assets/gunman-ani-fall-shutgun-right.png",
    "/assets/gunman-ani-right-jump-long.png",
    "/assets/enemy-ani-ver2-walk.png",
    "/assets/enemy-ani-ver2-idle.png",
    "/assets/enemy-ani-ver2-shoot.png",
    "/assets/enemy-ani-ver2-death.png",
    "/assets/drone-ani-flying-left.png",
    "/assets/drone-ani-explodes-left.png",
    "/assets/gunman-ani-ladder.png",
    "/assets/gunman-002-ani-right-throw-grenade.png",
    "/assets/door-ground-ani-open-.png",
    "/assets/enemy-ani-stand-facing-granade-explotion.png",
    "/assets/granade_inventory.png",
    "https://pixijs.com/assets/spritesheet/mc.json",
  ]);

  const game = new Game(app);
  game.start();
}

main();
