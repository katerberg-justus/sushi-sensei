import { Knife } from './Knife.js';

export class Usuba extends Knife {
  static TEXTURE_KEY = 'usuba-pixel';
  static SHADOW_TEXTURE_KEY = 'usuba-shadow-pixel';
  static TIP_LOCAL_X = -15;
  static TIP_LOCAL_Y = -75;
  static HANDLE_HOLD_WIDTH = 26;
  static HANDLE_HOLD_HEIGHT = 50;
  static HANDLE_HOLD_OFFSET_Y = 47;
  static BODY_WIDTH = 56;
  static BODY_HEIGHT = 170;

  static createBladeTexture(scene) {
    const width = 64;
    const height = 24;
    const texture = scene.textures.createCanvas(this.TEXTURE_KEY, width, height);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);

    // Wa-handle (light magnolia, octagonal)
    context.fillStyle = '#a8804e';
    context.fillRect(46, 7, 16, 10);
    context.fillStyle = '#bc9362';
    context.fillRect(47, 8, 14, 6);
    context.fillStyle = '#c89c6e';
    context.fillRect(48, 9, 12, 3);
    context.fillStyle = '#8b6240';
    context.fillRect(46, 14, 16, 3);
    context.fillStyle = '#5e3e26';
    context.fillRect(61, 7, 1, 10);

    // Ferrule (horn)
    context.fillStyle = '#1a1410';
    context.fillRect(43, 7, 3, 10);
    context.fillStyle = '#3a2e22';
    context.fillRect(43, 8, 3, 1);
    context.fillRect(43, 15, 3, 1);

    // Tall rectangular blade — flat edge along bottom
    context.fillStyle = '#6a767c';
    context.fillRect(2, 4, 41, 1);
    context.fillStyle = '#7a8a90';
    context.fillRect(2, 5, 41, 1);
    context.fillStyle = '#a8b6bb';
    context.fillRect(2, 6, 41, 2);
    context.fillStyle = '#cbd4d7';
    context.fillRect(2, 8, 41, 4);
    context.fillStyle = '#edf3f4';
    context.fillRect(2, 12, 41, 5);
    context.fillStyle = '#cbd4d7';
    context.fillRect(2, 17, 41, 2);
    // Single-bevel shinogi shadow band near edge
    context.fillStyle = '#8fa2a8';
    context.fillRect(2, 19, 41, 1);
    context.fillStyle = '#ffffff';
    context.fillRect(2, 20, 41, 1);

    // Rectangular tip — flat front
    context.fillStyle = '#edf3f4';
    context.fillRect(2, 12, 1, 5);

    // Polish highlights
    context.fillStyle = '#ffffff';
    context.fillRect(10, 14, 7, 1);
    context.fillRect(22, 13, 8, 1);
    context.fillRect(34, 15, 6, 1);

    texture.refresh();
  }

  static createShadowTexture(scene) {
    const width = 64;
    const height = 24;
    const texture = scene.textures.createCanvas(this.SHADOW_TEXTURE_KEY, width, height);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#ffffff';
    context.fillRect(2, 4, 41, 17);
    context.fillRect(43, 7, 19, 10);

    texture.refresh();
  }
}
