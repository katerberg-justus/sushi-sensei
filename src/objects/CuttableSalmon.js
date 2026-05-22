import { COLORS } from '../game/constants.js';
import { CuttableObject } from './CuttableObject.js';
import { IngredientObject } from './IngredientObject.js';
import { resolveVariantTexture, toHexColor } from './ProceduralTexture.js';

const PIXEL = 2.25;
const SALMON_BASE_KEY = 'cuttable-salmon-pixel';
const SALMON_VARIANT_POOL = 6;
const SALMON_WIDTH = 58;
const SALMON_HEIGHT = 28;
const SALMON_WEIGHT_GRAMS = 56;

export class CuttableSalmon extends IngredientObject {
  constructor(scene, x, y, options = {}) {
    const { textureKey, variantIndex } = resolveVariantTexture(scene, SALMON_BASE_KEY, options, {
      width: SALMON_WIDTH,
      height: SALMON_HEIGHT,
      pool: SALMON_VARIANT_POOL,
      paint: CuttableSalmon.paintTexture,
      shapeNoise: { chipChance: 0.035, bumpChance: 0.024 },
    });

    const cropX = options.cropX ?? 0;
    const cropY = options.cropY ?? 0;
    const cropWidth = options.cropWidth ?? SALMON_WIDTH;
    const cropHeight = options.cropHeight ?? SALMON_HEIGHT;
    const displayWidth = cropWidth * PIXEL;
    const displayHeight = cropHeight * PIXEL;

    super(scene, x, y, displayWidth, displayHeight, options);
    this.setCenteredHitbox(displayWidth, displayHeight);
    this.ownWeightGrams = options.weightGrams
      ?? CuttableSalmon.getPieceWeightGrams(cropWidth, cropHeight);
    this.restDepth = 20;
    this.variantIndex = variantIndex;

    this.stackCategory = 'fish';
    this.fishType = 'salmon';
    this.fishDisplayName = 'Salmon';
    this.acceptedStackCategories = ['wasabi'];
    this.maxStackedItems = 1;
    this.stackOffsetX = 0;

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
    const wholeArea = SALMON_WIDTH * SALMON_HEIGHT;
    const pieceArea = cropWidth * cropHeight;

    return (pieceArea / wholeArea) * SALMON_WEIGHT_GRAMS;
  }

  static paintTexture(context, rng) {
    const jitter = (range) => Math.floor(rng() * (range * 2 + 1)) - range;
    const chance = (probability) => rng() < probability;

    context.fillStyle = toHexColor(COLORS.salmon);
    context.fillRect(8, 20, 42, 4);
    context.fillRect(13, 24, 32, 2);
    context.fillRect(4, 12, 4, 6);
    context.fillRect(50, 11, 4, 7);

    context.fillRect(6, 16, 46, 6);
    context.fillRect(10, 22, 38, 3);
    context.fillRect(3, 11, 4, 7);
    context.fillRect(52, 10, 3, 8);

    context.fillRect(7, 7, 44, 13);
    context.fillRect(10, 5, 36, 4);
    context.fillRect(4, 11, 50, 6);
    context.fillRect(11, 18, 36, 3);

    context.fillStyle = toHexColor(0xffa384);
    const highlightRows = [
      [{ x: 12, y: 6, w: 12 }, { x: 31, y: 6, w: 10 }],
      [{ x: 8, y: 10, w: 12 }, { x: 28, y: 10, w: 14 }],
      [{ x: 15, y: 15, w: 11 }, { x: 35, y: 14, w: 9 }],
      [{ x: 8, y: 18, w: 12 }, { x: 28, y: 18, w: 12 }],
      [{ x: 15, y: 22, w: 9 }, { x: 33, y: 22, w: 7 }],
    ];
    highlightRows.forEach((row) => {
      row.forEach((segment) => {
        if (!chance(0.85)) {
          return;
        }
        const offsetX = jitter(1);
        const offsetY = jitter(1);
        const widthDelta = jitter(2);
        const width = Math.max(3, segment.w + widthDelta);

        context.fillRect(segment.x + offsetX, segment.y + offsetY, width, 1);
      });
    });

    context.fillStyle = toHexColor(0xffd7c7);
    const fatThreads = [
      { x: 12, y: 5, segments: [5, 4, 5] },
      { x: 31, y: 5, segments: [4, 5, 4] },
      { x: 8, y: 9, segments: [4, 5, 5, 4] },
      { x: 27, y: 9, segments: [5, 6, 5, 4] },
      { x: 16, y: 13, segments: [4, 5, 4] },
      { x: 35, y: 12, segments: [4, 4, 3] },
      { x: 7, y: 16, segments: [4, 5, 5, 3] },
      { x: 26, y: 16, segments: [5, 5, 4] },
      { x: 13, y: 20, segments: [4, 5, 4] },
      { x: 31, y: 20, segments: [4, 4, 3] },
      { x: 22, y: 23, segments: [3, 4] },
    ];
    fatThreads.forEach((thread) => {
      if (!chance(0.9)) {
        return;
      }
      const ox = jitter(1);
      const oy = jitter(1);
      const jitteredSegments = thread.segments.map((width) => Math.max(2, width + jitter(1)));

      CuttableSalmon.paintFatThread(context, thread.x + ox, thread.y + oy, jitteredSegments, 1);
    });

    context.fillStyle = toHexColor(0xffeadf);
    const highlights = [
      { x: 14, y: 6, segments: [2, 3] },
      { x: 33, y: 6, segments: [2, 3] },
      { x: 10, y: 10, segments: [2, 3, 2] },
      { x: 30, y: 10, segments: [3, 3, 2] },
      { x: 18, y: 14, segments: [2, 3] },
      { x: 37, y: 13, segments: [2, 2] },
      { x: 9, y: 17, segments: [2, 3, 2] },
      { x: 28, y: 17, segments: [3, 3] },
      { x: 15, y: 21, segments: [2, 3] },
      { x: 33, y: 21, segments: [2, 2] },
      { x: 23, y: 24, segments: [2] },
    ];
    highlights.forEach((spec) => {
      if (!chance(0.75)) {
        return;
      }
      const ox = jitter(1);
      const oy = jitter(1);

      CuttableSalmon.paintFatThread(context, spec.x + ox, spec.y + oy, spec.segments, 1);
    });

    context.fillStyle = toHexColor(0xffa98c);
    context.fillRect(10, 4, 34, 1);
    context.fillRect(7, 7, 44, 1);
    context.fillRect(5, 11, 49, 1);

    context.fillStyle = toHexColor(0xffc8b0);
    for (let i = 0; i < 6; i += 1) {
      if (!chance(0.6)) {
        continue;
      }
      const sx = 8 + Math.floor(rng() * 40);
      const sy = 6 + Math.floor(rng() * 17);

      context.fillRect(sx, sy, 1, 1);
    }
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
