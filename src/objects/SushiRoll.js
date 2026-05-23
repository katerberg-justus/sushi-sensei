import { CUTTABLE_FISH_STYLES } from './CuttableFish.js';
import { IngredientObject } from './IngredientObject.js';
import { toHexColor } from './ProceduralTexture.js';

const PIXEL = 2;
const ROLL_LENGTH = 60;
const ROLL_DIAMETER = 14;
const HALF_L = ROLL_LENGTH / 2;
const HALF_D = ROLL_DIAMETER / 2;
const SIDE_WIDTH = ROLL_LENGTH;
const SIDE_HEIGHT = ROLL_DIAMETER;
const FRAME_COUNT = 13;
const ROLL_WEIGHT_GRAMS = 90;

const FILLING_STYLES = {
  salmon: { displayName: 'Salmon', base: CUTTABLE_FISH_STYLES.salmon.base, highlight: CUTTABLE_FISH_STYLES.salmon.highlight, fat: CUTTABLE_FISH_STYLES.salmon.fat },
  maguro: { displayName: 'Maguro', base: CUTTABLE_FISH_STYLES.maguro.base, highlight: CUTTABLE_FISH_STYLES.maguro.highlight, fat: CUTTABLE_FISH_STYLES.maguro.fat },
  hamachi: { displayName: 'Hamachi', base: CUTTABLE_FISH_STYLES.hamachi.base, highlight: CUTTABLE_FISH_STYLES.hamachi.highlight, fat: CUTTABLE_FISH_STYLES.hamachi.fat },
  tai: { displayName: 'Tai', base: CUTTABLE_FISH_STYLES.tai.base, highlight: CUTTABLE_FISH_STYLES.tai.highlight, fat: CUTTABLE_FISH_STYLES.tai.fat },
  unagi: { displayName: 'Unagi', base: CUTTABLE_FISH_STYLES.unagi.base, highlight: CUTTABLE_FISH_STYLES.unagi.highlight, fat: CUTTABLE_FISH_STYLES.unagi.fat },
  tamago: { displayName: 'Tamago', base: 0xf1c35b, highlight: 0xf6d56d, fat: 0xfadf85 },
};

const NORI_DARK = 0x102821;
const NORI_BASE = 0x18372e;
const NORI_HIGHLIGHT = 0x214b3d;
const NORI_DEEP = 0x0b1a16;
const RICE_BASE = 0xe6ddc7;
const RICE_LIGHT = 0xf6f0df;
const RICE_GLINT = 0xfff8e8;
const RICE_SHADOW = 0xcfc3ac;

function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ensureFrameTextures(scene, fillingType, fillingStyle) {
  const frames = [];

  for (let i = 0; i < FRAME_COUNT; i += 1) {
    const theta = (i / (FRAME_COUNT - 1)) * (Math.PI / 2);
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const w = Math.max(2, Math.round(ROLL_LENGTH * cosT + ROLL_DIAMETER * sinT));
    const h = Math.max(2, Math.round(ROLL_LENGTH * sinT + ROLL_DIAMETER * cosT));
    const key = `sushi-roll-${fillingType}-q13-${i}`;

    if (!scene.textures.exists(key)) {
      const texture = scene.textures.createCanvas(key, w, h);
      const ctx = texture.getContext();
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);
      paintFrame(ctx, cosT, sinT, w, h, fillingStyle, mulberry32(0x51b1 ^ (i * 0x9e37)));
      texture.refresh();
    }
    frames.push({ key, w, h });
  }
  return frames;
}

function paintFrame(ctx, cosT, sinT, w, h, fillingStyle, rng) {
  const majorR = HALF_D;
  const minorR = HALF_D * sinT;
  const halfBodyL = HALF_L - minorR;
  const discVisible = minorR > 0.4;

  const cx = w / 2;
  const cy = h / 2;

  const fillingSemiL = Math.max(0.5, minorR * 0.34);
  const fillingSemiP = majorR * 0.34;

  for (let py = 0; py < h; py += 1) {
    for (let px = 0; px < w; px += 1) {
      const fx = px + 0.5 - cx;
      const fy = py + 0.5 - cy;
      const lx = fx * cosT + fy * sinT;
      const ly = -fx * sinT + fy * cosT;

      const inBody = Math.abs(lx) <= halfBodyL && Math.abs(ly) <= majorR;

      let inSouthEll = false;
      let southN = 2;
      if (discVisible) {
        southN = ((lx - halfBodyL) ** 2) / (minorR ** 2) + (ly ** 2) / (majorR ** 2);
        inSouthEll = southN <= 1;
      }

      let inNorthExt = false;
      let northN = 2;
      if (discVisible && lx < -halfBodyL) {
        northN = ((lx + halfBodyL) ** 2) / (minorR ** 2) + (ly ** 2) / (majorR ** 2);
        inNorthExt = northN <= 1;
      }

      if (!inBody && !inSouthEll && !inNorthExt) continue;

      let color;

      if (inSouthEll) {
        if (southN > 0.84) {
          color = NORI_DEEP;
        } else if (southN > 0.7) {
          color = NORI_DARK;
        } else {
          const fdx = lx - halfBodyL;
          const fdy = ly;
          const fillN = (fdx * fdx) / (fillingSemiL * fillingSemiL) + (fdy * fdy) / (fillingSemiP * fillingSemiP);

          if (fillN <= 1) {
            if (fdy < -fillingSemiP * 0.3) {
              color = fillingStyle.highlight;
            } else if (fillingStyle.fat && rng() < 0.2) {
              color = fillingStyle.fat;
            } else {
              color = fillingStyle.base;
            }
          } else {
            const r = rng();
            if (r < 0.22) color = RICE_LIGHT;
            else if (r < 0.30) color = RICE_GLINT;
            else if (r < 0.42 && ly > 0) color = RICE_SHADOW;
            else color = RICE_BASE;
          }
        }
      } else if (inNorthExt) {
        const curveT = Math.abs(ly) / majorR;
        if (northN > 0.88) {
          color = NORI_DEEP;
        } else if (curveT < 0.22) {
          color = NORI_HIGHLIGHT;
        } else if (curveT > 0.7) {
          color = NORI_DARK;
        } else {
          color = NORI_BASE;
        }
        const r = rng();
        if (northN <= 0.88) {
          if (r < 0.07) color = NORI_DEEP;
          else if (r < 0.13 && color === NORI_BASE) color = NORI_HIGHLIGHT;
        }
      } else {
        const curveT = Math.abs(ly) / majorR;
        const edgePerp = Math.abs(ly) > majorR - 0.6;
        if (edgePerp) {
          color = NORI_DEEP;
        } else if (curveT < 0.22) {
          color = NORI_HIGHLIGHT;
        } else if (curveT > 0.7) {
          color = NORI_DARK;
        } else {
          color = NORI_BASE;
        }
        const r = rng();
        if (!edgePerp) {
          if (r < 0.07) color = NORI_DEEP;
          else if (r < 0.13 && color === NORI_BASE) color = NORI_HIGHLIGHT;
          else if (r < 0.18 && color === NORI_HIGHLIGHT) color = NORI_BASE;
        }
      }

      ctx.fillStyle = toHexColor(color);
      ctx.fillRect(px, py, 1, 1);
    }
  }
}

export class SushiRoll extends IngredientObject {
  constructor(scene, x, y, options = {}) {
    const fillingType = options.fillingType ?? 'salmon';
    const fillingStyle = FILLING_STYLES[fillingType] ?? FILLING_STYLES.salmon;
    const frames = ensureFrameTextures(scene, fillingType, fillingStyle);

    const displayWidth = SIDE_WIDTH * PIXEL;
    const displayHeight = SIDE_HEIGHT * PIXEL;

    super(scene, x, y, displayWidth, displayHeight, options);
    this.setCenteredHitbox(displayWidth, displayHeight);
    this.ownWeightGrams = options.weightGrams ?? ROLL_WEIGHT_GRAMS;
    this.displayName = `${fillingStyle.displayName} Maki`;
    this.rollStyle = 'maki';
    this.fillingType = fillingType;
    this.restDepth = 14;
    this.softness = 0.22;
    this.stackCategory = 'roll';

    this.computedShadeDarkAlpha = 0;
    this.computedShadeLightAlpha = 0;
    this.computedShadeBottomCoverage = 0;
    this.computedShadeMaxPixels = 0;

    this.frames = frames;
    this.currentFrameIndex = -1;

    this.sprite = scene.add.image(0, 0, frames[0].key);
    this.sprite.setOrigin(0.5);
    this.sprite.setScale(PIXEL);
    this.sprite.excludeFromComputedShade = true;
    this.addDraggablePart(this.sprite);

    this.applyRollViewForCurrentRotation();
    this.refreshCompositionShadow();
    this.applyRestingDepth();
  }

  beforeObjectRotationTween() {
  }

  afterObjectRotationTween() {
    this.refreshCompositionShadow?.();
  }

  refreshRotatedGeometry(options = {}) {
    super.refreshRotatedGeometry(options);
    this.applyRollViewForCurrentRotation();
    return this;
  }

  applyRollViewForCurrentRotation() {
    if (!this.sprite || !this.frames) return;

    const half = Math.PI;
    const quarter = Math.PI / 2;
    const raw = this.rotation ?? 0;
    const folded = ((raw % half) + half) % half;
    const subQuadrant = Math.floor(folded / quarter);
    const subProgress = (folded - subQuadrant * quarter) / quarter;
    const forward = subQuadrant === 0;
    const t = forward ? subProgress : 1 - subProgress;
    const frameIndex = Math.min(FRAME_COUNT - 1, Math.max(0, Math.round(t * (FRAME_COUNT - 1))));

    if (frameIndex !== this.currentFrameIndex) {
      this.currentFrameIndex = frameIndex;
      this.sprite.setTexture(this.frames[frameIndex].key);
    }

    this.sprite.setFlipX(subQuadrant === 1);
    this.sprite.setFlipY(false);

    this.sprite.setRotation(-raw);
  }
}
