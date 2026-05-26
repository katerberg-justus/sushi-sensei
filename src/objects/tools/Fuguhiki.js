import { Knife } from './Knife.js';

export class Fuguhiki extends Knife {
  static TEXTURE_KEY = 'fuguhiki-pixel';
  static SHADOW_TEXTURE_KEY = 'fuguhiki-shadow-pixel';
  static TIP_LOCAL_X = -7.5;
  static TIP_LOCAL_Y = -97.5;
  static HANDLE_HOLD_WIDTH = 18;
  static HANDLE_HOLD_HEIGHT = 64;
  static HANDLE_HOLD_OFFSET_Y = 65;
  static BODY_WIDTH = 32;
  static BODY_HEIGHT = 205;

  static createBladeTexture(scene) {
    const width = 82;
    const height = 12;
    const texture = scene.textures.createCanvas(this.TEXTURE_KEY, width, height);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);

    // Slender wa-handle (light maple)
    context.fillStyle = '#b08858';
    context.fillRect(54, 3, 26, 6);
    context.fillStyle = '#c89c6e';
    context.fillRect(55, 4, 24, 3);
    context.fillStyle = '#d6ab7c';
    context.fillRect(56, 5, 22, 1);
    context.fillStyle = '#8b6240';
    context.fillRect(54, 7, 26, 2);
    context.fillStyle = '#5e3e26';
    context.fillRect(79, 3, 1, 6);

    // Ferrule (thin horn)
    context.fillStyle = '#1a1410';
    context.fillRect(51, 3, 3, 6);
    context.fillStyle = '#3a2e22';
    context.fillRect(51, 4, 3, 1);
    context.fillRect(51, 7, 3, 1);

    // Extra-long, ultra-thin blade with fine point
    context.fillStyle = '#8fa2a8';
    context.fillRect(8, 4, 43, 1);
    context.fillStyle = '#cbd4d7';
    context.fillRect(5, 5, 46, 1);
    context.fillStyle = '#edf3f4';
    context.fillRect(2, 6, 49, 2);
    context.fillStyle = '#cbd4d7';
    context.fillRect(6, 8, 45, 1);
    context.fillStyle = '#7a8a90';
    context.fillRect(12, 9, 39, 1);

    // Needle-sharp tip
    context.fillStyle = '#edf3f4';
    context.fillRect(2, 6, 3, 1);

    // Polish reflections across the long thin blade
    context.fillStyle = '#ffffff';
    context.fillRect(10, 6, 8, 1);
    context.fillRect(22, 6, 7, 1);
    context.fillRect(34, 6, 8, 1);
    context.fillRect(45, 6, 5, 1);

    texture.refresh();
  }

  static createShadowTexture(scene) {
    const width = 82;
    const height = 12;
    const texture = scene.textures.createCanvas(this.SHADOW_TEXTURE_KEY, width, height);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#ffffff';
    context.fillRect(8, 4, 43, 1);
    context.fillRect(5, 5, 46, 1);
    context.fillRect(2, 6, 49, 3);
    context.fillRect(12, 9, 39, 1);
    context.fillRect(51, 3, 29, 6);

    texture.refresh();
  }
}
