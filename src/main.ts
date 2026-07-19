import "./style.css";
import { Application, Assets } from "pixi.js";
import { Game } from "./Game";
import { MusicPlayer } from "./audio/MusicPlayer";
import { Sfx } from "./audio/Sfx";

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
    "/assets/music-toggle.png",
    "https://pixijs.com/assets/spritesheet/mc.json",
  ]);

  await Sfx.load({
    gunshot: "/assets/sfx/gunshot.wav",
    grenade: "/assets/sfx/grenade.wav",
    laser: "/assets/sfx/laser.wav",
    slice: "/assets/sfx/slice.wav",
    pistol: "/assets/sfx/pistol.wav",
    laser2: "/assets/sfx/laser2.wav",
    explosion1: "/assets/sfx/explosion1.wav",
    hit1: "/assets/sfx/hit1.wav",
    collect: "/assets/sfx/collect.wav",
    landing: "/assets/sfx/landing.wav",
    death1: "/assets/sfx/death1.wav",
    death2: "/assets/sfx/death2.wav",
    death3: "/assets/sfx/death3.wav",
    jump: "/assets/sfx/jump.wav",
    opendoor: "/assets/sfx/opendoor.wav",
    deathplayer: "/assets/sfx/deathplayer.wav",
  });

  // Starts 10s into the file. Actual sound is still gated by the browser's
  // autoplay policy internally — MusicPlayer resumes itself on the player's
  // first keypress/click if the browser wouldn't otherwise allow audio yet.
  const music = new MusicPlayer("/assets/bgm.mid", 0.4, 3);
  music.start().catch((err) => console.error("Failed to start music:", err));

  const game = new Game(app, music);
  game.start();
}

main();
