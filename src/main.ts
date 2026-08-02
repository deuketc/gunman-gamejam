import "./style.css";
import "@fontsource/press-start-2p/400.css";
import { Application, Assets } from "pixi.js";
import { Game } from "./Game";
import { MusicPlayer } from "./audio/MusicPlayer";
import { Sfx } from "./audio/Sfx";
import { Preloader } from "./Preloader";
import { StartScreen } from "./StartScreen";

const TEXTURE_URLS = [
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
  "/assets/grenade_static_icon.png",
  "/assets/medal_static_icon.png",
  "/assets/music-toggle.png",
  "/assets/player-ani-sprint.png",
  "/assets/arrow.png",
  "/assets/door-02-ani-open.png",
  "/assets/door-02-static-light.png",
  "/assets/keypad_ani_locked.png",
  "/assets/keypad_ani_unlocked.png",
  "/assets/skull.png",
  "/assets/billboard.png",
  "/assets/player-ani-winning.png",
  "/assets/foreground-static-01.png",
  "/assets/start-button-static.png",
  "https://pixijs.com/assets/spritesheet/mc.json",
];

const SFX_URLS = {
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
  arrow: "/assets/sfx/arrow.wav",
  "door2-unlock": "/assets/sfx/door2-unlock.wav",
  win: "/assets/sfx/win.wav",
  lose: "/assets/sfx/lose.wav",
};

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

  // Preloader's own frame graphic must be loaded before it's constructed —
  // it's shown while everything in TEXTURE_URLS is still loading.
  await Assets.load("/assets/preloader-static.png");

  const preloader = new Preloader(app.screen.width, app.screen.height);
  app.stage.addChild(preloader.container);

  // Textures report one combined 0-1 fraction; sfx files are counted one by
  // one as each finishes. Weighted by item count so the bar moves at a
  // roughly constant rate regardless of which kind of asset is loading.
  const totalSfx = Object.keys(SFX_URLS).length;
  const totalItems = TEXTURE_URLS.length + totalSfx;
  let textureFraction = 0;
  let sfxLoaded = 0;
  const updateProgress = () => {
    preloader.setProgress(
      (textureFraction * TEXTURE_URLS.length + sfxLoaded) / totalItems,
    );
  };

  await Promise.all([
    Assets.load(TEXTURE_URLS, (fraction) => {
      textureFraction = fraction;
      updateProgress();
    }),
    Sfx.load(SFX_URLS, () => {
      sfxLoaded++;
      updateProgress();
    }),
    // Pixi's Text rasterizes via canvas and won't re-render on its own once a
    // webfont finishes loading, so it must be ready before any Text is created.
    document.fonts.load('16px "Press Start 2P"', "START F5 to restart"),
  ]);

  app.stage.removeChild(preloader.container);

  // Gate audio behind an explicit user click — Chrome (and others) refuse to
  // run an AudioContext until a real user gesture happens on the page, and
  // will log a warning if something tries to resume one before that. The
  // Start button click itself satisfies that requirement, so everything
  // audio-related only starts from here on.
  await new Promise<void>((resolve) => {
    const startScreen = new StartScreen(app.screen.width, app.screen.height);
    startScreen.onStart = () => {
      app.stage.removeChild(startScreen.container);
      resolve();
    };
    app.stage.addChild(startScreen.container);
  });

  // Starts 10s into the file. Deliberately not awaited — it depends on a CDN
  // fetch for soundfont samples, which is slower and more variable than the
  // local assets, so the game shouldn't wait on it to appear.
  const music = new MusicPlayer("/assets/bgm.mid", 0.4, 3);
  music.start().catch((err) => console.error("Failed to start music:", err));

  const game = new Game(app, music);
  game.start();
}

main();
