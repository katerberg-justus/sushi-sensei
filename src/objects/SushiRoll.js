import { CUTTABLE_FISH_STYLES } from './CuttableFish.js';
import { CuttableObject } from './CuttableObject.js';
import { IngredientObject } from './IngredientObject.js';
import { toHexColor } from './ProceduralTexture.js';

const PIXEL = 2;
const ROLL_LENGTH = 60;
const ROLL_DIAMETER = 14;
const FRAME_COUNT = 13;
const ROLL_WEIGHT_GRAMS = 90;
const ROLL_AXIS_CAP_PERSPECTIVE = 0.72;

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
const NORI_MID = 0x142e27;
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

function hashNoriBlock(x, y, seed = 0) {
  let value = (x + 23) * 374761393 + (y + 41) * 668265263 + seed * 2246822519;

  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return (value ^ (value >>> 16)) >>> 0;
}

function getCoarseNoriColor(lx, ly, majorR, halfLength, edgePerp, seed = 0) {
  if (edgePerp) {
    return NORI_DEEP;
  }

  const curveT = Math.abs(ly) / majorR;
  const blockX = Math.floor((lx + halfLength + 4) / 4);
  const bandY = Math.floor((ly + majorR) / 2);
  const hash = hashNoriBlock(blockX, bandY, seed);

  let color = NORI_BASE;

  if (curveT < 0.22) {
    color = NORI_HIGHLIGHT;
  } else if (curveT > 0.7) {
    color = NORI_DARK;
  } else if (hash % 11 === 0) {
    color = NORI_MID;
  }

  if (hash % 23 === 0) {
    return NORI_DEEP;
  }

  if (color === NORI_BASE && hash % 9 === 0) {
    return NORI_HIGHLIGHT;
  }

  if (color === NORI_HIGHLIGHT && hash % 7 === 0) {
    return NORI_BASE;
  }

  return color;
}

function ensureFrameTextures(scene, fillingType, fillingStyle, rollLength = ROLL_LENGTH, rollDiameter = ROLL_DIAMETER) {
  const frames = [];
  const frameKeySuffix = `${Math.round(rollLength * 100)}x${Math.round(rollDiameter * 100)}`;

  for (let i = 0; i < FRAME_COUNT; i += 1) {
    const theta = (i / (FRAME_COUNT - 1)) * (Math.PI / 2);
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const axisCapDepth = rollDiameter * ROLL_AXIS_CAP_PERSPECTIVE;
    const w = Math.max(2, Math.round(rollLength * cosT + rollDiameter * sinT));
    const h = Math.max(2, Math.round(rollLength * sinT + rollDiameter * cosT + axisCapDepth * sinT));
    const key = `sushi-roll-${fillingType}-${frameKeySuffix}-q15-${i}`;

    if (!scene.textures.exists(key)) {
      const texture = scene.textures.createCanvas(key, w, h);
      const ctx = texture.getContext();
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);
      paintFrame(ctx, cosT, sinT, w, h, fillingStyle, mulberry32(0x51b1 ^ (i * 0x9e37)), rollLength, rollDiameter);
      texture.refresh();
    }
    frames.push({ key, w, h });
  }
  return frames;
}

function paintFrame(ctx, cosT, sinT, w, h, fillingStyle, rng, rollLength = ROLL_LENGTH, rollDiameter = ROLL_DIAMETER) {
  const halfLength = rollLength / 2;
  const halfDiameter = rollDiameter / 2;
  const majorR = halfDiameter;
  const minorR = halfDiameter * ROLL_AXIS_CAP_PERSPECTIVE * sinT;
  const halfBodyL = halfLength;
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
        if (northN > 0.88) {
          color = NORI_DEEP;
        } else {
          color = getCoarseNoriColor(lx, ly, majorR, halfLength, false, 7);
        }
      } else {
        const edgePerp = Math.abs(ly) > majorR - 0.6;
        color = getCoarseNoriColor(lx, ly, majorR, halfLength, edgePerp, 7);
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
    const cropX = options.cropX ?? 0;
    const cropY = options.cropY ?? 0;
    const cropWidth = options.cropWidth ?? ROLL_LENGTH;
    const cropHeight = options.cropHeight ?? ROLL_DIAMETER;
    const frames = ensureFrameTextures(scene, fillingType, fillingStyle, cropWidth, cropHeight);

    const displayWidth = cropWidth * PIXEL;
    const displayHeight = cropHeight * PIXEL;

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
    this.sprite = null;

    CuttableObject.setupCuttable(this, frames[0].key, cropWidth, cropHeight, PIXEL, {
      ...options,
      sourceTextureWidth: cropWidth,
      sourceTextureHeight: cropHeight,
      allowedCutOrientations: ['vertical'],
    });

    if (!options.skipInitialPiece && (cropX !== 0 || cropY !== 0)) {
      this.configureAsCutPiece({
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        visibleBounds: options.visibleBounds,
      }, options);
    }

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

  createPieceImage(piece) {
    const image = CuttableObject.prototype.createPieceImage.call(this, piece);

    image.excludeFromComputedShade = true;
    image.rollFrameIndex = -1;
    this.sprite = image;
    this.syncRollPieceImage(piece);

    return image;
  }

  createCuttableFromPiece(piece) {
    const visualPiece = this.createVisualPieceData(piece);
    const position = this.getPieceWorldVisibleCenter(visualPiece);
    const pieceWidth = visualPiece.cropWidth;
    const pieceHeight = visualPiece.cropHeight;
    const object = new SushiRoll(this.scene, position.x, position.y, {
      fillingType: this.fillingType,
      cropWidth: pieceWidth,
      cropHeight: pieceHeight,
      weightGrams: visualPiece.weightGrams,
      minimumCutWidth: this.minimumCutWidth,
      skipInitialPiece: true,
      visualVariation: this.getIngredientVisualVariation?.(),
    });
    const localPiece = {
      ...visualPiece,
      cropX: 0,
      cropY: 0,
      visibleBounds: {
        left: 0,
        right: pieceWidth,
        top: 0,
        bottom: pieceHeight,
      },
    };

    object.deferComputedShadeRefresh = true;
    object.deferCompositionShadowRefresh = true;
    object.configureAsCutPiece(localPiece, {
      minimumCutWidth: this.minimumCutWidth,
      minSwipeDistance: this.minSwipeDistance,
      cutDepth: this.cutDepth,
      cutGap: this.cutGap,
      allowedCutOrientations: this.allowedCutOrientations,
      sourceTextureWidth: pieceWidth,
      sourceTextureHeight: pieceHeight,
    });

    if (this.displayName) {
      object.displayName = this.displayName;
    }

    this.copyCuttableRotationTo(object);

    return object;
  }

  applyRollViewForCurrentRotation() {
    if (!this.frames || !this.pieces?.length) return;

    const half = Math.PI;
    const quarter = Math.PI / 2;
    const raw = this.rotation ?? 0;
    const folded = ((raw % half) + half) % half;
    const subQuadrant = Math.floor(folded / quarter);
    const subProgress = (folded - subQuadrant * quarter) / quarter;
    const forward = subQuadrant === 0;
    const t = forward ? subProgress : 1 - subProgress;
    const frameIndex = Math.min(FRAME_COUNT - 1, Math.max(0, Math.round(t * (FRAME_COUNT - 1))));

    this.currentFrameIndex = frameIndex;

    this.pieces.forEach((piece) => {
      this.syncRollPieceImage(piece, {
        frameIndex,
        flipX: subQuadrant === 1,
        rotation: -raw,
      });
    });
  }

  syncRollPieceImage(piece, options = {}) {
    const image = piece?.image;

    if (!image || !this.frames?.length) return;

    const frameIndex = options.frameIndex ?? this.currentFrameIndex;
    const frame = this.frames[Math.max(0, frameIndex)] ?? this.frames[0];
    const sourceWidth = this.sourceTextureWidth ?? ROLL_LENGTH;
    const sourceHeight = this.sourceTextureHeight ?? ROLL_DIAMETER;
    const scaleX = frame.w / sourceWidth;
    const scaleY = frame.h / sourceHeight;
    const cropX = Math.round(piece.cropX * scaleX);
    const cropY = Math.round(piece.cropY * scaleY);
    const cropWidth = Math.max(1, Math.round(piece.cropWidth * scaleX));
    const cropHeight = Math.max(1, Math.round(piece.cropHeight * scaleY));
    const anchorFrameX = this.anchorTextureX * scaleX;
    const anchorFrameY = this.anchorTextureY * scaleY;
    const visibleBounds = piece.visibleBounds ?? this.getPieceVisibleTextureBounds(piece);
    const visibleWidth = (visibleBounds.right - visibleBounds.left) * scaleX * this.pixelScale;
    const visibleHeight = (visibleBounds.bottom - visibleBounds.top) * scaleY * this.pixelScale;
    const visibleLeft = (visibleBounds.left * scaleX - anchorFrameX) * this.pixelScale;
    const visibleTop = (visibleBounds.top * scaleY - anchorFrameY) * this.pixelScale;

    if (image.rollFrameIndex !== frameIndex || image.texture?.key !== frame.key) {
      image.setTexture(frame.key);
      image.rollFrameIndex = frameIndex;
    }

    image.setCrop(cropX, cropY, cropWidth, cropHeight);
    image.setScale(this.pixelScale);
    image.setPosition(
      (frame.w / 2 - anchorFrameX) * this.pixelScale,
      (frame.h / 2 - anchorFrameY) * this.pixelScale,
    );
    image.compositionWidth = visibleWidth;
    image.compositionHeight = visibleHeight;
    image.compositionOffsetX = visibleLeft + visibleWidth / 2 - image.x;
    image.compositionOffsetY = visibleTop + visibleHeight / 2 - image.y;
    image.setFlipX(options.flipX ?? false);
    image.setFlipY(false);
    image.setRotation(options.rotation ?? -(this.rotation ?? 0));
  }

  getCuttableReplacementOptions() {
    return {
      fillingType: this.fillingType,
    };
  }
}

Object.getOwnPropertyNames(CuttableObject.prototype).forEach((name) => {
  if (name !== 'constructor' && !Object.prototype.hasOwnProperty.call(SushiRoll.prototype, name)) {
    SushiRoll.prototype[name] = CuttableObject.prototype[name];
  }
});
