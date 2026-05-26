import { Knife } from './Knife.js';

export class Takohiki extends Knife {
  static TEXTURE_KEY = 'takohiki-pixel';
  static SHADOW_TEXTURE_KEY = 'takohiki-shadow-pixel';
  static TIP_LOCAL_X = 0;
  static TIP_LOCAL_Y = -95;
  static HANDLE_HOLD_WIDTH = 20;
  static HANDLE_HOLD_HEIGHT = 62;
  static HANDLE_HOLD_OFFSET_Y = 62;
  static BODY_WIDTH = 36;
  static BODY_HEIGHT = 200;

  static createBladeTexture(scene) {
    const width = 80;
    const height = 14;
    const texture = scene.textures.createCanvas(this.TEXTURE_KEY, width, height);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);

    // Wa-handle (octagonal, darker rosewood)
    context.fillStyle = '#5e3a22';
    context.fillRect(52, 3, 26, 8);
    context.fillStyle = '#784e30';
    context.fillRect(53, 4, 23, 5);
    context.fillStyle = '#8e603c';
    context.fillRect(54, 5, 21, 2);
    context.fillStyle = '#3e2516';
    context.fillRect(52, 9, 26, 2);
    context.fillStyle = '#2e1a0e';
    context.fillRect(77, 3, 1, 8);

    // Ferrule (horn)
    context.fillStyle = '#1a1410';
    context.fillRect(49, 3, 3, 8);
    context.fillStyle = '#3a2e22';
    context.fillRect(49, 4, 3, 1);
    context.fillRect(49, 9, 3, 1);

    // Long narrow blade with SQUARED/BLUNT tip (no point)
    context.fillStyle = '#7a8a90';
    context.fillRect(2, 4, 47, 1);
    context.fillStyle = '#a8b6bb';
    context.fillRect(2, 5, 47, 1);
    context.fillStyle = '#cbd4d7';
    context.fillRect(2, 6, 47, 2);
    context.fillStyle = '#edf3f4';
    context.fillRect(2, 8, 47, 2);
    context.fillStyle = '#cbd4d7';
    context.fillRect(2, 10, 47, 1);
    context.fillStyle = '#8fa2a8';
    context.fillRect(2, 11, 47, 1);

    // Squared front edge — vertical face
    context.fillStyle = '#edf3f4';
    context.fillRect(2, 6, 1, 4);

    // Polish highlights along the long blade
    context.fillStyle = '#ffffff';
    context.fillRect(8, 8, 7, 1);
    context.fillRect(20, 8, 6, 1);
    context.fillRect(32, 8, 7, 1);
    context.fillRect(42, 8, 5, 1);

    texture.refresh();
  }

  static createShadowTexture(scene) {
    const width = 80;
    const height = 14;
    const texture = scene.textures.createCanvas(this.SHADOW_TEXTURE_KEY, width, height);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#ffffff';
    context.fillRect(2, 4, 47, 8);
    context.fillRect(49, 3, 29, 8);

    texture.refresh();
  }
}
