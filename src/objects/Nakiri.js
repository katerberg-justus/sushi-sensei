import { Knife } from './Knife.js';

export class Nakiri extends Knife {
  static TEXTURE_KEY = 'nakiri-pixel';
  static SHADOW_TEXTURE_KEY = 'nakiri-shadow-pixel';
  static TIP_LOCAL_X = -17.5;
  static TIP_LOCAL_Y = -70;
  static HANDLE_HOLD_WIDTH = 26;
  static HANDLE_HOLD_HEIGHT = 44;
  static HANDLE_HOLD_OFFSET_Y = 45;
  static BODY_WIDTH = 52;
  static BODY_HEIGHT = 155;

  static createBladeTexture(scene) {
    const width = 60;
    const height = 22;
    const texture = scene.textures.createCanvas(this.TEXTURE_KEY, width, height);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);

    // Wa-handle (chestnut)
    context.fillStyle = '#6e4326';
    context.fillRect(42, 6, 16, 10);
    context.fillStyle = '#8a5b36';
    context.fillRect(43, 7, 14, 6);
    context.fillStyle = '#a06f46';
    context.fillRect(44, 8, 12, 3);
    context.fillStyle = '#4f2f1c';
    context.fillRect(42, 13, 16, 3);
    context.fillStyle = '#2e1c10';
    context.fillRect(57, 6, 1, 10);

    // Bolster (small metal collar)
    context.fillStyle = '#5a6266';
    context.fillRect(40, 6, 2, 10);
    context.fillStyle = '#8fa2a8';
    context.fillRect(41, 7, 1, 8);

    // Rectangular double-bevel blade — symmetric shading
    context.fillStyle = '#7a8a90';
    context.fillRect(2, 5, 38, 1);
    context.fillStyle = '#a8b6bb';
    context.fillRect(2, 6, 38, 2);
    context.fillStyle = '#cbd4d7';
    context.fillRect(2, 8, 38, 3);
    context.fillStyle = '#edf3f4';
    context.fillRect(2, 11, 38, 4);
    context.fillStyle = '#cbd4d7';
    context.fillRect(2, 15, 38, 2);
    context.fillStyle = '#a8b6bb';
    context.fillRect(2, 17, 38, 1);
    context.fillStyle = '#7a8a90';
    context.fillRect(2, 18, 38, 1);

    // Square front edge
    context.fillStyle = '#edf3f4';
    context.fillRect(2, 11, 1, 4);

    // Polish highlights
    context.fillStyle = '#ffffff';
    context.fillRect(8, 12, 6, 1);
    context.fillRect(18, 11, 7, 1);
    context.fillRect(28, 13, 6, 1);

    texture.refresh();
  }

  static createShadowTexture(scene) {
    const width = 60;
    const height = 22;
    const texture = scene.textures.createCanvas(this.SHADOW_TEXTURE_KEY, width, height);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#ffffff';
    context.fillRect(2, 5, 38, 14);
    context.fillRect(40, 6, 18, 10);

    texture.refresh();
  }
}
