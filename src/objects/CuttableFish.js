import { COLORS } from '../game/constants.js';
import { CuttableObject } from './CuttableObject.js';
import { FishFlipBehavior, setupFishFlip } from './FishFlipBehavior.js';
import { IngredientObject } from './IngredientObject.js';
import { JAPANESE_FISH_NAMES, JAPANESE_FISH_SUBTYPE_NAMES } from './JapaneseNames.js';
import { resolveVariantTexture, toHexColor } from './ProceduralTexture.js';

const PIXEL = 2.25;
const DEFAULT_VARIANT_POOL = 6;
const DEFAULT_WIDTH = 58;
const DEFAULT_HEIGHT = 28;
const DEFAULT_WEIGHT_GRAMS = 56;

export const CUTTABLE_FISH_STYLES = {
  salmon: {
    displayName: 'Salmon',
    japaneseName: JAPANESE_FISH_NAMES.salmon,
    subtypes: [
      {
        key: 'taiseiyou-salmon',
        displayName: 'Taiseiyou Salmon',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.taiseiyouSalmon,
        palette: {
          base: 0xff8e6b,
          shadow: 0xc55a3f,
          highlight: 0xffa384,
          fat: 0xffd7c7,
          glint: 0xffeadf,
        },
        fatDensity: 1.2,
      },
      {
        key: 'king-salmon',
        displayName: 'King Salmon',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.kingSalmon,
        palette: {
          base: 0xe46a45,
          shadow: 0xa3402a,
          highlight: 0xf28562,
          fat: 0xffc9b3,
          glint: 0xffe0d0,
        },
        fatDensity: 1.6,
      },
      {
        key: 'benizake',
        displayName: 'Benizake',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.benizake,
        palette: {
          base: 0xd2452c,
          shadow: 0x922b1a,
          highlight: 0xe6614a,
          fat: 0xee907b,
          glint: 0xf8c2b3,
        },
        fatDensity: 0.5,
      },
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
    japaneseName: JAPANESE_FISH_NAMES.maguro,
    subtypes: [
      {
        key: 'akami',
        displayName: 'Akami',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.akami,
        palette: {
          base: 0xa11f30,
          shadow: 0x6b1622,
          highlight: 0xc23a4a,
          fat: 0xd66b73,
          glint: 0xe89aa0,
        },
        fatDensity: 0.3,
      },
      {
        key: 'chutoro',
        displayName: 'Chutoro',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.chutoro,
        palette: {
          base: 0xc14555,
          shadow: 0x842533,
          highlight: 0xdc6571,
          fat: 0xefa8b0,
          glint: 0xf8c8cf,
        },
        fatDensity: 1.0,
      },
      {
        key: 'otoro',
        displayName: 'Otoro',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.otoro,
        palette: {
          base: 0xe89aa0,
          shadow: 0xb56973,
          highlight: 0xf2b6bc,
          fat: 0xfff0ec,
          glint: 0xffffff,
        },
        fatDensity: 1.8,
      },
      {
        key: 'kihada',
        displayName: 'Kihada',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.kihada,
        palette: {
          base: 0xc25a5a,
          shadow: 0x8a3a3a,
          highlight: 0xd87878,
          fat: 0xeea7a3,
          glint: 0xf7c9c4,
        },
        fatDensity: 0.5,
      },
      {
        key: 'mebachi',
        displayName: 'Mebachi',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.mebachi,
        palette: {
          base: 0xae2d3f,
          shadow: 0x76182a,
          highlight: 0xcc4555,
          fat: 0xe28a92,
          glint: 0xf2b3b8,
        },
        fatDensity: 0.4,
      },
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
    japaneseName: JAPANESE_FISH_NAMES.hamachi,
    subtypes: [
      {
        key: 'hamachi',
        displayName: 'Hamachi',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.hamachi,
        palette: {
          base: 0xf1c49d,
          shadow: 0xd69b72,
          highlight: 0xf8d7b7,
          fat: 0xffead0,
          glint: 0xfff3df,
        },
        fatDensity: 1.0,
      },
      {
        key: 'buri',
        displayName: 'Buri',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.buri,
        palette: {
          base: 0xe39c7a,
          shadow: 0xa86b50,
          highlight: 0xf2b694,
          fat: 0xfdd6b6,
          glint: 0xffe6cd,
        },
        fatDensity: 1.5,
      },
      {
        key: 'kanpachi',
        displayName: 'Kanpachi',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.kanpachi,
        palette: {
          base: 0xe6cda0,
          shadow: 0xb09472,
          highlight: 0xf4dcb1,
          fat: 0xffeec6,
          glint: 0xfff7da,
        },
        fatDensity: 0.6,
      },
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
    japaneseName: JAPANESE_FISH_NAMES.tai,
    subtypes: [
      {
        key: 'madai',
        displayName: 'Madai',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.madai,
        palette: {
          base: 0xf4ddd7,
          shadow: 0xd7ada7,
          highlight: 0xffeee9,
          fat: 0xffffff,
          glint: 0xfff8f4,
          edgeAccent: 0xe7898b,
        },
        fatDensity: 0.6,
      },
      {
        key: 'kurodai',
        displayName: 'Kurodai',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.kurodai,
        palette: {
          base: 0xd9c4be,
          shadow: 0x9c8079,
          highlight: 0xe8d3cc,
          fat: 0xf5e6e1,
          glint: 0xfaf0ec,
          edgeAccent: 0x6d6260,
        },
        fatDensity: 0.4,
      },
      {
        key: 'kinmedai',
        displayName: 'Kinmedai',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.kinmedai,
        palette: {
          base: 0xf6d6c0,
          shadow: 0xd09f88,
          highlight: 0xffe5cf,
          fat: 0xfff3e0,
          glint: 0xfff9ec,
          edgeAccent: 0xe8a86c,
        },
        fatDensity: 0.9,
      },
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
    japaneseName: JAPANESE_FISH_NAMES.hirame,
    subtypes: [
      {
        key: 'hirame',
        displayName: 'Hirame',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.hirame,
        palette: {
          base: 0xf7eee9,
          shadow: 0xd9c9c1,
          highlight: 0xfffaf4,
          fat: 0xffffff,
          glint: 0xfffdf8,
          edgeAccent: 0xd6a7a0,
        },
        fatDensity: 0.4,
      },
      {
        key: 'ohyo',
        displayName: 'Ohyo',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.ohyo,
        palette: {
          base: 0xe6dcd4,
          shadow: 0xb0a59c,
          highlight: 0xf2e9e0,
          fat: 0xf9f3ec,
          glint: 0xfdfaf4,
          edgeAccent: 0x8a8079,
        },
        fatDensity: 0.6,
      },
      {
        key: 'engawa',
        displayName: 'Engawa',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.engawa,
        palette: {
          base: 0xfaf2ec,
          shadow: 0xc7b6a8,
          highlight: 0xfff8f1,
          fat: 0xfff5e6,
          glint: 0xffffff,
          edgeAccent: 0xc69680,
        },
        fatDensity: 1.4,
      },
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
    japaneseName: JAPANESE_FISH_NAMES.suzuki,
    subtypes: [
      { key: 'suzuki', displayName: 'Suzuki', japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.suzuki },
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
    japaneseName: JAPANESE_FISH_NAMES.saba,
    subtypes: [
      {
        key: 'masaba',
        displayName: 'Masaba',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.masaba,
        palette: {
          base: 0xd0d6dd,
          shadow: 0x76879a,
          highlight: 0xe6ecf2,
          fat: 0xf6efde,
          glint: 0xffffff,
          edgeAccent: 0x435a6f,
        },
        fatDensity: 1.0,
      },
      {
        key: 'gomasaba',
        displayName: 'Gomasaba',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.gomasaba,
        palette: {
          base: 0xc7bcae,
          shadow: 0x7e7363,
          highlight: 0xddd2c1,
          fat: 0xf2e9d3,
          glint: 0xfaf4e2,
          edgeAccent: 0x4a4234,
        },
        fatDensity: 1.2,
      },
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
    japaneseName: JAPANESE_FISH_NAMES.aji,
    subtypes: [
      {
        key: 'ma-aji',
        displayName: 'Ma-aji',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.maAji,
        palette: {
          base: 0xddd1bd,
          shadow: 0xa39682,
          highlight: 0xf2e8d3,
          fat: 0xfff3de,
          glint: 0xfff9ed,
          edgeAccent: 0xa9b3a4,
        },
        fatDensity: 0.9,
      },
      {
        key: 'shima-aji',
        displayName: 'Shima-aji',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.shimaAji,
        palette: {
          base: 0xe9c4b2,
          shadow: 0xb18877,
          highlight: 0xf6d6c4,
          fat: 0xffe7d4,
          glint: 0xfff2e3,
          edgeAccent: 0xc78876,
        },
        fatDensity: 1.3,
      },
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
    japaneseName: JAPANESE_FISH_NAMES.iwashi,
    subtypes: [
      {
        key: 'maiwashi',
        displayName: 'Maiwashi',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.maiwashi,
        palette: {
          base: 0xc6cfd5,
          shadow: 0x73818d,
          highlight: 0xe2ebef,
          fat: 0xf5ecd7,
          glint: 0xffffff,
          edgeAccent: 0x49607a,
        },
        fatDensity: 0.9,
      },
      {
        key: 'katakuchi-iwashi',
        displayName: 'Katakuchi-iwashi',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.katakuchiIwashi,
        palette: {
          base: 0xb1aea8,
          shadow: 0x615f5a,
          highlight: 0xc9c5be,
          fat: 0xe9d7b3,
          glint: 0xf2e6c7,
          edgeAccent: 0x2f3236,
        },
        fatDensity: 1.1,
      },
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
    japaneseName: JAPANESE_FISH_NAMES.unagi,
    subtypes: [
      {
        key: 'unagi',
        displayName: 'Unagi',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.unagi,
        palette: {
          base: 0x875036,
          shadow: 0x66412e,
          highlight: 0xa96441,
          fat: 0xba7650,
          glaze: 0x5a2f22,
          grill: 0x704331,
        },
      },
      {
        key: 'anago',
        displayName: 'Anago',
        japaneseName: JAPANESE_FISH_SUBTYPE_NAMES.anago,
        palette: {
          base: 0xa67452,
          shadow: 0x7a5238,
          highlight: 0xc28a64,
          fat: 0xd9a079,
          glaze: 0x6a3d28,
          grill: 0x8a563c,
        },
      },
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
    const mergedStyle = CuttableFish.mergeSubtypeStyle(fishStyle, fishSubtypeStyle);
    const subtypeBaseKey = fishSubtype ? `${fishStyle.baseKey}-${fishSubtype}` : fishStyle.baseKey;
    const textureWidth = fishStyle.width ?? DEFAULT_WIDTH;
    const textureHeight = fishStyle.height ?? DEFAULT_HEIGHT;
    const { textureKey, variantIndex } = resolveVariantTexture(scene, subtypeBaseKey, options, {
      width: textureWidth,
      height: textureHeight,
      pool: fishStyle.variantPool ?? DEFAULT_VARIANT_POOL,
      paint: (context, rng) => CuttableFish.paintTexture(context, rng, mergedStyle),
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
    this.fishJapaneseName = fishStyle.japaneseName ?? null;
    this.fishSubtypeJapaneseName = fishSubtypeStyle?.japaneseName ?? null;
    this.displayName = this.fishSubtypeDisplayName ?? fishStyle.displayName;
    this.setJapaneseName(this.fishSubtypeJapaneseName ?? this.fishJapaneseName);
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

  static mergeSubtypeStyle(fishStyle, subtypeStyle) {
    if (!subtypeStyle) {
      return fishStyle;
    }

    return {
      ...fishStyle,
      ...(subtypeStyle.palette ?? {}),
      fatDensity: subtypeStyle.fatDensity ?? fishStyle.fatDensity ?? 1,
    };
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
    const fatDensity = Math.max(0, fishStyle.fatDensity ?? 1);
    const fatChance = Math.min(1, 0.86 * fatDensity);
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
      if (!chance(fatChance)) {
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
