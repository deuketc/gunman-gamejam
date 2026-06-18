import "./style.css";
import { Application, Assets } from "pixi.js";
import { Game } from "./Game";

async function main() {
  const app = new Application();
  await app.init({
    width: 1280,
    height: 720,
    backgroundColor: 0x050510,
    antialias: true,
    roundPixels: true,
  });

  document.body.appendChild(app.canvas);

  await Assets.load([
    "/assets/background_01_720.png",
    "/assets/player-static-south-east.png",
    "/assets/player-ani-walk.png",
    "/assets/player-ani-shoot.png",
    "/assets/player-ani-idle.png",
    "/assets/enemy-static-stand-facing-with-gun.png",
    "/assets/tvman-ani-walk.png",
    "/assets/tvman-ani-idle.png",
    "/assets/tvman-ani-shoot.png",
    "/assets/enemy-ani-stand-facing-idle-death-from-bullet.png",
    "/assets/gunman-ani-stand-death-right.png",
    "/assets/player-ani-turn-around.png",
    "/assets/player-ani-jump-to-platform.png",
    "/assets/gunman-ani-stand-shutgun-pull-up-to-platform-right.png",
    "/assets/gunman-ani-fall-shutgun-right.png",
    "/assets/player-ani-jump-forward.png",
    "/assets/hood-ani-walk.png",
    "/assets/hood-ani-idle.png",
    "/assets/hood-ani-shoot.png",
    "/assets/hood-ani-death.png",
    "/assets/hood-ani-stumble.png",
    "/assets/ninja-ani-idle-long.png",
    "/assets/ninja-ani-walk.png",
    "/assets/ninja-ani-attack.png",
    "/assets/ninja-ani-death.png",
    "/assets/drone-ani-flying.png",
    "/assets/drone-ani-explodes-left.png",
    "/assets/gunman-ani-ladder.png",
    "/assets/gunman-002-ani-right-throw-grenade.png",
    "/assets/door-ground-ani-open-.png",
    "/assets/enemy-ani-stand-facing-granade-explotion.png",
    "/assets/soldier-ani-shot-stumble.png",
    "/assets/soldier-ani-shot-stumble-02.png",
    "/assets/soldier-ani-shot-stumble-03.png",
    "/assets/granade_inventory.png",
    "https://pixijs.com/assets/spritesheet/mc.json",
  ]);

  const game = new Game(app);
  game.start();
}

main();
