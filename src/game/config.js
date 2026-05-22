import * as Phaser from 'phaser/dist/phaser.esm.js';
import { GAME_HEIGHT, GAME_WIDTH, COLORS } from './constants.js';
import { GameScene } from '../scenes/GameScene.js';
import { PreloadScene } from '../scenes/PreloadScene.js';

export const gameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.background,
  pixelArt: true,
  roundPixels: true,
  input: {
    activePointers: 3,
  },
  scene: [PreloadScene, GameScene],
  scale: {
    mode: Phaser.Scale.ENVELOP,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};
