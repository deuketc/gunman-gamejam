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
    "/assets/tvman-ani-death.png",
    "/assets/player-ani-death.png",
    "/assets/player-ani-turn-around.png",
    "/assets/player-ani-jump-to-platform.png",
    "/assets/player-ani-pull-up-to-platform.png",
    "/assets/player-ani-fall-from-platform.png",
    "/assets/player-ani-jump-forward.png",
    "/assets/hood-ani-walk.png",
    "/assets/hood-ani-idle.png",
    "/assets/hood-ani-shoot.png",
    "/assets/hood-ani-death.png",
    "/assets/hood-ani-death-by-grenade.png",
    "/assets/hood-ani-stumble.png",
    "/assets/ninja-ani-idle-long.png",
    "/assets/ninja-ani-walk.png",
    "/assets/ninja-ani-attack.png",
    "/assets/ninja-ani-death.png",
    "/assets/ninja-ani-death-by-grenade.png",
    "/assets/ninja-ani-stumble.png",
    "/assets/drone-ani-flying.png",
    "/assets/drone-ani-explodes-left.png",
    "/assets/player-ani-ladder-climb.png",
    "/assets/player-ani-throw-grenade.png",
    "/assets/door-01-ani-open.png",
    "/assets/tvman-ani-death-by-grenade.png",
    "/assets/tvman-ani-stumble.png",
    "/assets/tvman-ani-stumble02.png",
    "/assets/tvman-ani-stumble03.png",
    "/assets/granade_inventory.png",
    "https://pixijs.com/assets/spritesheet/mc.json",
  ]);

  const game = new Game(app);
  game.start();
}

main();
