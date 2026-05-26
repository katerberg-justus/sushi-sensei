import * as Phaser from 'phaser/dist/phaser.esm.js';
import {
  BITMAP_FONT_MADOU,
  BITMAP_FONT_PIXEL,
  FONT_FAMILY_MADOU,
  FONT_FAMILY_PIXEL,
  SCENE_KEYS,
} from '../game/constants.js';

const LATIN_FONT_CHARS = ' !"#$%&\'()*+,-./0123456789:;<=>?@'
  + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`'
  + 'abcdefghijklmnopqrstuvwxyz{|}~';

const charsFromRanges = (ranges) => ranges
  .flatMap(([start, end]) => Array.from(
    { length: end - start + 1 },
    (_value, index) => String.fromCodePoint(start + index),
  ))
  .join('');

const charsFromCodePoints = (codePoints) => String.fromCodePoint(...codePoints);
const uniqueChars = (chars) => Array.from(new Set([...chars])).join('');

const JAPANESE_PUNCTUATION_CHARS = charsFromCodePoints([
  0x3000, 0x3001, 0x3002, 0x30fb, 0x30fc, 0x300c, 0x300d, 0x300e,
  0x300f, 0x3010, 0x3011, 0xff08, 0xff09, 0xff1f, 0xff01, 0xffe5,
]);
const KANA_FONT_CHARS = charsFromRanges([
  [0x3041, 0x3096],
  [0x30a1, 0x30fa],
]);
const COMMON_SUSHI_CHARS = charsFromCodePoints([
  0x4e00, 0x4e8c, 0x4e09, 0x56db, 0x4e94, 0x516d, 0x4e03, 0x516b,
  0x4e5d, 0x5341, 0x5186, 0x5927, 0x5c0f, 0x4e0a, 0x4e0b, 0x4e2d,
  0x7c73, 0x9b5a, 0x9bad, 0x9bdb, 0x9baa, 0x9c24, 0x9c39, 0x9bd6,
  0x9c3b, 0x6d77, 0x8001, 0x86f8, 0x70cf, 0x8cca, 0x7389, 0x5b50,
  0x80e1, 0x74dc, 0x82d4, 0x5c71, 0x8475, 0x91a4, 0x6cb9, 0x9162,
  0x5869, 0x8336, 0x5bff, 0x53f8, 0x523a, 0x8eab, 0x63e1, 0x5dfb,
  0x8ecd, 0x8266, 0x4e3c,
  0x716e, 0x5207, 0x5237, 0x6bdb, 0x98ef, 0x6bbb, 0x4ed8, 0x9bf5,
  0x9b6c, 0x5e73, 0x76ee, 0x9c2f, 0x9c78, 0x8d64, 0x7a74, 0x7d05,
  0x7e01, 0x5074, 0x9ebb, 0x9593, 0x7247, 0x53e3, 0x9ec4, 0x808c,
  0x9c52, 0x4e4b, 0x4ecb, 0x91d1, 0x9ed2, 0x771f, 0x9262, 0x9b83,
  0x7e1e, 0x897f, 0x6d0b,
  0x5305, 0x4e01, 0x67f3, 0x5203, 0x51fa, 0x8584, 0x83dc, 0x5f15,
  0x6cb3, 0x8c5a,
]);

const BITMAP_FONT_DEFINITIONS = [
  {
    key: BITMAP_FONT_PIXEL,
    family: FONT_FAMILY_PIXEL,
    chars: LATIN_FONT_CHARS,
    cellWidth: 8,
    cellHeight: 8,
    charsPerRow: 16,
  },
  {
    key: BITMAP_FONT_MADOU,
    family: FONT_FAMILY_MADOU,
    chars: uniqueChars(`${LATIN_FONT_CHARS}${JAPANESE_PUNCTUATION_CHARS}${KANA_FONT_CHARS}${COMMON_SUSHI_CHARS}`),
    cellWidth: 16,
    cellHeight: 16,
    charsPerRow: 16,
  },
];

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.preload);
  }

  async create() {
    await this.ensureBitmapFontsLoaded();
    BITMAP_FONT_DEFINITIONS.forEach((definition) => this.buildBitmapFont(definition));
    this.scene.start(SCENE_KEYS.game);
  }

  async ensureBitmapFontsLoaded() {
    if (typeof document === 'undefined' || !document.fonts?.load) {
      return;
    }

    try {
      await Promise.all(BITMAP_FONT_DEFINITIONS.map((definition) => (
        document.fonts.load(`${definition.cellHeight}px ${definition.family}`)
      )));
      await document.fonts.ready;
    } catch {
      // Fall through; fallback fonts will be used.
    }
  }

  buildBitmapFont(definition) {
    const {
      key,
      family,
      chars,
      cellWidth,
      cellHeight,
      charsPerRow,
    } = definition;
    const rows = Math.ceil(chars.length / charsPerRow);
    const supersample = 8;
    const finalWidth = cellWidth * charsPerRow;
    const finalHeight = cellHeight * rows;

    const hiCanvas = document.createElement('canvas');

    hiCanvas.width = finalWidth * supersample;
    hiCanvas.height = finalHeight * supersample;

    const hiCtx = hiCanvas.getContext('2d');

    hiCtx.imageSmoothingEnabled = false;
    hiCtx.font = `${cellHeight * supersample}px ${family}`;
    hiCtx.textBaseline = 'top';
    hiCtx.fillStyle = '#ffffff';

    for (let i = 0; i < chars.length; i += 1) {
      const col = i % charsPerRow;
      const row = Math.floor(i / charsPerRow);

      hiCtx.fillText(
        chars[i],
        col * cellWidth * supersample,
        row * cellHeight * supersample,
      );
    }

    const hiImage = hiCtx.getImageData(0, 0, hiCanvas.width, hiCanvas.height);
    const hiData = hiImage.data;

    const canvas = document.createElement('canvas');

    canvas.width = finalWidth;
    canvas.height = finalHeight;

    const ctx = canvas.getContext('2d');
    const outImage = ctx.createImageData(finalWidth, finalHeight);
    const outData = outImage.data;
    const blockArea = supersample * supersample;
    const coverageThreshold = 0.5;

    for (let y = 0; y < finalHeight; y += 1) {
      for (let x = 0; x < finalWidth; x += 1) {
        let alphaSum = 0;
        const baseY = y * supersample;
        const baseX = x * supersample;

        for (let dy = 0; dy < supersample; dy += 1) {
          const rowStart = (baseY + dy) * hiCanvas.width * 4;

          for (let dx = 0; dx < supersample; dx += 1) {
            alphaSum += hiData[rowStart + (baseX + dx) * 4 + 3];
          }
        }

        const coverage = alphaSum / (blockArea * 255);
        const outIndex = (y * finalWidth + x) * 4;

        if (coverage >= coverageThreshold) {
          outData[outIndex] = 255;
          outData[outIndex + 1] = 255;
          outData[outIndex + 2] = 255;
          outData[outIndex + 3] = 255;
        }
      }
    }

    ctx.putImageData(outImage, 0, 0);

    const textureKey = `${key}-texture`;

    if (this.textures.exists(textureKey)) {
      this.textures.remove(textureKey);
    }

    const canvasTexture = this.textures.addCanvas(textureKey, canvas);

    canvasTexture?.refresh();

    const config = {
      image: textureKey,
      width: cellWidth,
      height: cellHeight,
      chars,
      charsPerRow,
      spacing: { x: 0, y: 0 },
      offset: { x: 0, y: 0 },
    };

    this.cache.bitmapFont.add(
      key,
      Phaser.GameObjects.RetroFont.Parse(this, config),
    );
  }
}
