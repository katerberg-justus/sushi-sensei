import { CuttableObject } from './CuttableObject.js';
import { IngredientObject } from './IngredientObject.js';
import { resolveVariantTexture, toHexColor } from './ProceduralTexture.js';

const PIXEL = 2.25;
const TAMAGO_BASE_KEY = 'cuttable-tamago-pixel';
const TAMAGO_VARIANT_POOL = 6;
const TAMAGO_WIDTH = 52;
const TAMAGO_HEIGHT = 30;

export class CuttableTamago extends IngredientObject {
  constructor(scene, x, y, options = {}) {
    const { textureKey, variantIndex } = resolveVariantTexture(scene, TAMAGO_BASE_KEY, options, {
      width: TAMAGO_WIDTH,
      height: TAMAGO_HEIGHT,
      pool: TAMAGO_VARIANT_POOL,
      paint: CuttableTamago.paintTexture,
    });

    const cropX = options.cropX ?? 0;
    const cropY = options.cropY ?? 0;
    const cropWidth = options.cropWidth ?? TAMAGO_WIDTH;
    const cropHeight = options.cropHeight ?? TAMAGO_HEIGHT;
    const displayWidth = cropWidth * PIXEL;
    const displayHeight = cropHeight * PIXEL;

    super(scene, x, y, displayWidth, displayHeight);
    this.setCenteredHitbox(displayWidth, displayHeight);
    this.restDepth = 20;
    this.variantIndex = variantIndex;

    CuttableObject.setupCuttable(this, textureKey, cropWidth, cropHeight, PIXEL, options);

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

  static paintTexture(context, rng) {
    const jitter = (range) => Math.floor(rng() * (range * 2 + 1)) - range;

    context.fillStyle = toHexColor(0xf1c35b);
    context.fillRect(4, 18, 44, 5);
    context.fillRect(6, 20, 40, 4);

    context.fillRect(5, 7, 42, 15);
    context.fillStyle = toHexColor(0xf4ca61);
    context.fillRect(7, 5, 38, 5);
    context.fillRect(8, 10, 36, 5);
    context.fillStyle = toHexColor(0xf1c35b);
    context.fillRect(5, 18, 42, 4);
    context.fillRect(3, 10, 3, 8);
    context.fillRect(46, 10, 3, 8);

    context.fillStyle = toHexColor(0xf6d56d);
    const highlightRows = [
      { y: 7, slotCount: 3, slotWidth: 12, leftPadding: 8 },
      { y: 13, slotCount: 3, slotWidth: 12, leftPadding: 8 },
    ];
    highlightRows.forEach((row) => {
      for (let slot = 0; slot < row.slotCount; slot += 1) {
        const baseX = row.leftPadding + slot * row.slotWidth;
        const width = 6 + Math.floor(rng() * 3);
        const ox = jitter(1);
        const oy = jitter(1);

        context.fillRect(baseX + ox, row.y + oy, width, 2);
      }
    });

    context.fillStyle = toHexColor(0xf1c35b);
    context.fillRect(6, 23, 40, 2);
    context.fillRect(10, 25, 32, 1);

    context.fillStyle = toHexColor(0xfadf85);
    for (let slot = 0; slot < 5; slot += 1) {
      if (rng() > 0.55) {
        continue;
      }
      const baseX = 7 + slot * 8 + jitter(1);
      const baseY = 17 + jitter(1);

      context.fillRect(baseX, baseY, 1, 1);
    }
  }
}

Object.getOwnPropertyNames(CuttableObject.prototype).forEach((name) => {
  if (name !== 'constructor') {
    CuttableTamago.prototype[name] = CuttableObject.prototype[name];
  }
});
