import { Knife } from './Knife.js';

export class Deba extends Knife {
  static TEXTURE_KEY = 'deba-pixel';
  static SHADOW_TEXTURE_KEY = 'deba-shadow-pixel';
  static TIP_LOCAL_X = -5;
  static TIP_LOCAL_Y = -62.5;
  static HANDLE_HOLD_WIDTH = 30;
  static HANDLE_HOLD_HEIGHT = 50;
  static HANDLE_HOLD_OFFSET_Y = 50;
  static BODY_WIDTH = 52;
  static BODY_HEIGHT = 150;

  static createBladeTexture(scene) {
    const width = 56;
    const height = 22;
    const texture = scene.textures.createCanvas(this.TEXTURE_KEY, width, height);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);

    // Wa-handle (chunkier, oak)
    context.fillStyle = '#7a4f30';
    context.fillRect(36, 5, 18, 12);
    context.fillStyle = '#8e603c';
    context.fillRect(37, 6, 16, 8);
    context.fillStyle = '#a47245';
    context.fillRect(38, 7, 14, 4);
    context.fillStyle = '#5e3a22';
    context.fillRect(36, 14, 18, 3);
    context.fillStyle = '#3a2419';
    context.fillRect(53, 5, 1, 12);

    // Ferrule (dark horn)
    context.fillStyle = '#181210';
    context.fillRect(33, 5, 3, 12);
    context.fillStyle = '#2e251c';
    context.fillRect(33, 6, 3, 1);
    context.fillRect(33, 15, 3, 1);

    // Heel/spine — thick wedge blade
    context.fillStyle = '#5a6266';
    context.fillRect(31, 5, 2, 13);
    context.fillStyle = '#7a8a90';
    context.fillRect(20, 5, 13, 1);
    context.fillRect(8, 6, 25, 1);

    // Body of blade (broad, tapering at tip)
    context.fillStyle = '#a8b6bb';
    context.fillRect(6, 7, 27, 2);
    context.fillStyle = '#cbd4d7';
    context.fillRect(4, 9, 29, 3);
    context.fillStyle = '#edf3f4';
    context.fillRect(3, 12, 30, 3);
    context.fillStyle = '#cbd4d7';
    context.fillRect(6, 15, 27, 1);
    context.fillStyle = '#8fa2a8';
    context.fillRect(10, 16, 22, 1);
    context.fillStyle = '#6a767c';
    context.fillRect(14, 17, 18, 1);

    // Tip
    context.fillStyle = '#edf3f4';
    context.fillRect(3, 12, 2, 1);
    context.fillStyle = '#cbd4d7';
    context.fillRect(3, 11, 2, 1);

    // Polish highlights
    context.fillStyle = '#ffffff';
    context.fillRect(12, 11, 6, 1);
    context.fillRect(22, 12, 5, 1);
    context.fillRect(16, 14, 5, 1);

    texture.refresh();
  }

  static createShadowTexture(scene) {
    const width = 56;
    const height = 22;
    const texture = scene.textures.createCanvas(this.SHADOW_TEXTURE_KEY, width, height);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#ffffff';
    context.fillRect(8, 5, 25, 1);
    context.fillRect(5, 6, 28, 2);
    context.fillRect(3, 8, 30, 8);
    context.fillRect(5, 16, 28, 2);
    context.fillRect(10, 18, 22, 1);
    context.fillRect(33, 5, 21, 12);

    texture.refresh();
  }
}
