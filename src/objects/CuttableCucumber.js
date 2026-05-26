import { CuttableObject } from './CuttableObject.js';
import { IngredientObject } from './IngredientObject.js';
import { JAPANESE_NAMES } from './JapaneseNames.js';
import { resolveVariantTexture, toHexColor } from './ProceduralTexture.js';

const PIXEL = 2.25;
const CUCUMBER_BASE_KEY = 'cuttable-cucumber-strip-thick-pixel';
const CUCUMBER_VARIANT_POOL = 6;
const CUCUMBER_WIDTH = 58;
const CUCUMBER_HEIGHT = 12;
const CUCUMBER_WEIGHT_GRAMS = 18;

export class CuttableCucumber extends IngredientObject {
  constructor(scene, x, y, options = {}) {
    const { textureKey, variantIndex } = resolveVariantTexture(scene, CUCUMBER_BASE_KEY, options, {
      width: CUCUMBER_WIDTH,
      height: CUCUMBER_HEIGHT,
      pool: CUCUMBER_VARIANT_POOL,
      paint: CuttableCucumber.paintTexture,
      shapeNoise: { chipChance: 0.012, bumpChance: 0.008 },
    });

    const cropX = options.cropX ?? 0;
    const cropY = options.cropY ?? 0;
    const cropWidth = options.cropWidth ?? CUCUMBER_WIDTH;
    const cropHeight = options.cropHeight ?? CUCUMBER_HEIGHT;
    const displayWidth = cropWidth * PIXEL;
    const displayHeight = cropHeight * PIXEL;

    super(scene, x, y, displayWidth, displayHeight, {
      ...options,
      japaneseName: options.japaneseName ?? JAPANESE_NAMES.cucumber,
    });
    this.setCenteredHitbox(displayWidth, displayHeight);
    this.ownWeightGrams = options.weightGrams
      ?? CuttableCucumber.getPieceWeightGrams(cropWidth, cropHeight);
    this.restDepth = 20;
    this.variantIndex = variantIndex;

    this.stackCategory = 'fish';
    this.fishType = 'cucumber';
    this.fishDisplayName = 'Cucumber';
    this.fishJapaneseName = JAPANESE_NAMES.cucumber;
    this.displayName = 'Cucumber';
    this.acceptedStackCategories = [];
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
    const wholeArea = CUCUMBER_WIDTH * CUCUMBER_HEIGHT;
    const pieceArea = cropWidth * cropHeight;

    return (pieceArea / wholeArea) * CUCUMBER_WEIGHT_GRAMS;
  }

  static paintTexture(context, rng) {
    const jitter = (range) => Math.floor(rng() * (range * 2 + 1)) - range;
    const chance = (probability) => rng() < probability;

    context.fillStyle = toHexColor(0x2f743a);
    context.fillRect(6, 1, 46, 2);
    context.fillRect(4, 3, 50, 2);
    context.fillRect(4, 8, 50, 2);
    context.fillRect(7, 10, 44, 1);

    context.fillStyle = toHexColor(0x53a848);
    context.fillRect(5, 4, 48, 5);
    context.fillRect(8, 3, 42, 1);

    context.fillStyle = toHexColor(0x7fc85a);
    context.fillRect(8, 5, 42, 2);
    context.fillRect(10, 7, 37, 1);

    context.fillStyle = toHexColor(0xb8dc79);
    for (let x = 12; x < 47; x += 8) {
      if (!chance(0.85)) {
        continue;
      }

      context.fillRect(x + jitter(1), 5 + jitter(1), 2, 1);
      if (chance(0.45)) {
        context.fillRect(x + 3 + jitter(1), 6, 1, 1);
      }
    }

    context.fillStyle = toHexColor(0x225f31);
    for (let x = 8; x < 52; x += 9) {
      if (chance(0.72)) {
        context.fillRect(x + jitter(1), 3, 5 + Math.floor(rng() * 3), 1);
      }
      if (chance(0.58)) {
        context.fillRect(x + jitter(1), 8, 4 + Math.floor(rng() * 3), 1);
      }
    }
  }
}

Object.getOwnPropertyNames(CuttableObject.prototype).forEach((name) => {
  if (name !== 'constructor') {
    CuttableCucumber.prototype[name] = CuttableObject.prototype[name];
  }
});
