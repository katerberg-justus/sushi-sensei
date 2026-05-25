import { COLORS } from '../game/constants.js';
import { CuttableObject } from './CuttableObject.js';
import { FishFlipBehavior, setupFishFlip } from './FishFlipBehavior.js';
import { IngredientObject } from './IngredientObject.js';
import { resolveVariantTexture, toHexColor } from './ProceduralTexture.js';

const PIXEL = 2.25;
const DEFAULT_VARIANT_POOL = 6;
const DEFAULT_WIDTH = 58;
const DEFAULT_HEIGHT = 28;
const DEFAULT_WEIGHT_GRAMS = 56;

export const CUTTABLE_FISH_STYLES = {
  salmon: {
    displayName: 'Salmon',
    subtypes: [
      { key: 'taiseiyou-salmon', displayName: 'Taiseiyou Salmon' },
      { key: 'king-salmon', displayName: 'King Salmon' },
      { key: 'benizake', displayName: 'Benizake' },
    ],
    baseKey: 'cuttable-salmon-pixel',
    base: COLORS.salmon,
    shadow: COLORS.salmonStroke,
    highlight: 0xffa384,
    fat: 0xffd7c7,
    glint: 0xffeadf,
  },
  maguro: {
    displayName: 'Maguro',
    subtypes: [
      { key: 'akami', displayName: 'Akami' },
      { key: 'chutoro', displayName: 'Chutoro' },
      { key: 'otoro', displayName: 'Otoro' },
      { key: 'kihada', displayName: 'Kihada' },
      { key: 'mebachi', displayName: 'Mebachi' },
    ],
    baseKey: 'cuttable-maguro-pixel',
    base: 0xb93446,
    shadow: 0x7f2231,
    highlight: 0xd65361,
    fat: 0xe98e96,
    glint: 0xf7b8bd,
  },
  hamachi: {
    displayName: 'Hamachi',
    subtypes: [
      { key: 'hamachi', displayName: 'Hamachi' },
      { key: 'buri', displayName: 'Buri' },
      { key: 'kanpachi', displayName: 'Kanpachi' },
    ],
    baseKey: 'cuttable-hamachi-pixel',
    base: 0xf1c49d,
    shadow: 0xd69b72,
    highlight: 0xf8d7b7,
    fat: 0xffead0,
    glint: 0xfff3df,
  },
  tai: {
    displayName: 'Tai',
    subtypes: [
      { key: 'madai', displayName: 'Madai' },
      { key: 'kurodai', displayName: 'Kurodai' },
      { key: 'kinmedai', displayName: 'Kinmedai' },
    ],
    baseKey: 'cuttable-tai-pixel',
    base: 0xf4ddd7,
    shadow: 0xd7ada7,
    highlight: 0xffeee9,
    fat: 0xffffff,
    glint: 0xfff8f4,
    edgeAccent: 0xe7898b,
  },
  hirame: {
    displayName: 'Hirame',
    subtypes: [
      { key: 'hirame', displayName: 'Hirame' },
      { key: 'ohyo', displayName: 'Ohyo' },
      { key: 'engawa', displayName: 'Engawa' },
    ],
    baseKey: 'cuttable-hirame-pixel',
    base: 0xf7eee9,
    shadow: 0xd9c9c1,
    highlight: 0xfffaf4,
    fat: 0xffffff,
    glint: 0xfffdf8,
    edgeAccent: 0xd6a7a0,
  },
  suzuki: {
    displayName: 'Suzuki',
    subtypes: [
      { key: 'suzuki', displayName: 'Suzuki' },
    ],
    baseKey: 'cuttable-suzuki-pixel',
    base: 0xf0f1e6,
    shadow: 0xc6cdc0,
    highlight: 0xfbfff4,
    fat: 0xffffff,
    glint: 0xfffffb,
    edgeAccent: 0xb8c6c0,
  },
  saba: {
    displayName: 'Saba',
    subtypes: [
      { key: 'masaba', displayName: 'Masaba' },
      { key: 'gomasaba', displayName: 'Gomasaba' },
    ],
    baseKey: 'cuttable-saba-pixel',
    base: 0xd7d9dc,
    shadow: 0x8d9aa5,
    highlight: 0xf0f4f7,
    fat: 0xf8f1df,
    glint: 0xffffff,
    edgeAccent: 0x5f6f7e,
  },
  aji: {
    displayName: 'Aji',
    subtypes: [
      { key: 'ma-aji', displayName: 'Ma-aji' },
      { key: 'shima-aji', displayName: 'Shima-aji' },
    ],
    baseKey: 'cuttable-aji-pixel',
    base: 0xe0d6c4,
    shadow: 0xa99b88,
    highlight: 0xf5ecd8,
    fat: 0xfff6df,
    glint: 0xfffbef,
    edgeAccent: 0xb7c0b0,
  },
  iwashi: {
    displayName: 'Iwashi',
    subtypes: [
      { key: 'maiwashi', displayName: 'Maiwashi' },
      { key: 'katakuchi-iwashi', displayName: 'Katakuchi-iwashi' },
    ],
    baseKey: 'cuttable-iwashi-pixel',
    base: 0xcbd2d7,
    shadow: 0x7d8994,
    highlight: 0xe8eef2,
    fat: 0xf5ecd7,
    glint: 0xffffff,
    edgeAccent: 0x53677a,
  },
  unagi: {
    displayName: 'Unagi',
    subtypes: [
      { key: 'unagi', displayName: 'Unagi' },
      { key: 'anago', displayName: 'Anago' },
    ],
    baseKey: 'cuttable-unagi-pixel',
    base: 0x875036,
    shadow: 0x66412e,
    highlight: 0xa96441,
    fat: 0xba7650,
    glaze: 0x5a2f22,
    grill: 0x704331,
    width: 54,
    height: 30,
    weightGrams: 62,
    shapeNoise: { chipChance: 0, bumpChance: 0.012 },
  },
};

export class CuttableFish extends IngredientObject {
  constructor(scene, x, y, options = {}) {
    const fishType = CuttableFish.resolveFishType(options.fishType);
    const fishStyle = CUTTABLE_FISH_STYLES[fishType];
    const fishSubtype = CuttableFish.resolveFishSubtype(fishType, options.fishSubtype);
    const fishSubtypeStyle = CuttableFish.getFishSubtypeStyle(fishType, fishSubtype);
    const textureWidth = fishStyle.width ?? DEFAULT_WIDTH;
    const textureHeight = fishStyle.height ?? DEFAULT_HEIGHT;
    const { textureKey, variantIndex } = resolveVariantTexture(scene, fishStyle.baseKey, options, {
      width: textureWidth,
      height: textureHeight,
      pool: fishStyle.variantPool ?? DEFAULT_VARIANT_POOL,
      paint: (context, rng) => CuttableFish.paintTexture(context, rng, fishStyle),
      shapeNoise: fishStyle.shapeNoise ?? { chipChance: 0.035, bumpChance: 0.024 },
    });

    const cropX = options.cropX ?? 0;
    const cropY = options.cropY ?? 0;
    const cropWidth = options.cropWidth ?? textureWidth;
    const cropHeight = options.cropHeight ?? textureHeight;
    const displayWidth = cropWidth * PIXEL;
    const displayHeight = cropHeight * PIXEL;

    super(scene, x, y, displayWidth, displayHeight, options);
    this.setCenteredHitbox(displayWidth, displayHeight);
    this.ownWeightGrams = options.weightGrams
      ?? CuttableFish.getPieceWeightGrams(cropWidth, cropHeight, fishStyle);
    this.restDepth = 20;
    this.variantIndex = variantIndex;

    this.stackCategory = 'fish';
    this.fishType = fishType;
    this.fishSubtype = fishSubtype;
    this.fishDisplayName = fishStyle.displayName;
    this.fishSubtypeDisplayName = fishSubtypeStyle?.displayName ?? null;
    this.displayName = this.fishSubtypeDisplayName ?? fishStyle.displayName;
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

  static resolveFishType(fishType = 'salmon') {
    return CUTTABLE_FISH_STYLES[fishType] ? fishType : 'salmon';
  }

  static resolveFishSubtype(fishType, fishSubtype = null) {
    if (typeof fishSubtype !== 'string') {
      return null;
    }

    const normalizedSubtype = fishSubtype.trim().toLowerCase();

    return CuttableFish.getFishSubtypeStyle(fishType, normalizedSubtype)
      ? normalizedSubtype
      : null;
  }

  static getFishSubtypeStyle(fishType, fishSubtype) {
    if (!fishSubtype) {
      return null;
    }

    return (CUTTABLE_FISH_STYLES[fishType]?.subtypes ?? [])
      .find((subtype) => subtype.key === fishSubtype) ?? null;
  }

  static getPieceWeightGrams(cropWidth, cropHeight, fishStyle = CUTTABLE_FISH_STYLES.salmon) {
    const wholeArea = (fishStyle.width ?? DEFAULT_WIDTH) * (fishStyle.height ?? DEFAULT_HEIGHT);
    const pieceArea = cropWidth * cropHeight;

    return (pieceArea / wholeArea) * (fishStyle.weightGrams ?? DEFAULT_WEIGHT_GRAMS);
  }

  static paintTexture(context, rng, fishStyle) {
    if (fishStyle.glaze) {
      CuttableFish.paintUnagiTexture(context, rng, fishStyle);
      return;
    }

    CuttableFish.paintSashimiTexture(context, rng, fishStyle);
  }

  static paintSashimiTexture(context, rng, fishStyle) {
    const jitter = (range) => Math.floor(rng() * (range * 2 + 1)) - range;
    const chance = (probability) => rng() < probability;

    context.fillStyle = toHexColor(fishStyle.shadow);
    context.fillRect(8, 20, 42, 4);
    context.fillRect(13, 24, 32, 1);
    context.fillRect(4, 12, 4, 6);
    context.fillRect(50, 11, 4, 7);

    context.fillStyle = toHexColor(fishStyle.base);
    context.fillRect(6, 16, 46, 6);
    context.fillRect(10, 22, 38, 3);
    context.fillRect(3, 11, 4, 7);
    context.fillRect(52, 10, 3, 8);
    context.fillRect(7, 7, 44, 13);
    context.fillRect(10, 5, 36, 4);
    context.fillRect(4, 11, 50, 6);
    context.fillRect(11, 18, 36, 3);

    if (fishStyle.edgeAccent) {
      context.fillStyle = toHexColor(fishStyle.edgeAccent);
      context.fillRect(6, 7, 44, 1);
      context.fillRect(4, 11, 50, 1);
      context.fillRect(7, 20, 43, 1);
    }

    context.fillStyle = toHexColor(fishStyle.highlight);
    [
      [{ x: 12, y: 6, w: 12 }, { x: 31, y: 6, w: 10 }],
      [{ x: 8, y: 10, w: 12 }, { x: 28, y: 10, w: 14 }],
      [{ x: 15, y: 15, w: 11 }, { x: 35, y: 14, w: 9 }],
      [{ x: 8, y: 18, w: 12 }, { x: 28, y: 18, w: 12 }],
      [{ x: 15, y: 22, w: 9 }, { x: 33, y: 22, w: 7 }],
    ].forEach((row) => {
      row.forEach((segment) => {
        if (!chance(0.85)) {
          return;
        }

        context.fillRect(
          segment.x + jitter(1),
          segment.y + jitter(1),
          Math.max(3, segment.w + jitter(2)),
          1,
        );
      });
    });

    context.fillStyle = toHexColor(fishStyle.fat);
    [
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
    ].forEach((thread) => {
      if (!chance(0.86)) {
        return;
      }

      CuttableFish.paintFatThread(
        context,
        thread.x + jitter(1),
        thread.y + jitter(1),
        thread.segments.map((width) => Math.max(2, width + jitter(1))),
      );
    });

    context.fillStyle = toHexColor(fishStyle.glint);
    for (let i = 0; i < 6; i += 1) {
      if (chance(0.6)) {
        context.fillRect(8 + Math.floor(rng() * 40), 6 + Math.floor(rng() * 17), 1, 1);
      }
    }
  }

  static paintUnagiTexture(context, rng, fishStyle) {
    const jitter = (range) => Math.floor(rng() * (range * 2 + 1)) - range;

    context.fillStyle = toHexColor(fishStyle.shadow);
    context.fillRect(8, 21, 38, 4);
    context.fillRect(5, 14, 45, 9);
    context.fillRect(7, 8, 40, 8);
    context.fillRect(11, 5, 31, 4);
    context.fillRect(3, 13, 4, 7);
    context.fillRect(49, 12, 3, 8);

    context.fillStyle = toHexColor(fishStyle.base);
    context.fillRect(8, 18, 39, 5);
    context.fillRect(6, 12, 44, 7);
    context.fillRect(8, 8, 39, 6);
    context.fillRect(12, 6, 30, 3);
    context.fillRect(10, 23, 34, 2);

    context.fillStyle = toHexColor(fishStyle.highlight);
    context.fillRect(10, 9, 32, 2);
    context.fillRect(8, 13, 38, 2);
    context.fillRect(11, 18, 31, 2);

    context.fillStyle = toHexColor(fishStyle.glaze);
    context.fillRect(8, 11, 39, 1);
    context.fillRect(7, 16, 41, 1);
    context.fillRect(11, 21, 32, 1);

    context.fillStyle = toHexColor(fishStyle.grill);
    [13, 22, 31, 40].forEach((x, index) => {
      const top = 8 + jitter(1);
      const offsetX = x + jitter(1);
      const segmentCount = index % 2 === 0 ? 3 : 2;

      for (let segment = 0; segment < segmentCount; segment += 1) {
        const y = top + segment * 5 + jitter(1);
        const height = 2 + Math.floor(rng() * 3);

        context.fillRect(offsetX + jitter(1), y, 1, height);
      }
    });

  }

  static paintFatThread(context, x, y, segments, height = 1) {
    segments.forEach((width, index) => {
      context.fillRect(x + index * 4, y + index, width, height);
    });
  }

  destroy(fromScene) {
    this.stopFishFlipTween?.();
    super.destroy(fromScene);
  }
}

Object.getOwnPropertyNames(CuttableObject.prototype).forEach((name) => {
  if (name !== 'constructor') {
    CuttableFish.prototype[name] = CuttableObject.prototype[name];
  }
});

Object.entries(FishFlipBehavior).forEach(([name, method]) => {
  if (name !== 'destroy') {
    CuttableFish.prototype[name] = method;
  }
});
