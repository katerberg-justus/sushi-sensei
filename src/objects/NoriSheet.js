import { CuttableObject } from './CuttableObject.js';
import { IngredientObject } from './IngredientObject.js';
import { resolveVariantTexture, toHexColor } from './ProceduralTexture.js';

const PIXEL = 2;
const NORI_BASE_KEY = 'nori-sheet-pixel';
const RICE_ON_NORI_BASE_KEY = 'rice-on-nori-sheet-pixel';
const NORI_VARIANT_POOL = 6;
const NORI_WIDTH = 58;
const NORI_HEIGHT = 40;
const NORI_WEIGHT_GRAMS = 3;

export class NoriSheet extends IngredientObject {
  constructor(scene, x, y, options = {}) {
    const hasSpreadRice = options.hasSpreadRice === true;
    const wholeWeightGrams = options.wholeWeightGrams
      ?? NORI_WEIGHT_GRAMS + (hasSpreadRice ? (options.riceWeightGrams ?? 20) : 0);
    const { textureKey, variantIndex } = resolveVariantTexture(scene, hasSpreadRice ? RICE_ON_NORI_BASE_KEY : NORI_BASE_KEY, options, {
      width: NORI_WIDTH,
      height: NORI_HEIGHT,
      pool: NORI_VARIANT_POOL,
      paint: hasSpreadRice ? NoriSheet.paintRiceSpreadTexture : NoriSheet.paintTexture,
      shapeNoise: { chipChance: 0.018, bumpChance: 0.012 },
    });

    const cropX = options.cropX ?? 0;
    const cropY = options.cropY ?? 0;
    const cropWidth = options.cropWidth ?? NORI_WIDTH;
    const cropHeight = options.cropHeight ?? NORI_HEIGHT;
    const displayWidth = cropWidth * PIXEL;
    const displayHeight = cropHeight * PIXEL;

    super(scene, x, y, displayWidth, displayHeight, {
      ...options,
      visualVariation: false,
    });
    this.setCenteredHitbox(displayWidth, displayHeight);
    this.shadowEdgeScaleX = 1;
    this.shadowEdgeScaleY = 1;
    this.shadowEdgeDragScaleX = 1;
    this.shadowEdgeDragScaleY = 1;
    this.shadowCoreScaleX = 1;
    this.shadowCoreScaleY = 1;
    this.restShadowOffset = 0;
    this.ownWeightGrams = options.weightGrams
      ?? NoriSheet.getPieceWeightGrams(cropWidth, cropHeight, wholeWeightGrams);
    this.restDepth = 18;
    this.footprintDepthFactor = 1;
    this.variantIndex = variantIndex;
    this.hasSpreadRice = hasSpreadRice;
    this.wholeWeightGrams = wholeWeightGrams;
    this.riceWeightGrams = options.riceWeightGrams ?? Math.max(0, wholeWeightGrams - NORI_WEIGHT_GRAMS);
    this.displayName = hasSpreadRice ? 'Rice on Nori' : 'Nori Sheet';
    this.stackCategory = 'nori';
    this.acceptedStackCategories = hasSpreadRice ? null : ['rice'];
    this.maxStackedItems = 1;
    this.stackOffsetX = 0;
    this.stackOffsetY = -2;
    this.spreadableStackCategory = hasSpreadRice ? null : 'rice';
    this.spreadRequiredStrokes = 7;
    this.spreadStrokeDistance = 16;
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
    this.applyRestingDepth();
  }

  createSpreadStackResult(rice) {
    if (rice?.stackCategory !== 'rice') {
      return null;
    }

    const result = new NoriSheet(this.scene, this.x, this.y, {
      hasSpreadRice: true,
      riceWeightGrams: rice.weightGrams,
      wholeWeightGrams: this.ownWeightGrams + rice.weightGrams,
      variant: this.variantIndex,
      visualVariation: this.getIngredientVisualVariation?.(),
    });

    result.setObjectRotation(this.rotation ?? 0);

    return result;
  }

  getCuttableReplacementOptions() {
    return {
      hasSpreadRice: this.hasSpreadRice,
      riceWeightGrams: this.riceWeightGrams,
      wholeWeightGrams: this.wholeWeightGrams,
    };
  }

  setStackHighlight(active) {
    if (this.stackHighlightActive === active) {
      return;
    }

    this.stackHighlightActive = active;

    this.draggableParts.forEach((part) => {
      if (part.excludeFromCompositionShadow || !part.setTint) {
        return;
      }

      if (active) {
        if (part.setTintFill) {
          part.setTintFill(0xa8f0b8);
        } else {
          part.setTint(0xa8f0b8);
        }
        part.setAlpha?.(0.92);
      } else {
        part.clearTint();
        part.setAlpha?.(1);
      }
    });
  }

  static getPieceWeightGrams(cropWidth, cropHeight, wholeWeightGrams = NORI_WEIGHT_GRAMS) {
    const wholeArea = NORI_WIDTH * NORI_HEIGHT;
    const pieceArea = cropWidth * cropHeight;

    return (pieceArea / wholeArea) * wholeWeightGrams;
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

  static paintRiceSpreadTexture(context, rng) {
    const jitter = (range) => Math.floor(rng() * (range * 2 + 1)) - range;
    const chance = (probability) => rng() < probability;

    NoriSheet.paintTexture(context, rng);

    context.fillStyle = toHexColor(0xe6ddc7);
    context.fillRect(6, 7, 46, 25);
    context.fillRect(5, 11, 48, 17);
    context.fillRect(9, 5, 39, 3);
    context.fillRect(10, 32, 38, 2);

    context.fillStyle = toHexColor(0xf6f0df);
    context.fillRect(7, 8, 44, 22);
    context.fillRect(6, 13, 46, 13);
    context.fillRect(11, 6, 35, 2);
    context.fillRect(12, 30, 34, 2);

    context.fillStyle = toHexColor(0xfff8e8);
    context.fillRect(9, 10, 14, 3);
    context.fillRect(27, 9, 17, 2);
    context.fillRect(8, 16, 21, 3);
    context.fillRect(33, 17, 16, 3);
    context.fillRect(11, 24, 16, 3);
    context.fillRect(31, 25, 14, 2);

    context.fillStyle = toHexColor(0xcfc3ac);
    for (let i = 0; i < 34; i += 1) {
      if (!chance(0.78)) {
        continue;
      }

      context.fillRect(
        7 + Math.floor(rng() * 45) + jitter(1),
        7 + Math.floor(rng() * 24) + jitter(1),
        chance(0.4) ? 2 : 1,
        1,
      );
    }

    context.fillStyle = toHexColor(0x214b3d);
    context.fillRect(5, 5, 48, 1);
    context.fillRect(4, 7, 1, 27);
    context.fillRect(53, 7, 1, 27);
    context.fillRect(7, 35, 44, 1);
  }
}

Object.getOwnPropertyNames(CuttableObject.prototype).forEach((name) => {
  if (name !== 'constructor') {
    NoriSheet.prototype[name] = CuttableObject.prototype[name];
  }
});
