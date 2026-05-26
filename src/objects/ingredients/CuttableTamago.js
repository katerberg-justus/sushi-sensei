import { CuttableObject } from '../base/CuttableObject.js';
import { FishFlipBehavior, setupFishFlip } from '../base/FishFlipBehavior.js';
import { IngredientObject } from '../base/IngredientObject.js';
import { JAPANESE_NAMES } from '../JapaneseNames.js';
import { resolveVariantTexture, toHexColor } from '../ProceduralTexture.js';

const PIXEL = 2.25;
const TAMAGO_BASE_KEY = 'cuttable-tamago-pixel';
const TAMAGO_VARIANT_POOL = 6;
const TAMAGO_WIDTH = 52;
const TAMAGO_HEIGHT = 30;
const TAMAGO_WEIGHT_GRAMS = 72;

export class CuttableTamago extends IngredientObject {
  constructor(scene, x, y, options = {}) {
    const { textureKey, variantIndex } = resolveVariantTexture(scene, TAMAGO_BASE_KEY, options, {
      width: TAMAGO_WIDTH,
      height: TAMAGO_HEIGHT,
      pool: TAMAGO_VARIANT_POOL,
      paint: CuttableTamago.paintTexture,
      shapeNoise: { chipChance: 0.032, bumpChance: 0.022 },
    });

    const cropX = options.cropX ?? 0;
    const cropY = options.cropY ?? 0;
    const cropWidth = options.cropWidth ?? TAMAGO_WIDTH;
    const cropHeight = options.cropHeight ?? TAMAGO_HEIGHT;
    const displayWidth = cropWidth * PIXEL;
    const displayHeight = cropHeight * PIXEL;

    super(scene, x, y, displayWidth, displayHeight, {
      ...options,
      japaneseName: options.japaneseName ?? JAPANESE_NAMES.tamago,
    });
    this.setCenteredHitbox(displayWidth, displayHeight);
    this.ownWeightGrams = options.weightGrams
      ?? CuttableTamago.getPieceWeightGrams(cropWidth, cropHeight);
    this.restDepth = 20;
    this.variantIndex = variantIndex;

    this.stackCategory = 'fish';
    this.fishType = 'tamago';
    this.fishDisplayName = 'Tamago';
    this.fishJapaneseName = JAPANESE_NAMES.tamago;
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

    setupFishFlip(this, options);
    this.refreshCompositionShadow();
  }

  static getPieceWeightGrams(cropWidth, cropHeight) {
    const wholeArea = TAMAGO_WIDTH * TAMAGO_HEIGHT;
    const pieceArea = cropWidth * cropHeight;

    return (pieceArea / wholeArea) * TAMAGO_WEIGHT_GRAMS;
  }

  static paintTexture(context, rng) {
    const jitter = (range) => Math.floor(rng() * (range * 2 + 1)) - range;
    const chance = (probability) => rng() < probability;

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
    const highlights = [
      { x: 9, y: 6, w: 8 },
      { x: 23, y: 6, w: 7 },
      { x: 35, y: 7, w: 6 },
      { x: 7, y: 11, w: 7 },
      { x: 20, y: 12, w: 8 },
      { x: 33, y: 12, w: 7 },
      { x: 10, y: 16, w: 6 },
      { x: 24, y: 17, w: 8 },
      { x: 37, y: 16, w: 5 },
      { x: 13, y: 21, w: 7 },
      { x: 28, y: 21, w: 8 },
    ];
    highlights.forEach((highlight) => {
      if (!chance(0.82)) {
        return;
      }

      context.fillRect(
        highlight.x + jitter(1),
        highlight.y + jitter(1),
        Math.max(3, highlight.w + jitter(2)),
        1,
      );
    });

    context.fillStyle = toHexColor(0xf1c35b);
    context.fillRect(6, 23, 40, 2);
    context.fillRect(10, 25, 32, 1);

    context.fillStyle = toHexColor(0xfadf85);
    for (let i = 0; i < 8; i += 1) {
      if (chance(0.58)) {
        context.fillRect(
          7 + Math.floor(rng() * 38),
          6 + Math.floor(rng() * 17),
          1,
          1,
        );
      }
    }
  }

  destroy(fromScene) {
    this.stopFishFlipTween?.();
    super.destroy(fromScene);
  }
}

Object.getOwnPropertyNames(CuttableObject.prototype).forEach((name) => {
  if (name !== 'constructor') {
    CuttableTamago.prototype[name] = CuttableObject.prototype[name];
  }
});

Object.entries(FishFlipBehavior).forEach(([name, method]) => {
  if (name !== 'destroy') {
    CuttableTamago.prototype[name] = method;
  }
});
