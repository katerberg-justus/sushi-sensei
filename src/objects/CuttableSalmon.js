import { COLORS } from '../game/constants.js';
import { CuttableObject } from './CuttableObject.js';
import { IngredientObject } from './IngredientObject.js';

const PIXEL = 2.25;
const SALMON_KEY = 'cuttable-salmon-pixel';

export class CuttableSalmon extends IngredientObject {
  constructor(scene, x, y, options = {}) {
    CuttableSalmon.createTexture(scene);

    const cropX = options.cropX ?? 0;
    const cropY = options.cropY ?? 0;
    const cropWidth = options.cropWidth ?? 58;
    const cropHeight = options.cropHeight ?? 28;
    const displayWidth = cropWidth * PIXEL;
    const displayHeight = cropHeight * PIXEL;

    super(scene, x, y, displayWidth, displayHeight);
    this.setCenteredHitbox(displayWidth, displayHeight);
    this.restDepth = 20;

    CuttableObject.setupCuttable(this, SALMON_KEY, cropWidth, cropHeight, PIXEL, options);

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
    if (scene.textures.exists(SALMON_KEY)) {
      return;
    }

    const width = 58;
    const height = 28;
    const texture = scene.textures.createCanvas(SALMON_KEY, width, height);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);

    context.fillStyle = CuttableSalmon.toHexColor(COLORS.salmon);
    context.fillRect(8, 20, 42, 4);
    context.fillRect(13, 24, 32, 2);
    context.fillRect(4, 12, 4, 6);
    context.fillRect(50, 11, 4, 7);

    context.fillStyle = CuttableSalmon.toHexColor(COLORS.salmon);
    context.fillRect(6, 16, 46, 6);
    context.fillRect(10, 22, 38, 3);
    context.fillRect(3, 11, 4, 7);
    context.fillRect(52, 10, 3, 8);

    context.fillStyle = CuttableSalmon.toHexColor(COLORS.salmon);
    context.fillRect(7, 7, 44, 13);
    context.fillRect(10, 5, 36, 4);
    context.fillRect(4, 11, 50, 6);
    context.fillRect(11, 18, 36, 3);

    context.fillStyle = CuttableSalmon.toHexColor(0xffa384);
    context.fillRect(12, 6, 12, 1);
    context.fillRect(31, 6, 10, 1);
    context.fillRect(8, 10, 12, 1);
    context.fillRect(28, 10, 14, 1);
    context.fillRect(15, 15, 11, 1);
    context.fillRect(35, 14, 9, 1);
    context.fillRect(8, 18, 12, 1);
    context.fillRect(28, 18, 12, 1);
    context.fillRect(15, 22, 9, 1);
    context.fillRect(33, 22, 7, 1);

    context.fillStyle = CuttableSalmon.toHexColor(0xffd7c7);
    CuttableSalmon.paintFatThread(context, 12, 5, [5, 4, 5], 1);
    CuttableSalmon.paintFatThread(context, 31, 5, [4, 5, 4], 1);
    CuttableSalmon.paintFatThread(context, 8, 9, [4, 5, 5, 4], 1);
    CuttableSalmon.paintFatThread(context, 27, 9, [5, 6, 5, 4], 1);
    CuttableSalmon.paintFatThread(context, 16, 13, [4, 5, 4], 1);
    CuttableSalmon.paintFatThread(context, 35, 12, [4, 4, 3], 1);
    CuttableSalmon.paintFatThread(context, 7, 16, [4, 5, 5, 3], 1);
    CuttableSalmon.paintFatThread(context, 26, 16, [5, 5, 4], 1);
    CuttableSalmon.paintFatThread(context, 13, 20, [4, 5, 4], 1);
    CuttableSalmon.paintFatThread(context, 31, 20, [4, 4, 3], 1);
    CuttableSalmon.paintFatThread(context, 22, 23, [3, 4], 1);

    context.fillStyle = CuttableSalmon.toHexColor(0xffeadf);
    CuttableSalmon.paintFatThread(context, 14, 6, [2, 3], 1);
    CuttableSalmon.paintFatThread(context, 33, 6, [2, 3], 1);
    CuttableSalmon.paintFatThread(context, 10, 10, [2, 3, 2], 1);
    CuttableSalmon.paintFatThread(context, 30, 10, [3, 3, 2], 1);
    CuttableSalmon.paintFatThread(context, 18, 14, [2, 3], 1);
    CuttableSalmon.paintFatThread(context, 37, 13, [2, 2], 1);
    CuttableSalmon.paintFatThread(context, 9, 17, [2, 3, 2], 1);
    CuttableSalmon.paintFatThread(context, 28, 17, [3, 3], 1);
    CuttableSalmon.paintFatThread(context, 15, 21, [2, 3], 1);
    CuttableSalmon.paintFatThread(context, 33, 21, [2, 2], 1);
    CuttableSalmon.paintFatThread(context, 23, 24, [2], 1);

    context.fillStyle = CuttableSalmon.toHexColor(0xffa98c);
    context.fillRect(10, 4, 34, 1);
    context.fillRect(7, 7, 44, 1);
    context.fillRect(5, 11, 49, 1);

    texture.refresh();
  }

  static toHexColor(color) {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  static paintFatThread(context, x, y, segments, height = 1) {
    segments.forEach((width, index) => {
      context.fillRect(x + index * 4, y + index, width, height);
    });
  }
}

Object.getOwnPropertyNames(CuttableObject.prototype).forEach((name) => {
  if (name !== 'constructor') {
    CuttableSalmon.prototype[name] = CuttableObject.prototype[name];
  }
});
