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

    context.fillStyle = CuttableSalmon.toHexColor(0xff8a74);
    context.fillRect(12, 6, 13, 3);
    context.fillRect(29, 5, 13, 3);
    context.fillRect(8, 10, 15, 3);
    context.fillRect(27, 10, 17, 3);
    context.fillRect(16, 15, 14, 3);
    context.fillRect(35, 14, 12, 3);

    context.fillStyle = CuttableSalmon.toHexColor(0xff907d);
    context.fillRect(14, 8, 11, 1);
    context.fillRect(31, 7, 11, 1);
    context.fillRect(10, 12, 12, 1);
    context.fillRect(29, 12, 14, 1);
    context.fillRect(18, 17, 10, 1);
    context.fillRect(37, 16, 8, 1);

    context.fillStyle = CuttableSalmon.toHexColor(COLORS.salmon);
    context.fillRect(5, 17, 46, 3);
    context.fillRect(12, 21, 34, 2);
    context.fillRect(50, 13, 4, 4);

    context.fillStyle = CuttableSalmon.toHexColor(COLORS.salmon);
    context.fillRect(10, 4, 34, 1);
    context.fillRect(7, 7, 44, 1);
    context.fillRect(5, 11, 49, 1);

    texture.refresh();
  }

  static toHexColor(color) {
    return `#${color.toString(16).padStart(6, '0')}`;
  }
}

Object.getOwnPropertyNames(CuttableObject.prototype).forEach((name) => {
  if (name !== 'constructor') {
    CuttableSalmon.prototype[name] = CuttableObject.prototype[name];
  }
});
