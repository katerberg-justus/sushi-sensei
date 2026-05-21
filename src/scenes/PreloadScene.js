import * as Phaser from 'phaser/dist/phaser.esm.js';
import { BITMAP_FONT_PIXEL, FONT_FAMILY_PIXEL, SCENE_KEYS } from '../game/constants.js';

const PIXEL_FONT_CHARS = ' !"#$%&\'()*+,-./0123456789:;<=>?@'
  + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`'
  + 'abcdefghijklmnopqrstuvwxyz{|}~';

const CELL_W = 8;
const CELL_H = 8;
const COLS = 16;

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.preload);
  }

  async create() {
    await this.ensurePixelFontLoaded();
    this.buildPixelBitmapFont();
    this.scene.start(SCENE_KEYS.game);
  }

  async ensurePixelFontLoaded() {
    if (typeof document === 'undefined' || !document.fonts?.load) {
      return;
    }

    try {
      await document.fonts.load(`${CELL_H}px ${FONT_FAMILY_PIXEL}`);
      await document.fonts.ready;
    } catch {
      // fall through — fallback monospace will be used
    }
  }

  buildPixelBitmapFont() {
    const rows = Math.ceil(PIXEL_FONT_CHARS.length / COLS);
    const supersample = 8;
    const finalWidth = CELL_W * COLS;
    const finalHeight = CELL_H * rows;

    const hiCanvas = document.createElement('canvas');

    hiCanvas.width = finalWidth * supersample;
    hiCanvas.height = finalHeight * supersample;

    const hiCtx = hiCanvas.getContext('2d');

    hiCtx.imageSmoothingEnabled = false;
    hiCtx.font = `${CELL_H * supersample}px ${FONT_FAMILY_PIXEL}`;
    hiCtx.textBaseline = 'top';
    hiCtx.fillStyle = '#ffffff';

    for (let i = 0; i < PIXEL_FONT_CHARS.length; i += 1) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);

      hiCtx.fillText(
        PIXEL_FONT_CHARS[i],
        col * CELL_W * supersample,
        row * CELL_H * supersample,
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

    const textureKey = `${BITMAP_FONT_PIXEL}-texture`;

    if (this.textures.exists(textureKey)) {
      this.textures.remove(textureKey);
    }

    const canvasTexture = this.textures.addCanvas(textureKey, canvas);

    canvasTexture?.refresh();

    const config = {
      image: textureKey,
      width: CELL_W,
      height: CELL_H,
      chars: PIXEL_FONT_CHARS,
      charsPerRow: COLS,
      spacing: { x: 0, y: 0 },
      offset: { x: 0, y: 0 },
    };

    this.cache.bitmapFont.add(
      BITMAP_FONT_PIXEL,
      Phaser.GameObjects.RetroFont.Parse(this, config),
    );
  }
}
