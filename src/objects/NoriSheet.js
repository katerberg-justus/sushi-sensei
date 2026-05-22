import { CuttableObject } from './CuttableObject.js';
import { IngredientObject } from './IngredientObject.js';
import { resolveVariantTexture, toHexColor } from './ProceduralTexture.js';

const PIXEL = 2;
const NORI_BASE_KEY = 'nori-sheet-pixel';
const NORI_VARIANT_POOL = 6;
const NORI_WIDTH = 58;
const NORI_HEIGHT = 40;
const NORI_WEIGHT_GRAMS = 3;

export class NoriSheet extends IngredientObject {
  constructor(scene, x, y, options = {}) {
    const { textureKey, variantIndex } = resolveVariantTexture(scene, NORI_BASE_KEY, options, {
      width: NORI_WIDTH,
      height: NORI_HEIGHT,
      pool: NORI_VARIANT_POOL,
      paint: NoriSheet.paintTexture,
      shapeNoise: { chipChance: 0.018, bumpChance: 0.012 },
    });

    const cropX = options.cropX ?? 0;
    const cropY = options.cropY ?? 0;
    const cropWidth = options.cropWidth ?? NORI_WIDTH;
    const cropHeight = options.cropHeight ?? NORI_HEIGHT;
    const displayWidth = cropWidth * PIXEL;
    const displayHeight = cropHeight * PIXEL;

    super(scene, x, y, displayWidth, displayHeight, options);
    this.setCenteredHitbox(displayWidth, displayHeight);
    this.ownWeightGrams = options.weightGrams
      ?? NoriSheet.getPieceWeightGrams(cropWidth, cropHeight);
    this.restDepth = 18;
    this.variantIndex = variantIndex;
    this.displayName = 'Nori Sheet';
    this.stackCategory = 'nori';
    this.computedShadeDarkAlpha = 0.26;
    this.computedShadeLightAlpha = 0.1;
    this.computedShadeBottomCoverage = 0.18;

    CuttableObject.setupCuttable(this, textureKey, cropWidth, cropHeight, PIXEL, options);

    if (!options.skipInitialPiece && (cropX !== 0 || cropY !== 0)) {
      this.configureAsCutPiece({
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        visibleBounds: options.visibleBounds,
      }, options);
    }

    this.refreshCompositionShadow();
  }

  static getPieceWeightGrams(cropWidth, cropHeight) {
    const wholeArea = NORI_WIDTH * NORI_HEIGHT;
    const pieceArea = cropWidth * cropHeight;

    return (pieceArea / wholeArea) * NORI_WEIGHT_GRAMS;
  }

  static paintTexture(context, rng) {
    const jitter = (range) => Math.floor(rng() * (range * 2 + 1)) - range;
    const chance = (probability) => rng() < probability;

    context.fillStyle = toHexColor(0x102821);
    context.fillRect(5, 3, 48, 2);
    context.fillRect(3, 5, 52, 31);
    context.fillRect(6, 36, 46, 2);

    context.fillStyle = toHexColor(0x18372e);
    context.fillRect(5, 6, 48, 28);
    context.fillRect(7, 4, 44, 2);
    context.fillRect(7, 34, 44, 2);

    context.fillStyle = toHexColor(0x214b3d);
    context.fillRect(8, 7, 18, 7);
    context.fillRect(29, 8, 20, 5);
    context.fillRect(7, 16, 24, 7);
    context.fillRect(34, 17, 16, 8);
    context.fillRect(11, 26, 19, 6);
    context.fillRect(33, 28, 14, 4);

    context.fillStyle = toHexColor(0x0b1a16);
    context.fillRect(5, 5, 48, 1);
    context.fillRect(4, 7, 1, 27);
    context.fillRect(53, 7, 1, 27);
    context.fillRect(7, 35, 44, 1);

    context.fillStyle = toHexColor(0x2d5d4a);
    for (let y = 8; y < 33; y += 4) {
      if (chance(0.8)) {
        context.fillRect(7 + jitter(1), y + jitter(1), 43 + jitter(3), 1);
      }
    }

    context.fillStyle = toHexColor(0x143026);
    for (let x = 10; x < 50; x += 8) {
      if (chance(0.75)) {
        context.fillRect(x + jitter(1), 7, 1, 27 + jitter(2));
      }
    }

    context.fillStyle = toHexColor(0x3f745d);
    for (let i = 0; i < 24; i += 1) {
      if (!chance(0.72)) {
        continue;
      }

      context.fillRect(
        7 + Math.floor(rng() * 45),
        6 + Math.floor(rng() * 28),
        chance(0.35) ? 2 : 1,
        1,
      );
    }
  }
}

Object.getOwnPropertyNames(CuttableObject.prototype).forEach((name) => {
  if (name !== 'constructor') {
    NoriSheet.prototype[name] = CuttableObject.prototype[name];
  }
});
