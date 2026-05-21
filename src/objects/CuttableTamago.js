import { COLORS } from '../game/constants.js';
import { CuttableObject } from './CuttableObject.js';
import { IngredientObject } from './IngredientObject.js';

const PIXEL = 2.25;
const TAMAGO_KEY = 'cuttable-tamago-pixel';

export class CuttableTamago extends IngredientObject {
  constructor(scene, x, y, options = {}) {
    CuttableTamago.createTexture(scene);

    const cropX = options.cropX ?? 0;
    const cropY = options.cropY ?? 0;
    const cropWidth = options.cropWidth ?? 52;
    const cropHeight = options.cropHeight ?? 30;
    const displayWidth = cropWidth * PIXEL;
    const displayHeight = cropHeight * PIXEL;

    super(scene, x, y, displayWidth, displayHeight);
    this.setCenteredHitbox(displayWidth, displayHeight);
    this.restDepth = 20;

    CuttableObject.setupCuttable(this, TAMAGO_KEY, cropWidth, cropHeight, PIXEL, options);

    if (cropX !== 0 || cropY !== 0) {
      this.configureAsCutPiece({
        cropX,
        cropY,
        cropWidth,
        cropHeight,
      }, options);
    }

    this.refreshCompositionShadow();
  }

  static createTexture(scene) {
    if (scene.textures.exists(TAMAGO_KEY)) {
      return;
    }

    const width = 52;
    const height = 30;
    const texture = scene.textures.createCanvas(TAMAGO_KEY, width, height);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);

    context.fillStyle = CuttableTamago.toHexColor(0xf1c35b);
    context.fillRect(4, 18, 44, 5);
    context.fillStyle = CuttableTamago.toHexColor(0xf1c35b);
    context.fillRect(6, 20, 40, 4);

    context.fillStyle = CuttableTamago.toHexColor(0xf1c35b);
    context.fillRect(5, 7, 42, 15);
    context.fillStyle = CuttableTamago.toHexColor(0xf4ca61);
    context.fillRect(7, 5, 38, 5);
    context.fillRect(8, 10, 36, 5);
    context.fillStyle = CuttableTamago.toHexColor(0xf1c35b);
    context.fillRect(5, 18, 42, 4);
    context.fillRect(3, 10, 3, 8);
    context.fillRect(46, 10, 3, 8);

    context.fillStyle = CuttableTamago.toHexColor(0xf6d56d);
    context.fillRect(11, 7, 10, 2);
    context.fillRect(28, 8, 12, 2);
    context.fillRect(16, 13, 7, 2);

    context.fillStyle = CuttableTamago.toHexColor(0xf1c35b);
    context.fillRect(6, 23, 40, 2);
    context.fillRect(10, 25, 32, 1);

    texture.refresh();
  }

  static toHexColor(color) {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  static paintPixels(context, rows, palette) {
    rows.forEach((row, y) => {
      [...row].forEach((cell, x) => {
        if (cell === '.') {
          return;
        }

        context.fillStyle = CuttableTamago.toHexColor(palette[cell]);
        context.fillRect(x, y, 1, 1);
      });
    });
  }
}

Object.getOwnPropertyNames(CuttableObject.prototype).forEach((name) => {
  if (name !== 'constructor') {
    CuttableTamago.prototype[name] = CuttableObject.prototype[name];
  }
});
