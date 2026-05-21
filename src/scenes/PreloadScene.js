import * as Phaser from 'phaser/dist/phaser.esm.js';
import { SCENE_KEYS } from '../game/constants.js';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.preload);
  }

  create() {
    this.scene.start(SCENE_KEYS.game);
  }
}
