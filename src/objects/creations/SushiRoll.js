import { CUTTABLE_FISH_STYLES } from '../ingredients/CuttableFish.js';
import { CuttableObject } from '../base/CuttableObject.js';
import { IngredientObject } from '../base/IngredientObject.js';
import { composeJapaneseName, JAPANESE_NAMES } from '../JapaneseNames.js';
import { toHexColor } from '../ProceduralTexture.js';
import { SHRIMP_STYLE, Shrimp } from '../ingredients/Shrimp.js';

const PIXEL = 2;
const ROLL_LENGTH = 60;
const ROLL_DIAMETER = 14;
const FRAME_COUNT = 13;
const ROLL_WEIGHT_GRAMS = 90;
const ROLL_AXIS_CAP_PERSPECTIVE = 0.72;
const ROLL_DISC_DEPTH_PERSPECTIVE = 0.72;
const FLIPPABLE_MAX_WEIGHT_GRAMS = 20;
const FLIPPED_DISC_HEIGHT_SCALE = 0.86;
const FLIP_DURATION = 180;
const HORIZONTAL_CORNER_RADIUS = 4;
const HORIZONTAL_RICE_END_THICKNESS = 1;

const FILLING_STYLES = {
  salmon: { displayName: 'Salmon', japaneseName: CUTTABLE_FISH_STYLES.salmon.japaneseName, subtypes: CUTTABLE_FISH_STYLES.salmon.subtypes, base: CUTTABLE_FISH_STYLES.salmon.base, highlight: CUTTABLE_FISH_STYLES.salmon.highlight, fat: CUTTABLE_FISH_STYLES.salmon.fat },
  maguro: { displayName: 'Maguro', japaneseName: CUTTABLE_FISH_STYLES.maguro.japaneseName, subtypes: CUTTABLE_FISH_STYLES.maguro.subtypes, base: CUTTABLE_FISH_STYLES.maguro.base, highlight: CUTTABLE_FISH_STYLES.maguro.highlight, fat: CUTTABLE_FISH_STYLES.maguro.fat },
  hamachi: { displayName: 'Hamachi', japaneseName: CUTTABLE_FISH_STYLES.hamachi.japaneseName, subtypes: CUTTABLE_FISH_STYLES.hamachi.subtypes, base: CUTTABLE_FISH_STYLES.hamachi.base, highlight: CUTTABLE_FISH_STYLES.hamachi.highlight, fat: CUTTABLE_FISH_STYLES.hamachi.fat },
  tai: { displayName: 'Tai', japaneseName: CUTTABLE_FISH_STYLES.tai.japaneseName, subtypes: CUTTABLE_FISH_STYLES.tai.subtypes, base: CUTTABLE_FISH_STYLES.tai.base, highlight: CUTTABLE_FISH_STYLES.tai.highlight, fat: CUTTABLE_FISH_STYLES.tai.fat },
  hirame: { displayName: 'Hirame', japaneseName: CUTTABLE_FISH_STYLES.hirame.japaneseName, subtypes: CUTTABLE_FISH_STYLES.hirame.subtypes, base: CUTTABLE_FISH_STYLES.hirame.base, highlight: CUTTABLE_FISH_STYLES.hirame.highlight, fat: CUTTABLE_FISH_STYLES.hirame.fat },
  suzuki: { displayName: 'Suzuki', japaneseName: CUTTABLE_FISH_STYLES.suzuki.japaneseName, subtypes: CUTTABLE_FISH_STYLES.suzuki.subtypes, base: CUTTABLE_FISH_STYLES.suzuki.base, highlight: CUTTABLE_FISH_STYLES.suzuki.highlight, fat: CUTTABLE_FISH_STYLES.suzuki.fat },
  saba: { displayName: 'Saba', japaneseName: CUTTABLE_FISH_STYLES.saba.japaneseName, subtypes: CUTTABLE_FISH_STYLES.saba.subtypes, base: CUTTABLE_FISH_STYLES.saba.base, highlight: CUTTABLE_FISH_STYLES.saba.highlight, fat: CUTTABLE_FISH_STYLES.saba.fat },
  aji: { displayName: 'Aji', japaneseName: CUTTABLE_FISH_STYLES.aji.japaneseName, subtypes: CUTTABLE_FISH_STYLES.aji.subtypes, base: CUTTABLE_FISH_STYLES.aji.base, highlight: CUTTABLE_FISH_STYLES.aji.highlight, fat: CUTTABLE_FISH_STYLES.aji.fat },
  iwashi: { displayName: 'Iwashi', japaneseName: CUTTABLE_FISH_STYLES.iwashi.japaneseName, subtypes: CUTTABLE_FISH_STYLES.iwashi.subtypes, base: CUTTABLE_FISH_STYLES.iwashi.base, highlight: CUTTABLE_FISH_STYLES.iwashi.highlight, fat: CUTTABLE_FISH_STYLES.iwashi.fat },
  ika: { displayName: 'Ika', japaneseName: CUTTABLE_FISH_STYLES.ika.japaneseName, subtypes: CUTTABLE_FISH_STYLES.ika.subtypes, base: CUTTABLE_FISH_STYLES.ika.base, highlight: CUTTABLE_FISH_STYLES.ika.highlight, fat: CUTTABLE_FISH_STYLES.ika.fat },
  unagi: { displayName: 'Unagi', japaneseName: CUTTABLE_FISH_STYLES.unagi.japaneseName, subtypes: CUTTABLE_FISH_STYLES.unagi.subtypes, base: CUTTABLE_FISH_STYLES.unagi.base, highlight: CUTTABLE_FISH_STYLES.unagi.highlight, fat: CUTTABLE_FISH_STYLES.unagi.fat },
  shrimp: { displayName: SHRIMP_STYLE.displayName, japaneseName: SHRIMP_STYLE.japaneseName, subtypes: SHRIMP_STYLE.subtypes, base: SHRIMP_STYLE.base, highlight: SHRIMP_STYLE.highlight, fat: SHRIMP_STYLE.shadow },
  tamago: { displayName: 'Tamago', japaneseName: JAPANESE_NAMES.tamago, base: 0xf1c35b, highlight: 0xf6d56d, fat: 0xfadf85 },
  cucumber: { displayName: 'Cucumber', japaneseName: JAPANESE_NAMES.cucumber, base: 0x53a848, highlight: 0x8fcd5f, fat: 0xb8dc79 },
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

function getCoarseRiceColor(lx, ly, majorR, halfLength, seed = 0) {
  const blockX = Math.floor((lx + halfLength + 6) / 3);
  const blockY = Math.floor((ly + majorR + 2) / 2);
  const hash = hashNoriBlock(blockX, blockY, seed);

  if (hash % 19 === 0) {
    return RICE_GLINT;
  }

  if (ly > 0 && hash % 5 === 0) {
    return RICE_SHADOW;
  }

  if (hash % 3 === 0) {
    return RICE_LIGHT;
  }

  return RICE_BASE;
}

function getRollAxisBodyLength(rollLength, sinT) {
  return rollLength * (1 - (1 - ROLL_AXIS_CAP_PERSPECTIVE) * sinT);
}

function isInsideRoundedHorizontalBody(lx, ly, halfLength, halfHeight, radius) {
  const innerHalfLength = Math.max(0, halfLength - radius);
  const innerHalfHeight = Math.max(0, halfHeight - radius);
  const dx = Math.abs(lx) - innerHalfLength;
  const dy = Math.abs(ly) - innerHalfHeight;

  if (dx <= 0 || dy <= 0) {
    return Math.abs(lx) <= halfLength && Math.abs(ly) <= halfHeight;
  }

  return dx * dx + dy * dy <= radius * radius;
}

function wrapAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function shortestAngleBetween(startAngle, endAngle) {
  return wrapAngle(endAngle - startAngle);
}

function interpolateAngle(startAngle, endAngle, progress) {
  return wrapAngle(startAngle + shortestAngleBetween(startAngle, endAngle) * progress);
}

function interpolateValue(startValue, endValue, progress) {
  return startValue + (endValue - startValue) * progress;
}

function ensureFrameTextures(scene, fillingTextureKey, fillingStyle, rollLength = ROLL_LENGTH, rollDiameter = ROLL_DIAMETER) {
  const frames = [];
  const frameKeySuffix = `${Math.round(rollLength * 100)}x${Math.round(rollDiameter * 100)}`;

  for (let i = 0; i < FRAME_COUNT; i += 1) {
    const theta = (i / (FRAME_COUNT - 1)) * (Math.PI / 2);
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const axisBodyLength = getRollAxisBodyLength(rollLength, sinT);
    const axisCapDepth = rollDiameter * ROLL_DISC_DEPTH_PERSPECTIVE * sinT;
    const w = Math.max(2, Math.round(axisBodyLength * cosT + rollDiameter * sinT));
    const h = Math.max(2, Math.round(axisBodyLength * sinT + rollDiameter * cosT + axisCapDepth));
    const key = `sushi-roll-${fillingTextureKey}-${frameKeySuffix}-q19-${i}`;

    if (!scene.textures.exists(key)) {
      const texture = scene.textures.createCanvas(key, w, h);
      const ctx = texture.getContext();
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);
      paintFrame(ctx, cosT, sinT, w, h, fillingStyle, mulberry32(0x51b1 ^ (i * 0x9e37)), rollLength, rollDiameter, axisBodyLength, axisCapDepth);
      texture.refresh();
    }
    frames.push({ key, w, h });
  }
  return frames;
}

function paintFrame(ctx, cosT, sinT, w, h, fillingStyle, rng, rollLength = ROLL_LENGTH, rollDiameter = ROLL_DIAMETER, axisBodyLength = getRollAxisBodyLength(rollLength, sinT), axisCapDepth = rollDiameter * ROLL_DISC_DEPTH_PERSPECTIVE * sinT) {
  const halfLength = axisBodyLength / 2;
  const halfDiameter = rollDiameter / 2;
  const majorR = halfDiameter;
  const minorR = axisCapDepth / 2;
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

      const inBody = discVisible
        ? Math.abs(lx) <= halfBodyL && Math.abs(ly) <= majorR
        : isInsideRoundedHorizontalBody(lx, ly, halfBodyL, majorR, HORIZONTAL_CORNER_RADIUS);

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
            color = getCoarseRiceColor(lx, ly, majorR, halfLength, 13);
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
        const horizontalRiceEnd = !discVisible && Math.abs(lx) > halfBodyL - HORIZONTAL_RICE_END_THICKNESS;
        color = horizontalRiceEnd
          ? getCoarseRiceColor(lx, ly, majorR, halfLength, 13)
          : getCoarseNoriColor(lx, ly, majorR, halfLength, edgePerp, 7);
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
    const fillingSubtypeStyle = SushiRoll.getFillingSubtypeStyle(fillingStyle, options.fillingSubtype);
    const fillingSubtype = fillingSubtypeStyle?.key ?? null;
    const mergedFillingStyle = fillingType === 'shrimp'
      ? SushiRoll.createShrimpFillingStyle(fillingStyle, fillingSubtypeStyle)
      : SushiRoll.mergeSubtypeStyle(fillingStyle, fillingSubtypeStyle);
    const fillingDisplayName = fillingSubtypeStyle?.displayName ?? fillingStyle.displayName;
    const fillingJapaneseName = fillingSubtypeStyle?.japaneseName ?? fillingStyle.japaneseName ?? null;
    const cropX = options.cropX ?? 0;
    const cropY = options.cropY ?? 0;
    const cropWidth = options.cropWidth ?? ROLL_LENGTH;
    const cropHeight = options.cropHeight ?? ROLL_DIAMETER;
    const fillingTextureKey = fillingSubtype ? `${fillingType}-${fillingSubtype}` : fillingType;
    const frames = ensureFrameTextures(scene, fillingTextureKey, mergedFillingStyle, cropWidth, cropHeight);

    const displayWidth = cropWidth * PIXEL;
    const displayHeight = cropHeight * PIXEL;

    super(scene, x, y, displayWidth, displayHeight, {
      ...options,
      japaneseName: options.japaneseName ?? composeJapaneseName(fillingJapaneseName, JAPANESE_NAMES.maki),
    });
    this.setCenteredHitbox(displayWidth, displayHeight);
    this.ownWeightGrams = options.weightGrams ?? ROLL_WEIGHT_GRAMS;
    this.displayName = `${fillingDisplayName} Maki`;
    this.rollStyle = 'maki';
    this.fillingType = fillingType;
    this.fillingSubtype = fillingSubtype;
    this.fillingJapaneseName = fillingStyle.japaneseName ?? null;
    this.fillingSubtypeJapaneseName = fillingSubtypeStyle?.japaneseName ?? null;
    this.restDepth = 24;
    this.softness = 0.9;
    this.stackCategory = 'roll';

    this.computedShadeDarkAlpha = 0;
    this.computedShadeLightAlpha = 0;
    this.computedShadeBottomCoverage = 0;
    this.computedShadeMaxPixels = 0;

    this.frames = frames;
    this.currentFrameIndex = -1;
    this.isFlippedUpright = false;
    this.unflippedRotation = this.rotation ?? 0;
    this.unflippedIsRotatable = this.isRotatable;
    this.flipTween = null;
    this.flipTweenState = null;
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

    this.setFlippedUpright(options.isFlippedUpright ?? false);
    this.applyRollViewForCurrentRotation();
    this.refreshCompositionShadow();
    this.applyRestingDepth();

    this.on('pointerdown', this.handleFlipPointerDown, this);
  }

  static getFillingSubtypeStyle(fillingStyle, fillingSubtype = null) {
    if (typeof fillingSubtype !== 'string') {
      return null;
    }

    const normalizedSubtype = fillingSubtype.trim().toLowerCase();

    return (fillingStyle.subtypes ?? [])
      .find((subtype) => subtype.key === normalizedSubtype) ?? null;
  }

  static mergeSubtypeStyle(fillingStyle, subtypeStyle) {
    if (!subtypeStyle) {
      return fillingStyle;
    }

    return {
      ...fillingStyle,
      ...(subtypeStyle.palette ?? {}),
      fatDensity: subtypeStyle.fatDensity ?? fillingStyle.fatDensity ?? 1,
    };
  }

  static createShrimpFillingStyle(fillingStyle, subtypeStyle) {
    const mergedStyle = Shrimp.mergeSubtypeStyle(fillingStyle, subtypeStyle);

    return {
      ...mergedStyle,
      fat: mergedStyle.shadow ?? mergedStyle.fat,
    };
  }

  handleFlipPointerDown(pointer) {
    if (!this.canFlipUpright() || !this.isRightButtonPointer(pointer) || !this.canStartFlip()) {
      return;
    }

    pointer.event?.preventDefault?.();
    this.suppressedDragPointerId = this.getDragPointerId(pointer);
    this.toggleFlippedUpright();
  }

  canFlipUpright() {
    return (this.weightGrams ?? this.ownWeightGrams ?? 0) < FLIPPABLE_MAX_WEIGHT_GRAMS;
  }

  canStartFlip() {
    return !this.isDragging && !this.rotationTween && !this.flipTween;
  }

  stopFlipTween() {
    if (!this.flipTween) {
      return;
    }

    this.flipTween.stop();
    this.flipTween = null;
    this.flipTweenState = null;
  }

  toggleFlippedUpright() {
    this.setFlippedUpright(!this.isFlippedUpright);

    return this;
  }

  setFlippedUpright(isFlippedUpright) {
    const nextValue = Boolean(isFlippedUpright);

    if (this.isFlippedUpright === nextValue) {
      return this;
    }

    this.beginFlipTween(nextValue);

    return this;
  }

  beginFlipTween(nextValue) {
    const currentRotation = this.rotation ?? 0;
    const targetRotation = nextValue ? 0 : this.unflippedRotation ?? 0;
    const startView = nextValue
      ? this.getUnflippedRollView(currentRotation)
      : this.getFlippedRollView();
    const endView = nextValue
      ? this.getFlippedRollView()
      : this.getUnflippedRollView(targetRotation);

    if (nextValue) {
      this.unflippedRotation = currentRotation;
      this.unflippedIsRotatable = this.isRotatable;
    }

    this.isFlippedUpright = nextValue;
    this.isRotatable = false;
    this.flipTweenState = {
      progress: 0,
      startView,
      endView,
    };

    this.renderInterpolatedRollView(startView, endView, 0);
    this.refreshCuttableGeometry?.();
    this.refreshCompositionShadow?.();

    this.flipTween = this.scene.tweens.add({
      targets: this.flipTweenState,
      progress: 1,
      duration: FLIP_DURATION,
      ease: 'Cubic.Out',
      onUpdate: () => {
        this.renderInterpolatedRollView(startView, endView, this.flipTweenState.progress);
        this.refreshCuttableGeometry?.();
      },
      onComplete: () => {
        this.flipTween = null;
        this.flipTweenState = null;
        this.setRotation(targetRotation);
        this.isRotatable = nextValue ? false : this.unflippedIsRotatable ?? true;
        this.applyRollViewForCurrentRotation();
        this.refreshCuttableGeometry?.();
        this.refreshCompositionShadow?.();
      },
    });

    return this;
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

  refreshCuttableGeometry(options) {
    this.setSize(this.cutWidth, this.cutHeight);

    if (this.setCenteredHitbox && this.pieces?.length) {
      const piece = this.pieces[0];
      const sourceWidth = this.sourceTextureWidth ?? ROLL_LENGTH;
      const sourceHeight = this.sourceTextureHeight ?? ROLL_DIAMETER;
      const frameIndex = Math.max(0, this.currentFrameIndex);
      const theta = (frameIndex / (FRAME_COUNT - 1)) * (Math.PI / 2);
      const sinT = Math.sin(theta);
      const axisBodyLength = getRollAxisBodyLength(sourceWidth, sinT);
      const pieceLength = piece.cropWidth * (axisBodyLength / sourceWidth) * this.pixelScale;
      const pieceCross = sourceHeight * this.pixelScale;
      const flipped = this.isFlippedUpright;
      const width = flipped ? pieceCross : pieceLength;
      const height = flipped ? pieceLength * FLIPPED_DISC_HEIGHT_SCALE : pieceCross;

      this.setCenteredHitbox(width, height);
    }

    this.refreshCompositionShadow?.();

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
      ...this.getIngredientTraitOptions?.(),
      fillingType: this.fillingType,
      fillingSubtype: this.fillingSubtype,
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
    if (this.japaneseName) {
      object.setJapaneseName?.(this.japaneseName);
    }

    this.copyCuttableRotationTo(object);

    return object;
  }

  applyRollViewForCurrentRotation() {
    if (!this.frames || !this.pieces?.length) return;

    if (this.flipTweenState) {
      this.renderInterpolatedRollView(
        this.flipTweenState.startView,
        this.flipTweenState.endView,
        this.flipTweenState.progress,
      );
      return;
    }

    if (this.isFlippedUpright) {
      this.applyRollView(this.getFlippedRollView());
      return;
    }

    this.applyRollView(this.getUnflippedRollView(this.rotation ?? 0));
  }

  getUnflippedRollView(rotation) {
    const half = Math.PI;
    const quarter = Math.PI / 2;
    const raw = rotation ?? 0;
    const folded = ((raw % half) + half) % half;
    const subQuadrant = Math.floor(folded / quarter);
    const subProgress = (folded - subQuadrant * quarter) / quarter;
    const forward = subQuadrant === 0;
    const t = forward ? subProgress : 1 - subProgress;
    const frameIndex = Math.min(FRAME_COUNT - 1, Math.max(0, Math.round(t * (FRAME_COUNT - 1))));

    return {
      objectRotation: raw,
      imageRotation: -raw,
      frameIndex,
      flipX: subQuadrant === 1,
      flipY: false,
      scaleY: 1,
    };
  }

  getFlippedRollView() {
    return {
      objectRotation: 0,
      imageRotation: 0,
      frameIndex: FRAME_COUNT - 1,
      flipX: false,
      flipY: true,
      scaleY: FLIPPED_DISC_HEIGHT_SCALE,
    };
  }

  renderInterpolatedRollView(startView, endView, progress) {
    const frameIndex = Math.min(
      FRAME_COUNT - 1,
      Math.max(0, Math.round(interpolateValue(startView.frameIndex, endView.frameIndex, progress))),
    );
    const view = {
      objectRotation: interpolateAngle(startView.objectRotation, endView.objectRotation, progress),
      imageRotation: interpolateAngle(startView.imageRotation, endView.imageRotation, progress),
      frameIndex,
      flipX: progress < 0.5 ? startView.flipX : endView.flipX,
      flipY: progress < 0.5 ? startView.flipY : endView.flipY,
      scaleY: interpolateValue(startView.scaleY, endView.scaleY, progress),
    };

    this.setRotation(view.objectRotation);
    this.applyRollView(view);
  }

  applyRollView(view) {
    this.currentFrameIndex = view.frameIndex;

    this.pieces.forEach((piece) => {
      this.syncRollPieceImage(piece, {
        frameIndex: view.frameIndex,
        flipX: view.flipX,
        flipY: view.flipY,
        rotation: view.imageRotation,
        scaleY: view.scaleY,
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
    const displayScaleY = options.scaleY ?? 1;
    const visibleHeight = (visibleBounds.bottom - visibleBounds.top) * scaleY * this.pixelScale * displayScaleY;
    const visibleLeft = (visibleBounds.left * scaleX - anchorFrameX) * this.pixelScale;
    const visibleTop = (visibleBounds.top * scaleY - anchorFrameY) * this.pixelScale * displayScaleY;

    if (image.rollFrameIndex !== frameIndex || image.texture?.key !== frame.key) {
      image.setTexture(frame.key);
      image.rollFrameIndex = frameIndex;
    }

    image.setCrop(cropX, cropY, cropWidth, cropHeight);
    image.setScale(this.pixelScale, this.pixelScale * displayScaleY);
    image.setPosition(
      (frame.w / 2 - anchorFrameX) * this.pixelScale,
      (frame.h / 2 - anchorFrameY) * this.pixelScale * displayScaleY,
    );
    image.compositionWidth = visibleWidth;
    image.compositionHeight = visibleHeight;
    image.compositionOffsetX = visibleLeft + visibleWidth / 2 - image.x;
    image.compositionOffsetY = visibleTop + visibleHeight / 2 - image.y;
    image.setFlipX(options.flipX ?? false);
    image.setFlipY(options.flipY ?? false);
    image.setRotation(options.rotation ?? -(this.rotation ?? 0));
  }

  getCuttableReplacementOptions() {
    return {
      fillingType: this.fillingType,
      fillingSubtype: this.fillingSubtype,
    };
  }

  destroy(fromScene) {
    this.stopFlipTween();
    super.destroy(fromScene);
  }
}

Object.getOwnPropertyNames(CuttableObject.prototype).forEach((name) => {
  if (name !== 'constructor' && !Object.prototype.hasOwnProperty.call(SushiRoll.prototype, name)) {
    SushiRoll.prototype[name] = CuttableObject.prototype[name];
  }
});
