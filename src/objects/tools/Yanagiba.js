import { Knife } from './Knife.js';

export class Yanagiba extends Knife {
  static TEXTURE_KEY = 'yanagiba-pixel';
  static SHADOW_TEXTURE_KEY = 'yanagiba-shadow-pixel';
  static TIP_LOCAL_X = -7.5;
  static TIP_LOCAL_Y = -95;
  static HANDLE_HOLD_WIDTH = 22;
  static HANDLE_HOLD_HEIGHT = 62;
  static HANDLE_HOLD_OFFSET_Y = 62;
  static BODY_WIDTH = 40;
  static BODY_HEIGHT = 200;

  static createBladeTexture(scene) {
    const width = 80;
    const height = 16;
    const texture = scene.textures.createCanvas(this.TEXTURE_KEY, width, height);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);

    // Wa-handle (octagonal magnolia wood)
    context.fillStyle = '#a0764e';
    context.fillRect(52, 4, 26, 9);
    context.fillStyle = '#b88c5e';
    context.fillRect(53, 5, 23, 5);
    context.fillStyle = '#c89c6e';
    context.fillRect(54, 6, 21, 2);
    context.fillStyle = '#8b6240';
    context.fillRect(52, 10, 26, 2);
    context.fillStyle = '#7a5536';
    context.fillRect(52, 12, 26, 1);
    context.fillStyle = '#5e3e26';
    context.fillRect(77, 4, 1, 9);
    context.fillStyle = '#3a2419';
    context.fillRect(75, 4, 1, 1);
    context.fillRect(75, 12, 1, 1);

    // Ferrule (black buffalo horn)
    context.fillStyle = '#1a1410';
    context.fillRect(49, 4, 3, 9);
    context.fillStyle = '#3a2e22';
    context.fillRect(49, 5, 3, 1);
    context.fillRect(49, 11, 3, 1);

    // Blade (single bevel, narrow taper)
    context.fillStyle = '#7a8a90';
    context.fillRect(38, 6, 11, 1);
    context.fillRect(10, 7, 39, 1);
    context.fillStyle = '#a8b6bb';
    context.fillRect(7, 8, 42, 1);
    context.fillStyle = '#cbd4d7';
    context.fillRect(5, 9, 44, 1);
    context.fillStyle = '#edf3f4';
    context.fillRect(3, 10, 46, 1);
    context.fillRect(7, 11, 42, 1);
    context.fillStyle = '#cbd4d7';
    context.fillRect(11, 12, 38, 1);
    context.fillStyle = '#8fa2a8';
    context.fillRect(15, 13, 33, 1);

    // Tip taper
    context.fillStyle = '#edf3f4';
    context.fillRect(2, 10, 3, 1);

    // Polish highlights along spine
    context.fillStyle = '#ffffff';
    context.fillRect(20, 10, 6, 1);
    context.fillRect(30, 10, 5, 1);
    context.fillRect(40, 10, 4, 1);

    texture.refresh();
  }

  static createShadowTexture(scene) {
    const width = 80;
    const height = 16;
    const texture = scene.textures.createCanvas(this.SHADOW_TEXTURE_KEY, width, height);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#ffffff';
    context.fillRect(10, 6, 42, 1);
    context.fillRect(5, 7, 47, 2);
    context.fillRect(3, 9, 49, 2);
    context.fillRect(6, 11, 46, 2);
    context.fillRect(14, 13, 38, 1);
    context.fillRect(52, 4, 26, 9);

    texture.refresh();
  }
}
