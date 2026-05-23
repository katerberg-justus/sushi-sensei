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
const NORI_PERSPECTIVE_SQUASH = 0.6;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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
    this.acceptedStackCategories = hasSpreadRice ? ['fish'] : ['rice'];
    this.maxStackedItems = hasSpreadRice ? 8 : 1;
    this.stackOffsetX = 0;
    this.stackOffsetY = hasSpreadRice ? -4 : -2;
    this.toppingRestOffsetY = -4;
    this.preserveStackChildRotation = hasSpreadRice;
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

    this.setScale(1, NORI_PERSPECTIVE_SQUASH);
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

  getStackPlacementOffset(child, drop = {}) {
    if (!this.hasSpreadRice) {
      return null;
    }

    const scaleX = this.scaleX || 1;
    const scaleY = this.scaleY || 1;
    const halfWidth = (NORI_WIDTH * PIXEL) / 2;
    const halfHeight = (NORI_HEIGHT * PIXEL) / 2;
    const dropX = drop.x ?? child?.x ?? this.x;
    const dropY = drop.y ?? child?.y ?? this.y;
    const localX = (dropX - this.x) / scaleX;
    const localY = (dropY - this.y) / scaleY;
    const childRect = child?.getWorldHitboxRect?.(dropX, dropY);
    const childHalfW = childRect ? childRect.width / 2 : 0;
    const childHalfH = childRect ? childRect.height / (2 * scaleY) : 0;
    const clampedX = clamp(localX, -halfWidth + childHalfW, halfWidth - childHalfW);
    const clampedY = clamp(localY, -halfHeight + childHalfH, halfHeight - childHalfH);

    return { x: clampedX, y: clampedY + this.toppingRestOffsetY };
  }

  getRollCoverage() {
    if (!this.hasSpreadRice || !this.stackChildren?.length) {
      return { fraction: 0, covered: false, segments: [] };
    }

    const sheetHalfWidth = (NORI_WIDTH * PIXEL) / 2;
    const sheetLeft = this.x - sheetHalfWidth;
    const sheetRight = this.x + sheetHalfWidth;
    const intervals = [];

    this.stackChildren.forEach((child) => {
      const rect = child.getWorldHitboxRect?.();

      if (!rect) {
        return;
      }

      const left = Math.max(sheetLeft, rect.x);
      const right = Math.min(sheetRight, rect.x + rect.width);

      if (right > left) {
        intervals.push([left, right]);
      }
    });

    intervals.sort((a, b) => a[0] - b[0]);

    const merged = [];
    intervals.forEach(([l, r]) => {
      const last = merged[merged.length - 1];
      if (last && l <= last[1]) {
        last[1] = Math.max(last[1], r);
      } else {
        merged.push([l, r]);
      }
    });

    const coveredLength = merged.reduce((sum, [l, r]) => sum + (r - l), 0);
    const sheetLength = sheetRight - sheetLeft;
    const fraction = sheetLength > 0 ? coveredLength / sheetLength : 0;

    return {
      fraction,
      covered: fraction >= 0.999,
      segments: merged.map(([l, r]) => ({ left: l, right: r })),
    };
  }

  getCuttableReplacementOptions() {
    return {
      hasSpreadRice: this.hasSpreadRice,
      riceWeightGrams: this.riceWeightGrams,
      wholeWeightGrams: this.wholeWeightGrams,
    };
  }

  static getPieceWeightGrams(cropWidth, cropHeight, wholeWeightGrams = NORI_WEIGHT_GRAMS) {
    const wholeArea = NORI_WIDTH * NORI_HEIGHT;
    const pieceArea = cropWidth * cropHeight;

    return (pieceArea / wholeArea) * wholeWeightGrams;
  }

  static paintTexture(context, rng) {
    const jitter = (range) => Math.floor(rng() * (range * 2 + 1)) - range;
    const chance = (probability) => rng() < probability;
    const fillSpeckles = (color, count, minX, minY, maxX, maxY, widthChance = 0.3, heightChance = 0.08) => {
      context.fillStyle = toHexColor(color);

      for (let i = 0; i < count; i += 1) {
        if (!chance(0.86)) {
          continue;
        }

        const x = minX + Math.floor(rng() * (maxX - minX + 1));
        const y = minY + Math.floor(rng() * (maxY - minY + 1));

        context.fillRect(
          x,
          y,
          chance(widthChance) ? 4 + Math.floor(rng() * 3) : 2,
          chance(heightChance) ? 2 + Math.floor(rng() * 2) : 2,
        );

        if (chance(0.32)) {
          context.fillRect(x + jitter(1), y + 1 + jitter(1), 3 + Math.floor(rng() * 3), 2);
        }
      }
    };

    context.fillStyle = toHexColor(0x102821);
    context.fillRect(5, 3, 48, 2);
    context.fillRect(3, 5, 52, 31);
    context.fillRect(6, 36, 46, 2);

    context.fillStyle = toHexColor(0x18372e);
    context.fillRect(5, 6, 48, 28);
    context.fillRect(7, 4, 44, 2);
    context.fillRect(7, 34, 44, 2);

    context.fillStyle = toHexColor(0x142e27);
    for (let y = 7; y < 34; y += 3) {
      const offset = jitter(2);
      context.fillRect(6 + offset, y + jitter(1), 45 - Math.abs(offset), 1);
    }

    context.fillStyle = toHexColor(0x214b3d);
    for (let i = 0; i < 18; i += 1) {
      const x = 7 + Math.floor(rng() * 42);
      const y = 7 + Math.floor(rng() * 25);
      const width = 7 + Math.floor(rng() * 12);

      context.fillRect(x, y, Math.min(width, 52 - x), 2);
    }

    context.fillStyle = toHexColor(0x0f241e);
    for (let i = 0; i < 14; i += 1) {
      const x = 6 + Math.floor(rng() * 44);
      const y = 8 + Math.floor(rng() * 24);
      const width = 6 + Math.floor(rng() * 10);

      context.fillRect(x, y, Math.min(width, 53 - x), 2);
    }

    context.fillStyle = toHexColor(0x0b1a16);
    context.fillRect(5, 5, 48, 1);
    context.fillRect(4, 7, 1, 27);
    context.fillRect(53, 7, 1, 27);
    context.fillRect(7, 35, 44, 1);

    context.fillStyle = toHexColor(0x2d5d4a);
    for (let y = 8; y < 33; y += 4) {
      if (chance(0.8)) {
        context.fillRect(7 + jitter(1), y + jitter(1), 12 + Math.floor(rng() * 12), 2);
        context.fillRect(30 + jitter(2), y + jitter(1), 10 + Math.floor(rng() * 11), 2);
      }
    }

    context.fillStyle = toHexColor(0x143026);
    for (let x = 9; x < 51; x += 5) {
      if (chance(0.75)) {
        const y = 8 + Math.floor(rng() * 4);

        context.fillRect(x + jitter(1), y, 2, 8 + Math.floor(rng() * 10));
      }
    }

    fillSpeckles(0x3f745d, 22, 7, 6, 49, 33, 0.48, 0.2);
    fillSpeckles(0x2b5646, 28, 6, 7, 49, 34, 0.6, 0.22);
    fillSpeckles(0x0a1714, 22, 6, 6, 50, 34, 0.4, 0.2);
    fillSpeckles(0x1b4035, 30, 7, 7, 49, 33, 0.7, 0.26);
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
