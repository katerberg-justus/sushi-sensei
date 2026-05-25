import { Knife } from './Knife.js';

export class Kiritsuke extends Knife {
  static TEXTURE_KEY = 'kiritsuke-pixel';
  static SHADOW_TEXTURE_KEY = 'kiritsuke-shadow-pixel';
  static TIP_LOCAL_X = 12.5;
  static TIP_LOCAL_Y = -95;
  static HANDLE_HOLD_WIDTH = 24;
  static HANDLE_HOLD_HEIGHT = 62;
  static HANDLE_HOLD_OFFSET_Y = 62;
  static BODY_WIDTH = 44;
  static BODY_HEIGHT = 200;

  static createBladeTexture(scene) {
    const width = 80;
    const height = 18;
    const texture = scene.textures.createCanvas(this.TEXTURE_KEY, width, height);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);

    // Premium wa-handle (ebony with horn ferrule)
    context.fillStyle = '#2a1a14';
    context.fillRect(52, 5, 26, 10);
    context.fillStyle = '#3e2a1e';
    context.fillRect(53, 6, 24, 6);
    context.fillStyle = '#5a3e2a';
    context.fillRect(54, 7, 22, 2);
    context.fillStyle = '#1a100a';
    context.fillRect(52, 12, 26, 3);
    context.fillStyle = '#0a0604';
    context.fillRect(77, 5, 1, 10);

    // Ferrule (pale buffalo horn)
    context.fillStyle = '#d8cdb8';
    context.fillRect(49, 5, 3, 10);
    context.fillStyle = '#ece1cc';
    context.fillRect(49, 6, 3, 1);
    context.fillStyle = '#a8997e';
    context.fillRect(49, 14, 3, 1);

    // Long blade with angled/clipped kiritsuke tip
    // Body
    context.fillStyle = '#7a8a90';
    context.fillRect(14, 5, 35, 1);
    context.fillStyle = '#a8b6bb';
    context.fillRect(8, 6, 41, 1);
    context.fillStyle = '#cbd4d7';
    context.fillRect(6, 7, 43, 1);
    context.fillStyle = '#edf3f4';
    context.fillRect(4, 8, 45, 3);
    context.fillStyle = '#cbd4d7';
    context.fillRect(6, 11, 43, 2);
    context.fillStyle = '#8fa2a8';
    context.fillRect(10, 13, 39, 1);
    context.fillStyle = '#6a767c';
    context.fillRect(14, 14, 35, 1);

    // Angled/clipped tip (kiritsuke) — diagonal from spine downward
    context.fillStyle = '#edf3f4';
    context.fillRect(2, 8, 4, 1);
    context.fillStyle = '#cbd4d7';
    context.fillRect(3, 7, 3, 1);
    context.fillStyle = '#a8b6bb';
    context.fillRect(4, 6, 4, 1);
    context.fillStyle = '#7a8a90';
    context.fillRect(6, 5, 8, 1);
    context.fillStyle = '#edf3f4';
    context.fillRect(2, 9, 4, 2);

    // Polish highlights
    context.fillStyle = '#ffffff';
    context.fillRect(12, 9, 8, 1);
    context.fillRect(24, 9, 7, 1);
    context.fillRect(36, 9, 7, 1);

    texture.refresh();
  }

  static createShadowTexture(scene) {
    const width = 80;
    const height = 18;
    const texture = scene.textures.createCanvas(this.SHADOW_TEXTURE_KEY, width, height);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#ffffff';
    context.fillRect(6, 5, 8, 1);
    context.fillRect(4, 6, 45, 1);
    context.fillRect(3, 7, 46, 1);
    context.fillRect(2, 8, 47, 6);
    context.fillRect(10, 14, 39, 1);
    context.fillRect(49, 5, 29, 10);

    texture.refresh();
  }
}
