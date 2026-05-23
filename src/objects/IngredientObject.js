import * as Phaser from 'phaser/dist/phaser.esm.js';
import { RotatableObject } from './RotatableObject.js';
import { holdSharedTexture, releaseSharedTexture, releaseActiveDrag } from './DraggableObject.js';

let computedShadeTextureId = 0;
const DEFAULT_STACK_OFFSET_Y = -4;
const DEFAULT_VISUAL_VARIATION = {
  uniformScaleRange: 0.024,
  stretchRange: 0.036,
  scaleNoiseRange: 0.01,
};

export class IngredientObject extends RotatableObject {
  constructor(scene, x, y, width, height, options = {}) {
    super(scene, x, y, width, height);

    this.isIngredient = true;
    this._ownWeightGrams = IngredientObject.normalizeWeightGrams(options.weightGrams ?? 0);
    this.softness = 0.9;
    this.restShadowOffset = 0;
    this.dragShadowOffset = 0;
    this.stackCategory = null;
    this.acceptedStackCategories = null;
    this.maxStackedItems = 1;
    this.stackOffsetX = 0;
    this.stackOffsetY = DEFAULT_STACK_OFFSET_Y;
    this.stackChildren = [];
    this.stackParent = null;
    this.stackLocked = false;
    this.longPressDuration = 400;
    this.longPressMoveTolerance = 6;
    this.longPressTimer = null;
    this.longPressOrigin = null;
    this.longPressPointerMoveHandler = null;
    this.kneadableStackCategory = null;
    this.kneadRequiredStrokes = 5;
    this.kneadStrokeDistance = 18;
    this.kneadProgress = 0;
    this.kneadStrokeCount = 0;
    this.kneadGestureAnchor = null;
    this.kneadLastStrokeKind = null;
    this.guidedKneadStrokes = false;
    this.kneadTargetStrokeKind = null;
    this.kneadAwaitingCenter = false;
    this.kneadGestureCirclePadding = 4;
    this.kneadCenterReturnRadiusFactor = 0.25;
    this.kneadTargetRadiusFactor = 0.42;
    this.kneadPointerId = null;
    this.kneadUsesTouch = false;
    this.kneadPointerMoveHandler = null;
    this.kneadPointerUpHandler = null;
    this.kneadMeter = null;
    this.kneadPulseTween = null;
    this.spreadableStackCategory = null;
    this.spreadRequiredStrokes = 6;
    this.spreadStrokeDistance = 18;
    this.spreadProgress = 0;
    this.spreadStrokeCount = 0;
    this.spreadGestureAnchor = null;
    this.spreadPointerId = null;
    this.spreadUsesTouch = false;
    this.spreadPointerMoveHandler = null;
    this.spreadPointerUpHandler = null;
    this.spreadPulseTween = null;
    this.spreadChildBaseScale = null;
    this.spreadLastFeedbackProgress = 0;
    this.spreadRequiresCoverage = false;
    this.finishedStackDisplayName = 'Nigiri';

    this.on('pointerdown', this.handleSpreadPointerDown, this);
    this.on('pointerdown', this.handleKneadPointerDown, this);
    this.on('pointerdown', this.handleStackLongPressDown, this);
    this.on('pointerup', this.cancelStackLongPress, this);
    this.on('pointerupoutside', this.cancelStackLongPress, this);
    this.on('dragstart', this.cancelStackLongPress, this);
    this.computedShadeParts = new Map();
    this.computedShadeDarkAlpha = 0.34;
    this.computedShadeLightAlpha = 0.16;
    this.computedShadePixelSize = 2;
    this.computedShadeBottomCoverage = 0.25;
    this.computedShadeMaxPixels = 20;
    this.computedShadeDarken = 0.5;
    this.computedShadeBottomProfileSmoothing = 0;
    this.computedShadeFadeTween = null;
    this.computedShadeSpinFrames = null;
    this.computedShadeSpinFrameRate = 60;
    this.computedShadeRotationOverride = null;
    this.ingredientVisualVariation = this.createIngredientVisualVariation(options.visualVariation);
  }

  static normalizeWeightGrams(weightGrams) {
    const numericWeight = Number(weightGrams);

    if (!Number.isFinite(numericWeight)) {
      return 0;
    }

    return Math.max(0, Math.round(numericWeight * 10) / 10);
  }

  get ownWeightGrams() {
    return this._ownWeightGrams ?? 0;
  }

  set ownWeightGrams(weightGrams) {
    this._ownWeightGrams = IngredientObject.normalizeWeightGrams(weightGrams);
  }

  get weightGrams() {
    return this.getTotalWeightGrams();
  }

  set weightGrams(weightGrams) {
    this.ownWeightGrams = weightGrams;
  }

  getTotalWeightGrams() {
    const childrenWeight = (this.stackChildren ?? []).reduce(
      (total, child) => total + (child?.weightGrams ?? 0),
      0,
    );

    return IngredientObject.normalizeWeightGrams(this.ownWeightGrams + childrenWeight);
  }

  addDraggablePart(part) {
    this.applyIngredientVisualVariation(part);

    const addedPart = super.addDraggablePart(part);

    if (!part.excludeFromComputedShade) {
      this.addComputedShadePart(addedPart);
    }

    return addedPart;
  }

  createIngredientVisualVariation(variation) {
    if (variation === false) {
      return null;
    }

    if (variation && typeof variation === 'object') {
      return {
        scaleX: variation.scaleX ?? 1,
        scaleY: variation.scaleY ?? 1,
        rotation: variation.rotation ?? 0,
      };
    }

    const randomRange = (range) => (Math.random() * 2 - 1) * range;
    const uniformScale = randomRange(DEFAULT_VISUAL_VARIATION.uniformScaleRange);
    const stretch = randomRange(DEFAULT_VISUAL_VARIATION.stretchRange);
    const scaleNoise = randomRange(DEFAULT_VISUAL_VARIATION.scaleNoiseRange);

    return {
      scaleX: 1 + uniformScale + stretch,
      scaleY: 1 + uniformScale - stretch * 0.65 + scaleNoise,
      rotation: 0,
    };
  }

  getIngredientVisualVariation() {
    if (!this.ingredientVisualVariation) {
      return null;
    }

    return { ...this.ingredientVisualVariation };
  }

  applyIngredientVisualVariation(part) {
    const variation = this.ingredientVisualVariation;

    if (!variation || !part || part.ingredientVisualVariationApplied) {
      return part;
    }

    part.ingredientVisualVariationApplied = true;
    part.setScale(
      (part.scaleX ?? 1) * variation.scaleX,
      (part.scaleY ?? 1) * variation.scaleY,
    );
    part.setRotation((part.rotation ?? 0) + variation.rotation);

    return part;
  }

  setObjectRotation(angle) {
    super.setObjectRotation(angle);

    return this;
  }

  refreshRotatedGeometry(options = {}) {
    super.refreshRotatedGeometry(options);

    if (options.transient) {
      this.applyComputedShadeSpinFrame();
    } else {
      this.refreshComputedShade();
    }

    return this;
  }

  beforeObjectRotationTween(endRotation) {
    this.stopComputedShadeFade();
    this.createComputedShadeSpinFrames(this.rotation ?? 0, endRotation);
    this.setComputedShadeAlpha(1);
  }

  afterObjectRotationTween() {
    this.refreshComputedShade();
    this.clearComputedShadeSpinFrames();
    this.setComputedShadeAlpha(1);
  }

  addComputedShadePart(part) {
    if (!this.computedShadeParts || this.computedShadeParts.has(part)) {
      return null;
    }

    const shade = this.scene.add.image(part.x, part.y, part.texture.key);

    shade.setOrigin(part.originX ?? 0.5, part.originY ?? 0.5);
    shade.setScale(part.scaleX ?? 1, part.scaleY ?? 1);
    shade.setRotation(part.rotation ?? 0);
    shade.setAlpha(0);
    shade.excludeFromComputedShade = true;
    shade.excludeFromCompositionShadow = true;
    shade.computedShadeSourcePart = part;

    this.copyComputedShadeCrop(part, shade);
    this.computedShadeParts.set(part, shade);
    super.addDraggablePart(shade);
    this.syncComputedShadePart(part, shade);

    if (!this.deferComputedShadeRefresh) {
      this.refreshComputedShade();
    }

    return shade;
  }

  borrowComputedShadeFrom(parent) {
    if (!parent?.computedShadeParts?.size || !this.computedShadeParts?.size) {
      return this;
    }

    const parentShade = parent.computedShadeParts.values().next().value;
    const parentShadeKey = parentShade?.computedShadeTextureKey;

    if (!parentShadeKey || !this.scene?.textures?.exists(parentShadeKey)) {
      return this;
    }

    this.computedShadeParts.forEach((shade) => {
      holdSharedTexture(parentShadeKey);
      shade.setTexture(parentShadeKey);
      shade.computedShadeTextureKey = parentShadeKey;
      shade.setAlpha(1);
    });

    return this;
  }

  commitDeferredRenderArtifacts() {
    const ranShade = this.deferComputedShadeRefresh && !this.skipDeferredComputedShadeRefresh;
    const ranShadow = this.deferCompositionShadowRefresh;

    this.deferComputedShadeRefresh = false;
    this.deferCompositionShadowRefresh = false;
    this.skipDeferredComputedShadeRefresh = false;

    if (ranShade) {
      this.refreshComputedShade();
    }

    if (ranShadow && this.refreshCompositionShadow) {
      this.refreshCompositionShadow();
    }

    return this;
  }

  refreshComputedShade() {
    if (!this.computedShadeParts?.size) {
      return this;
    }

    if (this.deferComputedShadeRefresh) {
      return this;
    }

    const profile = this.getComputedShadeProfile();

    if (!profile) {
      return this;
    }

    this.computedShadeParts.forEach((shade, part) => {
      if (!part.active || !shade.active) {
        return;
      }

      this.updateComputedShadePart(part, shade, profile);
    });

    return this;
  }

  createComputedShadeSpinFrames(startRotation, endRotation) {
    this.clearComputedShadeSpinFrames();

    if (!this.computedShadeParts?.size) {
      return this;
    }

    const frameCount = Math.max(
      2,
      Math.ceil((this.rotationDuration / 1000) * this.computedShadeSpinFrameRate),
    );
    const frames = [];
    const previousOverride = this.computedShadeRotationOverride;

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      const progress = frameCount === 1 ? 1 : frameIndex / (frameCount - 1);
      const rotation = startRotation + (endRotation - startRotation) * progress;
      const partTextures = new Map();

      this.computedShadeRotationOverride = rotation;
      const profile = this.getComputedShadeProfile();

      if (!profile) {
        continue;
      }

      this.computedShadeParts.forEach((shade, part) => {
        if (!part.active || !shade.active) {
          return;
        }

        const sourceData = this.getPartShadowSourceData(part);
        const key = sourceData ? this.createComputedShadeTexture(sourceData, profile) : null;

        if (key) {
          partTextures.set(part, key);
        }
      });

      frames.push({ rotation, partTextures });
    }

    this.computedShadeRotationOverride = previousOverride;

    if (frames.length) {
      this.computedShadeSpinFrames = {
        startRotation,
        endRotation,
        frames,
        currentFrameIndex: -1,
      };
      this.applyComputedShadeSpinFrame();
    }

    return this;
  }

  applyComputedShadeSpinFrame() {
    const spinFrames = this.computedShadeSpinFrames;

    if (!spinFrames?.frames.length) {
      return this;
    }

    const span = spinFrames.endRotation - spinFrames.startRotation;
    const rawProgress = Math.abs(span) < 0.0001
      ? 1
      : ((this.rotation ?? 0) - spinFrames.startRotation) / span;
    const progress = Math.max(0, Math.min(1, rawProgress));
    const frameIndex = Math.min(
      spinFrames.frames.length - 1,
      Math.max(0, Math.round(progress * (spinFrames.frames.length - 1))),
    );

    if (frameIndex === spinFrames.currentFrameIndex) {
      return this;
    }

    const frame = spinFrames.frames[frameIndex];

    spinFrames.currentFrameIndex = frameIndex;
    frame.partTextures.forEach((key, part) => {
      const shade = this.computedShadeParts.get(part);

      if (!shade?.active) {
        return;
      }

      shade.setTexture(key);
      this.copyComputedShadeCrop(part, shade);
      this.syncComputedShadePart(part, shade);
      shade.setAlpha(1);
    });

    return this;
  }

  clearComputedShadeSpinFrames() {
    if (!this.computedShadeSpinFrames?.frames) {
      this.computedShadeSpinFrames = null;
      return this;
    }

    this.computedShadeSpinFrames.frames.forEach((frame) => {
      frame.partTextures.forEach((key) => {
        if (key && this.scene.textures.exists(key)) {
          this.scene.textures.remove(key);
        }
      });
      frame.partTextures.clear();
    });

    this.computedShadeSpinFrames = null;

    return this;
  }

  getComputedShadeTargets() {
    if (!this.computedShadeParts?.size) {
      return [];
    }

    return [...this.computedShadeParts.values()].filter((shade) => shade.active);
  }

  setComputedShadeAlpha(alpha) {
    this.stopComputedShadeFade();
    this.getComputedShadeTargets().forEach((shade) => {
      shade.setAlpha(alpha);
    });

    return this;
  }

  fadeComputedShadeTo(alpha, duration, ease) {
    const targets = this.getComputedShadeTargets();

    this.stopComputedShadeFade();

    if (!targets.length) {
      return this;
    }

    this.computedShadeFadeTween = this.scene.tweens.add({
      targets,
      alpha,
      duration,
      ease,
      onComplete: () => {
        this.computedShadeFadeTween = null;
      },
    });

    return this;
  }

  stopComputedShadeFade() {
    if (!this.computedShadeFadeTween) {
      return;
    }

    this.computedShadeFadeTween.stop();
    this.computedShadeFadeTween = null;
  }

  getComputedShadeProfile() {
    let minY = Infinity;
    let maxY = -Infinity;
    const bottomByX = new Map();

    this.computedShadeParts.forEach((_shade, part) => {
      const sourceData = this.getPartShadowSourceData(part);

      if (!sourceData) {
        return;
      }

      this.forEachVisibleSourcePixel(part, sourceData, (_x, _y, screenX, screenY) => {
        minY = Math.min(minY, screenY);
        maxY = Math.max(maxY, screenY);

        const bucket = Math.round(screenX);
        const existing = bottomByX.get(bucket);

        if (existing === undefined || screenY > existing) {
          bottomByX.set(bucket, screenY);
        }
      });
    });

    if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
      return null;
    }

    const smoothingRadius = Math.max(0, Math.floor(this.computedShadeBottomProfileSmoothing ?? 0));

    return {
      minY,
      maxY,
      spanY: Math.max(1, maxY - minY),
      bottomByX: smoothingRadius > 0
        ? this.getSmoothedComputedShadeBottomProfile(bottomByX, smoothingRadius)
        : bottomByX,
    };
  }

  getSmoothedComputedShadeBottomProfile(bottomByX, radius) {
    if (!bottomByX?.size || radius <= 0) {
      return bottomByX;
    }

    const smoothed = new Map();

    bottomByX.forEach((_bottomY, bucket) => {
      const samples = [];

      for (let offset = -radius; offset <= radius; offset += 1) {
        const sample = bottomByX.get(bucket + offset);

        if (sample !== undefined) {
          samples.push(sample);
        }
      }

      if (!samples.length) {
        return;
      }

      samples.sort((a, b) => a - b);
      smoothed.set(bucket, samples[Math.floor(samples.length / 2)]);
    });

    return smoothed;
  }

  getLocalBottomY(profile, screenX) {
    if (!profile.bottomByX || profile.bottomByX.size === 0) {
      return profile.maxY;
    }

    const bucket = Math.round(screenX);
    const exact = profile.bottomByX.get(bucket);

    if (exact !== undefined) {
      return exact;
    }

    let nearestLower;
    let nearestUpper;
    const maxSearchOffset = Math.max(3, Math.ceil(profile.spanY));

    for (let offset = 1; offset <= maxSearchOffset; offset += 1) {
      const lower = profile.bottomByX.get(bucket - offset);
      const upper = profile.bottomByX.get(bucket + offset);

      if (lower !== undefined && !nearestLower) {
        nearestLower = { value: lower, distance: offset };
      }

      if (upper !== undefined && !nearestUpper) {
        nearestUpper = { value: upper, distance: offset };
      }

      if (nearestLower && nearestUpper) {
        const totalDistance = nearestLower.distance + nearestUpper.distance;

        return (
          nearestLower.value * nearestUpper.distance
          + nearestUpper.value * nearestLower.distance
        ) / totalDistance;
      }
    }

    return nearestLower?.value ?? nearestUpper?.value ?? profile.maxY;
  }

  updateComputedShadePart(part, shade, profile) {
    const sourceData = this.getPartShadowSourceData(part);

    if (!sourceData) {
      shade.setAlpha(0);
      return;
    }

    const key = this.createComputedShadeTexture(sourceData, profile);

    if (!key) {
      shade.setAlpha(0);
      return;
    }

    this.replaceComputedShadeTexture(shade, key);
    this.copyComputedShadeCrop(part, shade);
    this.syncComputedShadePart(part, shade);
    shade.setAlpha(1);
  }

  createComputedShadeTexture(sourceData, profile) {
    const { frameWidth, frameHeight, cropX, cropY } = sourceData;
    const key = `computed-ingredient-shade-${computedShadeTextureId}`;
    const texture = this.scene.textures.createCanvas(key, frameWidth, frameHeight);

    computedShadeTextureId += 1;

    if (!texture) {
      return null;
    }

    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, frameWidth, frameHeight);

    this.paintComputedShadeBlocks(context, sourceData, cropX, cropY, profile);

    texture.refresh();

    return key;
  }

  paintComputedShadeBlocks(context, sourceData, cropX, cropY, profile) {
    const blockSize = Math.max(1, this.computedShadePixelSize);
    const bandHeight = Math.min(
      profile.spanY * this.computedShadeBottomCoverage,
      this.computedShadeMaxPixels,
    );

    for (let blockY = 0; blockY < sourceData.sourceHeight; blockY += blockSize) {
      for (let blockX = 0; blockX < sourceData.sourceWidth; blockX += blockSize) {
        const block = this.getComputedShadeBlock(sourceData, blockX, blockY, blockSize);

        if (!block) {
          continue;
        }

        const shadeProgress = (block.screenY - profile.minY) / profile.spanY;
        const lightAlpha = Math.max(0, (0.28 - shadeProgress) / 0.28) * this.computedShadeLightAlpha;
        const localBottomY = this.getLocalBottomY(profile, block.screenX);
        const distanceFromBottom = localBottomY - block.screenY;
        const darkProgress = bandHeight > 0
          ? Math.max(0, Math.min(1, 1 - distanceFromBottom / bandHeight))
          : 0;
        const darkAlpha = darkProgress * this.computedShadeDarkAlpha;

        if (lightAlpha > darkAlpha && lightAlpha > 0.015) {
          context.fillStyle = `rgba(255,255,255,${lightAlpha.toFixed(3)})`;
          context.fillRect(cropX + blockX, cropY + blockY, block.width, block.height);
          continue;
        }

        if (darkAlpha > 0.015) {
          const shadeColor = this.getDarkenedComputedShadeColor(block.color);

          context.fillStyle = `rgba(${shadeColor.r},${shadeColor.g},${shadeColor.b},${darkAlpha.toFixed(3)})`;
          context.fillRect(cropX + blockX, cropY + blockY, block.width, block.height);
        }
      }
    }
  }

  getComputedShadeBlock(sourceData, blockX, blockY, blockSize) {
    const {
      imageData,
      sourceWidth,
      sourceHeight,
    } = sourceData;
    const width = Math.min(blockSize, sourceWidth - blockX);
    const height = Math.min(blockSize, sourceHeight - blockY);
    let screenXTotal = 0;
    let screenYTotal = 0;
    let redTotal = 0;
    let greenTotal = 0;
    let blueTotal = 0;
    let visiblePixels = 0;

    for (let y = blockY; y < blockY + height; y += 1) {
      for (let x = blockX; x < blockX + width; x += 1) {
        const pixelIndex = (y * sourceWidth + x) * 4;
        const alpha = imageData.data[pixelIndex + 3];

        if (alpha === 0) {
          continue;
        }

        const point = this.getComputedShadeScreenPoint(sourceData, x, y);

        screenXTotal += point.screenX;
        screenYTotal += point.screenY;
        redTotal += imageData.data[pixelIndex];
        greenTotal += imageData.data[pixelIndex + 1];
        blueTotal += imageData.data[pixelIndex + 2];
        visiblePixels += 1;
      }
    }

    if (visiblePixels === 0) {
      return null;
    }

    return {
      width,
      height,
      screenX: screenXTotal / visiblePixels,
      screenY: screenYTotal / visiblePixels,
      color: {
        r: redTotal / visiblePixels,
        g: greenTotal / visiblePixels,
        b: blueTotal / visiblePixels,
      },
    };
  }

  getDarkenedComputedShadeColor(color) {
    return {
      r: Math.round(color.r * this.computedShadeDarken),
      g: Math.round(color.g * this.computedShadeDarken),
      b: Math.round(color.b * this.computedShadeDarken),
    };
  }

  forEachVisibleSourcePixel(part, sourceData, callback) {
    const {
      imageData,
      sourceWidth,
      sourceHeight,
      cropX,
      cropY,
      frameWidth,
      frameHeight,
    } = sourceData;
    const originX = part.originX ?? 0.5;
    const originY = part.originY ?? 0.5;
    const scaleX = part.scaleX ?? 1;
    const scaleY = part.scaleY ?? 1;
    const partRotation = part.rotation ?? 0;
    const objectRotation = this.computedShadeRotationOverride ?? this.rotation ?? 0;
    const partSin = Math.sin(partRotation);
    const partCos = Math.cos(partRotation);
    const objectSin = Math.sin(objectRotation);
    const objectCos = Math.cos(objectRotation);

    for (let y = 0; y < sourceHeight; y += 1) {
      for (let x = 0; x < sourceWidth; x += 1) {
        const alpha = imageData.data[(y * sourceWidth + x) * 4 + 3];

        if (alpha === 0) {
          continue;
        }

        const point = this.getComputedShadeScreenPoint(sourceData, x, y, {
          part,
          originX,
          originY,
          scaleX,
          scaleY,
          partSin,
          partCos,
          objectSin,
          objectCos,
        });

        callback(x, y, point.screenX, point.screenY);
      }
    }
  }

  getComputedShadeScreenPoint(sourceData, x, y, transforms = null) {
    const {
      cropX,
      cropY,
      frameWidth,
      frameHeight,
    } = sourceData;
    const part = transforms?.part ?? sourceData.part;
    const originX = transforms?.originX ?? part?.originX ?? 0.5;
    const originY = transforms?.originY ?? part?.originY ?? 0.5;
    const scaleX = transforms?.scaleX ?? part?.scaleX ?? 1;
    const scaleY = transforms?.scaleY ?? part?.scaleY ?? 1;
    const partRotation = part?.rotation ?? 0;
    const objectRotation = this.computedShadeRotationOverride ?? this.rotation ?? 0;
    const partSin = transforms?.partSin ?? Math.sin(partRotation);
    const partCos = transforms?.partCos ?? Math.cos(partRotation);
    const objectSin = transforms?.objectSin ?? Math.sin(objectRotation);
    const objectCos = transforms?.objectCos ?? Math.cos(objectRotation);
    const localTextureX = cropX + x + 0.5 - frameWidth * originX;
    const localTextureY = cropY + y + 0.5 - frameHeight * originY;
    const localPartX = localTextureX * scaleX;
    const localPartY = localTextureY * scaleY;
    const objectX = (part?.x ?? 0) + localPartX * partCos - localPartY * partSin;
    const objectY = (part?.y ?? 0) + localPartX * partSin + localPartY * partCos;

    return {
      screenX: objectX * objectCos - objectY * objectSin,
      screenY: objectX * objectSin + objectY * objectCos,
    };
  }

  syncComputedShadePart(part, shade) {
    const basePosition = this.draggablePartBasePositions?.get(part) ?? { x: part.x, y: part.y };
    const baseScale = this.draggablePartBaseScales?.get(part) ?? { scaleX: part.scaleX, scaleY: part.scaleY };

    shade.setOrigin(part.originX ?? 0.5, part.originY ?? 0.5);
    shade.setPosition(part.x, part.y);
    shade.setScale(part.scaleX ?? 1, part.scaleY ?? 1);
    shade.setRotation(part.rotation ?? 0);

    this.draggablePartBasePositions?.set(shade, {
      x: basePosition.x,
      y: basePosition.y,
    });
    this.draggablePartBaseScales?.set(shade, {
      scaleX: baseScale.scaleX,
      scaleY: baseScale.scaleY,
    });
  }

  copyComputedShadeCrop(part, shade) {
    if (part.isCropped && part._crop) {
      shade.setCrop(part._crop.cx, part._crop.cy, part._crop.cw, part._crop.ch);
      return;
    }

    shade.setCrop();
  }

  replaceComputedShadeTexture(shade, key) {
    const previousKey = shade.computedShadeTextureKey;

    shade.setTexture(key);
    shade.computedShadeTextureKey = key;

    if (previousKey && previousKey !== key) {
      releaseSharedTexture(this.scene, previousKey);
    }
  }

  clearComputedShadeParts() {
    if (!this.computedShadeParts) {
      return;
    }

    this.stopComputedShadeFade();
    this.clearComputedShadeSpinFrames();

    this.computedShadeParts.forEach((shade) => {
      const key = shade.computedShadeTextureKey;

      shade.destroy();
      releaseSharedTexture(this.scene, key);
    });

    this.computedShadeParts.clear();
  }

  handleSpreadPointerDown(pointer) {
    if (!this.canStartSpreading() || !this.isSpreadStartPointer(pointer)) {
      return;
    }

    pointer.event?.preventDefault?.();
    this.beginSpreading(pointer);
  }

  canStartSpreading() {
    if (this.isFinishedStack || this.stackLocked || !this.spreadableStackCategory) {
      return false;
    }

    return Boolean(this.getSpreadIngredient());
  }

  getSpreadIngredient() {
    if (!this.stackChildren?.length) {
      return null;
    }

    return this.stackChildren.find((child) => (
      child?.stackCategory === this.spreadableStackCategory
    )) ?? null;
  }

  isSpreadStartPointer(pointer) {
    return this.isRightButtonPointer(pointer) || this.isTwoFingerTouchPointer(pointer);
  }

  beginSpreading(pointer) {
    if (this.isSpreading) {
      return false;
    }

    const position = this.getSpreadPointerPosition(pointer);

    if (!position) {
      return false;
    }

    const spreadIngredient = this.getSpreadIngredient();

    this.cancelStackLongPress();
    this.cancelActiveDragForKneading();

    this.isSpreading = true;
    this.spreadUsesTouch = this.isTouchPointer(pointer);
    this.spreadPointerId = this.getDragPointerId(pointer);
    this.spreadGestureAnchor = position;
    this.spreadStrokeCount = 0;
    this.spreadProgress = 0;
    this.spreadChildBaseScale = spreadIngredient
      ? { scaleX: spreadIngredient.scaleX || 1, scaleY: spreadIngredient.scaleY || 1 }
      : null;
    this.suppressedDragPointerId = this.spreadPointerId;

    this.setStackHighlight(true);
    this.showKneadMeter();
    this.spreadLastFeedbackProgress = this.beginSpreadFeedback?.(position, spreadIngredient) ?? 0;
    if (Number.isFinite(this.spreadLastFeedbackProgress)) {
      this.spreadProgress = Phaser.Math.Clamp(this.spreadLastFeedbackProgress, 0, 1);
    }
    this.updateSpreadMeter();

    this.spreadPointerMoveHandler = (movePointer) => {
      this.handleSpreadPointerMove(movePointer);
    };
    this.spreadPointerUpHandler = (upPointer) => {
      this.handleSpreadPointerUp(upPointer);
    };

    this.scene.input.on('pointermove', this.spreadPointerMoveHandler);
    this.scene.input.on('pointerup', this.spreadPointerUpHandler);
    this.scene.input.on('pointerupoutside', this.spreadPointerUpHandler);

    return true;
  }

  getSpreadPointerPosition(pointer) {
    if (this.spreadUsesTouch || this.isTouchPointer(pointer)) {
      const touchPointers = this.getActiveTouchPointers();

      if (touchPointers.length >= 2) {
        const total = touchPointers.reduce((sum, touchPointer) => ({
          x: sum.x + touchPointer.x,
          y: sum.y + touchPointer.y,
        }), { x: 0, y: 0 });

        return {
          x: total.x / touchPointers.length,
          y: total.y / touchPointers.length,
        };
      }
    }

    if (!pointer) {
      return null;
    }

    return { x: pointer.x, y: pointer.y };
  }

  handleSpreadPointerMove(pointer) {
    if (!this.isSpreading) {
      return;
    }

    if (!this.spreadUsesTouch && this.getDragPointerId(pointer) !== this.spreadPointerId) {
      return;
    }

    const position = this.getSpreadPointerPosition(pointer);

    if (!position || !this.spreadGestureAnchor) {
      return;
    }

    const dx = position.x - this.spreadGestureAnchor.x;
    const dy = position.y - this.spreadGestureAnchor.y;
    const distance = Math.hypot(dx, dy);
    const feedbackProgress = this.updateSpreadFeedback?.(position, {
      previousPosition: this.spreadGestureAnchor,
      distance,
      pointer,
    });

    if (Number.isFinite(feedbackProgress)) {
      this.spreadLastFeedbackProgress = Phaser.Math.Clamp(feedbackProgress, 0, 1);
      this.spreadProgress = Math.max(this.spreadProgress, this.spreadLastFeedbackProgress);
      this.updateSpreadMeter();

      if (this.spreadProgress >= 1) {
        this.completeSpreading();
        return;
      }
    }

    if (distance < this.spreadStrokeDistance) {
      return;
    }

    this.spreadGestureAnchor = position;
    this.registerSpreadStroke(dx, dy, this.spreadLastFeedbackProgress);
  }

  registerSpreadStroke(dx, dy, feedbackProgress = null) {
    this.spreadStrokeCount += 1;
    const strokeProgress = this.spreadRequiresCoverage
      ? 0
      : Phaser.Math.Clamp(
        this.spreadStrokeCount / this.spreadRequiredStrokes,
        0,
        1,
      );

    this.spreadProgress = Math.max(
      strokeProgress,
      Number.isFinite(feedbackProgress) ? feedbackProgress : 0,
    );

    this.playSpreadPulse(dx, dy);
    this.updateSpreadMeter();

    if (this.spreadProgress >= 1) {
      this.completeSpreading();
    }
  }

  handleSpreadPointerUp(pointer) {
    if (!this.isSpreading) {
      return;
    }

    if (this.spreadUsesTouch) {
      if (this.getActiveTouchPointers().length < 2) {
        this.finishSpreading();
      }
      return;
    }

    if (this.getDragPointerId(pointer) === this.spreadPointerId) {
      this.finishSpreading();
    }
  }

  completeSpreading() {
    const spreadIngredient = this.getSpreadIngredient();
    const result = this.createSpreadStackResult?.(spreadIngredient);

    this.completeSpreadFeedback?.();
    this.finishSpreading();

    if (result) {
      this.replaceWithSpreadStackResult(result);
      return;
    }

    this.stackLocked = true;
    this.isFinishedStack = true;
    this.spreadProgress = 1;
    this.playFinishedStackPulse();
  }

  replaceWithSpreadStackResult(result) {
    if (!result) {
      return;
    }

    result.setDepth(Math.max(result.depth ?? 0, this.depth ?? 0));
    result.applyRestingDepth?.();
    result.playFinishedStackPulse?.();

    const cuttableObjects = this.scene?.cuttableObjects;
    const cuttableIndex = Array.isArray(cuttableObjects) ? cuttableObjects.indexOf(this) : -1;

    if (cuttableIndex !== -1) {
      cuttableObjects.splice(cuttableIndex, 1, result);
    }

    const children = [...(this.stackChildren ?? [])];

    this.stackChildren = [];
    children.forEach((child) => {
      child.stackParent = null;
      child.destroy();
    });

    this.destroy();
  }

  finishSpreading() {
    if (this.spreadPointerMoveHandler) {
      this.scene.input.off('pointermove', this.spreadPointerMoveHandler);
      this.spreadPointerMoveHandler = null;
    }

    if (this.spreadPointerUpHandler) {
      this.scene.input.off('pointerup', this.spreadPointerUpHandler);
      this.scene.input.off('pointerupoutside', this.spreadPointerUpHandler);
      this.spreadPointerUpHandler = null;
    }

    this.isSpreading = false;
    this.spreadPointerId = null;
    this.spreadUsesTouch = false;
    this.spreadGestureAnchor = null;
    this.spreadChildBaseScale = null;
    this.spreadLastFeedbackProgress = 0;
    this.suppressedDragPointerId = null;
    this.setStackHighlight(false);
    this.finishSpreadFeedback?.();
    this.hideKneadMeter();
  }

  handleKneadPointerDown(pointer) {
    if (!this.canStartKneading() || !this.isKneadStartPointer(pointer)) {
      return;
    }

    pointer.event?.preventDefault?.();
    this.beginKneading(pointer);
  }

  canStartKneading() {
    if (this.isFinishedStack || this.stackLocked || !this.kneadableStackCategory) {
      return false;
    }

    return Boolean(this.getKneadTopping());
  }

  getKneadTopping() {
    if (!this.stackChildren?.length) {
      return null;
    }

    return this.stackChildren.find((child) => (
      child?.stackCategory === this.kneadableStackCategory
    )) ?? null;
  }

  isKneadStartPointer(pointer) {
    return this.isRightButtonPointer(pointer) || this.isTwoFingerTouchPointer(pointer);
  }

  isRightButtonPointer(pointer) {
    if (!pointer) {
      return false;
    }

    return Boolean(
      pointer.rightButtonDown?.()
      || pointer.button === 2
      || pointer.event?.button === 2
      || pointer.buttons === 2
      || pointer.event?.buttons === 2,
    );
  }

  isTouchPointer(pointer) {
    return pointer?.event?.pointerType === 'touch'
      || pointer?.pointerType === 'touch'
      || pointer?.wasTouch === true;
  }

  isTwoFingerTouchPointer(pointer) {
    if (!this.isTouchPointer(pointer)) {
      return false;
    }

    return pointer.event?.isPrimary === false || this.getActiveTouchPointers().length >= 2;
  }

  getActiveTouchPointers() {
    const managerPointers = this.scene?.input?.manager?.pointers;
    const pluginPointers = this.scene?.input?.pointers;
    const pointers = Array.isArray(managerPointers)
      ? managerPointers
      : Array.isArray(pluginPointers)
        ? pluginPointers
        : [];

    return pointers.filter((pointer) => pointer?.isDown && this.isTouchPointer(pointer));
  }

  beginKneading(pointer) {
    if (this.isKneading) {
      return false;
    }

    const position = this.getKneadPointerPosition(pointer);

    if (!position) {
      return false;
    }

    if (!this.isKneadPositionInsideMeter(position)) {
      return false;
    }

    this.cancelStackLongPress();
    this.cancelActiveDragForKneading();

    this.isKneading = true;
    this.kneadUsesTouch = this.isTouchPointer(pointer);
    this.kneadPointerId = this.getDragPointerId(pointer);
    this.kneadGestureAnchor = position;
    this.kneadLastStrokeKind = null;
    this.kneadAwaitingCenter = false;
    this.kneadTargetStrokeKind = this.guidedKneadStrokes
      ? this.getNextKneadTargetStrokeKind()
      : null;
    this.kneadStrokeCount = 0;
    this.kneadProgress = 0;
    this.suppressedDragPointerId = this.kneadPointerId;

    this.setStackHighlight(true);
    this.showKneadMeter();
    this.updateKneadMeter();

    this.kneadPointerMoveHandler = (movePointer) => {
      this.handleKneadPointerMove(movePointer);
    };
    this.kneadPointerUpHandler = (upPointer) => {
      this.handleKneadPointerUp(upPointer);
    };

    this.scene.input.on('pointermove', this.kneadPointerMoveHandler);
    this.scene.input.on('pointerup', this.kneadPointerUpHandler);
    this.scene.input.on('pointerupoutside', this.kneadPointerUpHandler);

    return true;
  }

  cancelActiveDragForKneading() {
    if (this.isManualDrag) {
      this.scene.input.off('pointermove', this.manualDragMoveHandler);
      this.scene.input.off('pointerup', this.manualDragUpHandler);
      this.scene.input.off('pointerupoutside', this.manualDragUpHandler);
      this.manualDragMoveHandler = null;
      this.manualDragUpHandler = null;
      this.isManualDrag = false;
    }

    if (!this.isDragging) {
      return;
    }

    this.isDragging = false;
    this.clearStackHoverHighlight?.();
    this.tweenDragLift(0, this.dropLiftDuration, 'Quad.easeIn', () => {
      if (!this.isDragging) {
        this.applyRestingDepth();
        this.refreshOtherRestingDepths();
      }
    });
  }

  getKneadPointerPosition(pointer) {
    if (this.kneadUsesTouch || this.isTouchPointer(pointer)) {
      const touchPointers = this.getActiveTouchPointers();

      if (touchPointers.length >= 2) {
        const total = touchPointers.reduce((sum, touchPointer) => ({
          x: sum.x + touchPointer.x,
          y: sum.y + touchPointer.y,
        }), { x: 0, y: 0 });

        return {
          x: total.x / touchPointers.length,
          y: total.y / touchPointers.length,
        };
      }
    }

    if (!pointer) {
      return null;
    }

    return { x: pointer.x, y: pointer.y };
  }

  handleKneadPointerMove(pointer) {
    if (!this.isKneading) {
      return;
    }

    if (!this.kneadUsesTouch && this.getDragPointerId(pointer) !== this.kneadPointerId) {
      return;
    }

    const position = this.getKneadPointerPosition(pointer);

    if (!position) {
      return;
    }

    if (!this.isKneadPositionInsideMeter(position)) {
      this.kneadGestureAnchor = null;
      return;
    }

    if (!this.kneadGestureAnchor) {
      this.kneadGestureAnchor = position;
      return;
    }

    if (this.guidedKneadStrokes) {
      this.handleGuidedKneadPointerMove(position);
      return;
    }

    const dx = position.x - this.kneadGestureAnchor.x;
    const dy = position.y - this.kneadGestureAnchor.y;
    const distance = Math.hypot(dx, dy);

    if (distance < this.kneadStrokeDistance) {
      return;
    }

    const strokeKind = this.getKneadStrokeKind(dx, dy);

    this.kneadGestureAnchor = position;

    if (!strokeKind || strokeKind === this.kneadLastStrokeKind) {
      return;
    }

    this.registerKneadStroke(strokeKind);
  }

  getKneadStrokeKind(dx, dy) {
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absY >= this.kneadStrokeDistance && absY > absX * 0.75) {
      return dy < 0 ? 'up' : 'down';
    }

    if (absX >= this.kneadStrokeDistance && absX > absY * 0.75) {
      return dx < 0 ? 'left' : 'right';
    }

    return null;
  }

  getKneadStrokeAxis(strokeKind) {
    return strokeKind === 'left' || strokeKind === 'right'
      ? 'horizontal'
      : 'vertical';
  }

  getKneadStrokeKinds() {
    return ['up', 'down', 'left', 'right'];
  }

  getNextKneadTargetStrokeKind(previousKind = this.kneadTargetStrokeKind) {
    const candidates = this.getKneadStrokeKinds().filter((kind) => kind !== previousKind);
    const pool = candidates.length ? candidates : this.getKneadStrokeKinds();
    const index = Math.floor(Math.random() * pool.length);

    return pool[index] ?? null;
  }

  handleGuidedKneadPointerMove(position) {
    const zone = this.getGuidedKneadZone(position);

    if (this.kneadAwaitingCenter) {
      if (zone !== 'center') {
        return;
      }

      this.kneadAwaitingCenter = false;
      this.kneadTargetStrokeKind = this.getNextKneadTargetStrokeKind();
      this.kneadGestureAnchor = position;
      this.updateKneadMeter();
      return;
    }

    if (zone !== this.kneadTargetStrokeKind) {
      return;
    }

    this.kneadGestureAnchor = position;
    this.registerKneadStroke(zone);

    if (!this.isKneading) {
      return;
    }

    this.kneadAwaitingCenter = true;
    this.updateKneadMeter();
  }

  getGuidedKneadZone(position) {
    const local = this.worldToLocalPoint(position);
    const { centerX, centerY, radius } = this.getKneadMeterCircle();
    const dx = local.x - centerX;
    const dy = local.y - centerY;
    const distance = Math.hypot(dx, dy);
    const centerRadius = Math.max(8, radius * this.kneadCenterReturnRadiusFactor);

    if (distance <= centerRadius) {
      return 'center';
    }

    const targetRadius = Math.max(this.kneadStrokeDistance, radius * this.kneadTargetRadiusFactor);

    if (distance < targetRadius) {
      return null;
    }

    return this.getKneadStrokeKind(dx, dy);
  }

  registerKneadStroke(strokeKind) {
    this.kneadLastStrokeKind = strokeKind;
    this.kneadStrokeCount += 1;
    this.kneadProgress = Phaser.Math.Clamp(
      this.kneadStrokeCount / this.kneadRequiredStrokes,
      0,
      1,
    );

    this.playKneadPulse(strokeKind);
    this.updateKneadMeter();

    if (this.kneadProgress >= 1) {
      this.completeKneading();
    }
  }

  handleKneadPointerUp(pointer) {
    if (!this.isKneading) {
      return;
    }

    if (this.kneadUsesTouch) {
      if (this.getActiveTouchPointers().length < 2) {
        this.finishKneading();
      }
      return;
    }

    if (this.getDragPointerId(pointer) === this.kneadPointerId) {
      this.finishKneading();
    }
  }

  completeKneading() {
    const topping = this.getKneadTopping();
    const result = this.createKneadedStackResult?.(topping);

    this.finishKneading();

    if (result) {
      this.replaceWithKneadedStackResult(result);
      return;
    }

    this.stackLocked = true;
    this.isFinishedStack = true;
    this.kneadProgress = 1;

    if (this.finishedStackDisplayName) {
      this.displayName = this.finishedStackDisplayName;
    }

    if (topping) {
      const targetY = (this.stackOffsetY ?? topping.y) + 2;

      this.scene.tweens.add({
        targets: topping,
        y: targetY,
        duration: 160,
        ease: 'Back.Out',
        onComplete: () => {
          this.refreshCompositionShadow?.();
        },
      });
    }

    this.playFinishedStackPulse();
  }

  replaceWithKneadedStackResult(result) {
    if (!result) {
      return;
    }

    result.setDepth(Math.max(result.depth ?? 0, this.depth ?? 0));
    result.applyRestingDepth?.();
    result.playFinishedStackPulse?.();

    const children = [...(this.stackChildren ?? [])];

    this.stackChildren = [];
    children.forEach((child) => {
      child.stackParent = null;
      child.destroy();
    });

    this.destroy();
  }

  finishKneading() {
    if (this.kneadPointerMoveHandler) {
      this.scene.input.off('pointermove', this.kneadPointerMoveHandler);
      this.kneadPointerMoveHandler = null;
    }

    if (this.kneadPointerUpHandler) {
      this.scene.input.off('pointerup', this.kneadPointerUpHandler);
      this.scene.input.off('pointerupoutside', this.kneadPointerUpHandler);
      this.kneadPointerUpHandler = null;
    }

    this.isKneading = false;
    this.kneadPointerId = null;
    this.kneadUsesTouch = false;
    this.kneadGestureAnchor = null;
    this.kneadLastStrokeKind = null;
    this.kneadTargetStrokeKind = null;
    this.kneadAwaitingCenter = false;
    this.suppressedDragPointerId = null;
    this.setStackHighlight(false);
    this.hideKneadMeter();
  }

  showKneadMeter() {
    if (this.kneadMeter) {
      return;
    }

    this.kneadMeter = this.scene.add.graphics();
    this.kneadMeter.excludeFromCompositionShadow = true;
    this.add(this.kneadMeter);
  }

  getKneadMeterBounds() {
    const bounds = this.getLocalVisualBounds();

    (this.stackChildren ?? []).forEach((child) => {
      const childBounds = child?.getLocalVisualBounds?.();

      if (!childBounds) {
        return;
      }

      Phaser.Geom.Rectangle.MergeRect(
        bounds,
        new Phaser.Geom.Rectangle(
          child.x + childBounds.x,
          child.y + childBounds.y,
          childBounds.width,
          childBounds.height,
        ),
      );
    });

    return bounds;
  }

  getKneadMeterCircle() {
    const bounds = this.getKneadMeterBounds();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const radius = Math.hypot(bounds.width / 2, bounds.height / 2) + 7;

    return { centerX, centerY, radius };
  }

  isKneadPositionInsideMeter(position) {
    if (!position) {
      return false;
    }

    const local = this.worldToLocalPoint(position);
    const { centerX, centerY, radius } = this.getKneadMeterCircle();
    const dx = local.x - centerX;
    const dy = local.y - centerY;
    const maxDistance = radius + (this.kneadGestureCirclePadding ?? 0);

    return dx * dx + dy * dy <= maxDistance * maxDistance;
  }

  getLocalVisualBounds() {
    const bounds = new Phaser.Geom.Rectangle(
      this.hitbox.x,
      this.hitbox.y,
      this.hitbox.width,
      this.hitbox.height,
    );
    const parts = this.draggableParts?.filter((part) => !part?.excludeFromCompositionShadow) ?? [];

    if (!parts.length) {
      return bounds;
    }

    const firstPart = parts[0];
    const firstBounds = this.getPartLocalBounds(firstPart);

    bounds.setTo(firstBounds.x, firstBounds.y, firstBounds.width, firstBounds.height);

    parts.slice(1).forEach((part) => {
      Phaser.Geom.Rectangle.MergeRect(bounds, this.getPartLocalBounds(part));
    });

    return bounds;
  }

  getPartLocalBounds(part) {
    const width = part.compositionWidth ?? part.displayWidth ?? part.width ?? 0;
    const height = part.compositionHeight ?? part.displayHeight ?? part.height ?? 0;
    const centerX = part.x + (part.compositionOffsetX ?? 0);
    const centerY = part.y + (part.compositionOffsetY ?? 0);

    return new Phaser.Geom.Rectangle(
      centerX - width / 2,
      centerY - height / 2,
      width,
      height,
    );
  }

  updateKneadMeter() {
    if (!this.kneadMeter) {
      return;
    }

    const { centerX, centerY, radius } = this.getKneadMeterCircle();
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * this.kneadProgress;
    const guideRadius = radius * 0.58;

    this.kneadMeter.clear();
    this.kneadMeter.lineStyle(2, 0x6b4a32, 0.35);
    this.kneadMeter.strokeCircle(centerX, centerY, radius);
    this.kneadMeter.lineStyle(1, 0x6b4a32, 0.24);
    this.kneadMeter.lineBetween(centerX - guideRadius, centerY, centerX + guideRadius, centerY);
    this.kneadMeter.lineBetween(centerX, centerY - guideRadius, centerX, centerY + guideRadius);
    this.drawGuidedKneadTarget(centerX, centerY, guideRadius);
    this.kneadMeter.lineStyle(4, 0xfff2a8, 0.95);
    this.kneadMeter.beginPath();
    this.kneadMeter.arc(centerX, centerY, radius, startAngle, endAngle, false);
    this.kneadMeter.strokePath();
  }

  drawGuidedKneadTarget(centerX, centerY, guideRadius) {
    if (!this.guidedKneadStrokes || !this.kneadMeter) {
      return;
    }

    if (this.kneadAwaitingCenter) {
      this.kneadMeter.fillStyle(0xfff2a8, 0.38);
      this.kneadMeter.fillCircle(centerX, centerY, 5);
      this.kneadMeter.lineStyle(2, 0xfff2a8, 0.82);
      this.kneadMeter.strokeCircle(centerX, centerY, 8);
      return;
    }

    const vectors = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };
    const vector = vectors[this.kneadTargetStrokeKind];

    if (!vector) {
      return;
    }

    const targetX = centerX + vector.x * guideRadius;
    const targetY = centerY + vector.y * guideRadius;

    this.kneadMeter.lineStyle(4, 0xfff2a8, 0.8);
    this.kneadMeter.lineBetween(centerX, centerY, targetX, targetY);
    this.kneadMeter.fillStyle(0xfff2a8, 0.92);
    this.kneadMeter.fillCircle(targetX, targetY, 4);
  }

  updateSpreadMeter() {
    if (!this.kneadMeter) {
      return;
    }

    const bounds = this.getKneadMeterBounds();
    const inset = 6;
    const width = Math.max(8, bounds.width + inset * 2);
    const height = Math.max(8, bounds.height + inset * 2);
    const x = bounds.x - inset;
    const y = bounds.y - inset;
    const progressWidth = width * Phaser.Math.Clamp(this.spreadProgress, 0, 1);

    this.kneadMeter.clear();
    this.kneadMeter.lineStyle(2, 0x143026, 0.4);
    this.kneadMeter.strokeRect(x, y, width, height);
    this.kneadMeter.fillStyle(0xfff4df, 0.82);
    this.kneadMeter.fillRect(x, y + height - 5, progressWidth, 4);
  }

  hideKneadMeter() {
    if (!this.kneadMeter) {
      return;
    }

    this.kneadMeter.destroy();
    this.kneadMeter = null;
  }

  playKneadPulse(strokeKind) {
    if (this.kneadPulseTween) {
      this.kneadPulseTween.stop();
      this.kneadPulseTween = null;
    }

    const baseScaleX = this.scaleX || 1;
    const baseScaleY = this.scaleY || 1;
    const topping = this.getKneadTopping();
    const axis = this.getKneadStrokeAxis(strokeKind);
    const isHorizontal = axis === 'horizontal';

    this.setScale(
      baseScaleX * (isHorizontal ? 1.05 : 1.03),
      baseScaleY * (isHorizontal ? 0.97 : 0.94),
    );

    this.kneadPulseTween = this.scene.tweens.add({
      targets: this,
      scaleX: baseScaleX,
      scaleY: baseScaleY,
      duration: 120,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.kneadPulseTween = null;
      },
    });

    if (topping) {
      const property = isHorizontal ? 'x' : 'y';
      const offset = strokeKind === 'left' || strokeKind === 'up' ? -2 : 2;
      const original = topping[property];

      this.scene.tweens.add({
        targets: topping,
        [property]: original + offset,
        duration: 55,
        yoyo: true,
        ease: 'Sine.InOut',
      });
    }
  }

  playSpreadPulse(dx, dy) {
    if (this.spreadPulseTween) {
      this.spreadPulseTween.stop();
      this.spreadPulseTween = null;
    }

    const spreadIngredient = this.getSpreadIngredient();

    if (!spreadIngredient) {
      return;
    }

    const baseScale = this.spreadChildBaseScale ?? {
      scaleX: spreadIngredient.scaleX || 1,
      scaleY: spreadIngredient.scaleY || 1,
    };
    const progress = Phaser.Math.Clamp(this.spreadProgress, 0, 1);
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const spreadScale = this.spreadRequiresCoverage
      ? Phaser.Math.Linear(1, 0.24, progress)
      : null;
    const targetScaleX = this.spreadRequiresCoverage
      ? baseScale.scaleX * spreadScale
      : baseScale.scaleX * Phaser.Math.Linear(1, absX >= absY ? 2.25 : 1.75, progress);
    const targetScaleY = this.spreadRequiresCoverage
      ? baseScale.scaleY * spreadScale
      : baseScale.scaleY * Phaser.Math.Linear(1, absX >= absY ? 0.36 : 0.44, progress);
    const pulseScaleX = this.spreadRequiresCoverage ? 0.96 : 1.03;
    const pulseScaleY = this.spreadRequiresCoverage ? 0.96 : 0.96;

    spreadIngredient.setScale(targetScaleX * pulseScaleX, targetScaleY * pulseScaleY);
    spreadIngredient.setAlpha?.(Phaser.Math.Linear(1, this.spreadRequiresCoverage ? 0.38 : 0.72, progress));

    this.spreadPulseTween = this.scene.tweens.add({
      targets: spreadIngredient,
      scaleX: targetScaleX,
      scaleY: targetScaleY,
      x: Phaser.Math.Linear(spreadIngredient.x, 0, 0.35),
      y: Phaser.Math.Linear(spreadIngredient.y, 0, 0.35),
      duration: 120,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.spreadPulseTween = null;
        this.refreshCompositionShadow?.();
      },
    });
  }

  playFinishedStackPulse() {
    const baseScaleX = this.scaleX || 1;
    const baseScaleY = this.scaleY || 1;

    this.scene.tweens.add({
      targets: this,
      scaleX: baseScaleX * 1.08,
      scaleY: baseScaleY * 0.92,
      duration: 90,
      yoyo: true,
      ease: 'Sine.InOut',
      onComplete: () => {
        this.setScale(baseScaleX, baseScaleY);
      },
    });
  }

  shouldSuppressDragStart(pointer) {
    return this.isKneading
      || this.isSpreading
      || (this.canStartKneading() && this.isKneadStartPointer(pointer))
      || (this.canStartSpreading() && this.isSpreadStartPointer(pointer))
      || super.shouldSuppressDragStart(pointer);
  }

  handleDragStart(pointer) {
    if (
      this.isKneading
      || this.isSpreading
      || (this.canStartKneading() && this.isKneadStartPointer(pointer))
      || (this.canStartSpreading() && this.isSpreadStartPointer(pointer))
    ) {
      this.suppressedDragPointerId = this.getDragPointerId(pointer);
      this.isDragging = false;
      return false;
    }

    return super.handleDragStart(pointer);
  }

  handleDrag(pointer, dragX, dragY) {
    if (this.isKneading || this.isSpreading) {
      return false;
    }

    return super.handleDrag(pointer, dragX, dragY);
  }

  handleDragEnd(pointer) {
    if (this.isKneading || this.isSpreading) {
      return false;
    }

    return super.handleDragEnd(pointer);
  }

  handleStackLongPressDown(pointer) {
    if (
      this.stackLocked
      || this.isKneading
      || this.isSpreading
      || this.isKneadStartPointer(pointer)
      || this.isSpreadStartPointer(pointer)
    ) {
      return;
    }

    if (!this.getMostRecentRemovableStackChild()) {
      return;
    }

    this.cancelStackLongPress();
    this.longPressOrigin = { x: pointer.x, y: pointer.y };

    this.longPressPointerMoveHandler = (movePointer) => {
      if (!this.longPressOrigin) {
        return;
      }
      const dx = movePointer.x - this.longPressOrigin.x;
      const dy = movePointer.y - this.longPressOrigin.y;

      if (Math.sqrt(dx * dx + dy * dy) > this.longPressMoveTolerance) {
        this.cancelStackLongPress();
      }
    };

    this.scene.input.on('pointermove', this.longPressPointerMoveHandler);

    this.longPressTimer = this.scene.time.delayedCall(this.longPressDuration, () => {
      this.longPressTimer = null;
      this.fireStackLongPress();
    });
  }

  cancelStackLongPress() {
    if (this.longPressTimer) {
      this.longPressTimer.remove(false);
      this.longPressTimer = null;
    }

    if (this.longPressPointerMoveHandler) {
      this.scene.input.off('pointermove', this.longPressPointerMoveHandler);
      this.longPressPointerMoveHandler = null;
    }

    this.longPressOrigin = null;
  }

  fireStackLongPress() {
    this.cancelStackLongPress();

    const topping = this.getMostRecentRemovableStackChild();

    if (!topping?.detachFromStackParent) {
      return;
    }

    const pointer = this.scene.input.activePointer;

    this.suppressedDragPointerId = this.getDragPointerId(pointer);
    this.abortInProgressDrag();

    topping.detachFromStackParent();
    topping.beginManualDrag?.(pointer);
  }

  getMostRecentRemovableStackChild() {
    for (let index = (this.stackChildren?.length ?? 0) - 1; index >= 0; index -= 1) {
      const child = this.stackChildren[index];
      const nestedChild = child?.getMostRecentRemovableStackChild?.();

      if (nestedChild) {
        return nestedChild;
      }

      if (!child?.stackLocked && child?.detachFromStackParent) {
        return child;
      }
    }

    return null;
  }

  abortInProgressDrag() {
    if (!this.isDragging) {
      releaseActiveDrag(this);
      return;
    }

    const snapBackX = this.lastValidX;
    const snapBackY = this.lastValidY;

    this.isDragging = false;
    releaseActiveDrag(this);
    this.stopDragPositionUpdates();
    this.clearStackHoverHighlight?.();
    this.tweenDragLift(0, this.dropLiftDuration, 'Quad.easeIn', () => {
      if (!this.isDragging) {
        this.applyRestingDepth();
        this.refreshOtherRestingDepths();
      }
    });

    if (Number.isFinite(snapBackX) && Number.isFinite(snapBackY)
      && (snapBackX !== this.x || snapBackY !== this.y)) {
      this.snapBackTo(snapBackX, snapBackY);
    }
  }

  setStackHighlight(active) {
    if (this.stackHighlightActive === active) {
      return;
    }

    this.stackHighlightActive = active;

    if (active) {
      this.showStackHighlightOverlay();
    } else {
      this.stackHighlightOverlay?.setVisible(false);
    }
  }

  showStackHighlightOverlay() {
    if (!this.stackHighlightOverlay) {
      this.stackHighlightOverlay = this.scene.add.graphics();
      this.stackHighlightOverlay.excludeFromCompositionShadow = true;
      this.add(this.stackHighlightOverlay);
    }

    const bounds = this.getLocalVisualBounds();
    const padding = 3;
    const x = bounds.x - padding;
    const y = bounds.y - padding;
    const width = bounds.width + padding * 2;
    const height = bounds.height + padding * 2;

    this.stackHighlightOverlay.clear();
    this.stackHighlightOverlay.fillStyle(0xfff2a8, 0.08);
    this.stackHighlightOverlay.fillRect(x, y, width, height);
    this.stackHighlightOverlay.lineStyle(3, 0xfff2a8, 0.55);
    this.stackHighlightOverlay.strokeRect(x, y, width, height);
    this.stackHighlightOverlay.setVisible(true);
  }

  accepts(other, placement = {}) {
    if (!this.acceptedStackCategories || !other?.stackCategory) {
      return false;
    }

    if (this.stackChildren.length >= this.maxStackedItems) {
      return false;
    }

    if (other.stackParent === this) {
      return true;
    }

    return this.acceptedStackCategories.includes(other.stackCategory)
      && this.acceptsStackPlacement(other, placement);
  }

  getStackRejectionReason(other, placement = {}) {
    if (!other?.stackCategory) {
      return 'source has no stack category';
    }

    if (!this.acceptedStackCategories) {
      return 'target accepts no stacks';
    }

    if (!this.acceptedStackCategories.includes(other.stackCategory)) {
      return `category ${other.stackCategory} not accepted`;
    }

    if (this.stackChildren.length >= this.maxStackedItems && other.stackParent !== this) {
      return 'target stack full';
    }

    if (!this.acceptsStackPlacement(other, placement)) {
      return this.getStackPlacementRejectionReason?.(other, placement) ?? 'placement rejected';
    }

    return 'stack OK';
  }

  acceptsStackPlacement(_other, _placement = {}) {
    return true;
  }

  getWorldHitboxRect(centerX = this.x, centerY = this.y) {
    return this.getWorldShadowRectAt(centerX, centerY) ?? super.getWorldHitboxRect(centerX, centerY);
  }

  canStackOn(other, placement = {}) {
    return Boolean(this.stackCategory) && Boolean(other?.accepts?.(this, placement));
  }

  attachToStackTarget(target) {
    if (!target || this.stackParent === target) {
      return false;
    }

    if (this.stackParent) {
      this.detachFromStackParent();
    }

    const dropPoint = this.getPlacementPointAt?.(this.x, this.y) ?? { x: this.x, y: this.y };
    const dropOffset = target.getStackPlacementOffset?.(this, dropPoint);
    const offsetX = dropOffset?.x ?? target.stackOffsetX ?? 0;
    const offsetY = dropOffset?.y ?? target.stackOffsetY ?? 0;
    const preservedWorldRotation = target.preserveStackChildRotation ? (this.rotation ?? 0) : 0;

    target.add(this);
    this.setPosition(offsetX, offsetY);
    this.setRotation(target.preserveStackChildRotation
      ? preservedWorldRotation - (target.rotation ?? 0)
      : 0);
    this.refreshRotatedGeometry?.();

    this.hoistShadowInto(target, offsetX, offsetY);

    if (this.input) {
      this.disableInteractive();
    }

    this.stackParent = target;
    target.stackChildren.push(this);
    target.handleStackChildAttached?.(this, { x: offsetX, y: offsetY });

    if (this.stackParent === target) {
      target.playDropImpact?.();
    }

    return true;
  }

  hoistShadowInto(target, offsetX, offsetY) {
    if (!this.shadow || !target) {
      return;
    }

    this.unhoistShadowFromStack();

    this.stackShadowHoist = {
      target,
      compositionOffsetX: this.shadow.compositionOffsetX ?? 0,
      compositionOffsetY: this.shadow.compositionOffsetY ?? 0,
    };

    this.remove(this.shadow);
    this.shadow.compositionOffsetX = this.stackShadowHoist.compositionOffsetX + offsetX;
    this.shadow.compositionOffsetY = this.stackShadowHoist.compositionOffsetY + offsetY;
    this.shadow.setVisible(true);
    target.addAt(this.shadow, 0);
    this.setDragLift(this.currentLift);
  }

  unhoistShadowFromStack() {
    if (!this.stackShadowHoist || !this.shadow) {
      this.stackShadowHoist = null;
      return;
    }

    const { target, compositionOffsetX, compositionOffsetY } = this.stackShadowHoist;

    target?.remove(this.shadow);
    this.shadow.compositionOffsetX = compositionOffsetX;
    this.shadow.compositionOffsetY = compositionOffsetY;
    this.addAt(this.shadow, 0);
    this.stackShadowHoist = null;
    this.setDragLift(this.currentLift);
  }

  setDragLift(lift) {
    super.setDragLift(lift);

    this.stackChildren?.forEach((child) => {
      child.setDragLift?.(lift);
    });

    if (this.stackDragShadowNeedsRefresh) {
      this.refreshStackDragShadow?.();
      super.setDragLift(lift);
    }
  }

  detachFromStackParent() {
    const parent = this.stackParent;

    if (!parent) {
      return false;
    }

    if (parent.stackLocked) {
      return false;
    }

    const worldPoint = new Phaser.Math.Vector2();
    parent.getWorldTransformMatrix().transformPoint(this.x, this.y, worldPoint);
    const worldRotation = (parent.rotation ?? 0) + (this.rotation ?? 0);

    this.unhoistShadowFromStack();
    parent.remove(this);
    this.scene.add.existing(this);

    this.setPosition(worldPoint.x, worldPoint.y);
    this.setRotation(worldRotation);
    this.refreshRotatedGeometry?.();

    if (this.shadow) {
      this.shadow.setVisible(true);
    }

    this.setInteractive(this.hitbox, Phaser.Geom.Rectangle.Contains);
    this.scene.input.setDraggable(this);

    const index = parent.stackChildren.indexOf(this);
    if (index !== -1) {
      parent.stackChildren.splice(index, 1);
      parent.handleStackChildDetached?.(this);
    }

    this.stackParent = null;
    this.applyRestingDepth();

    return true;
  }

  getFootprint() {
    if (this.stackParent) {
      return new Phaser.Geom.Rectangle(this.x, this.y, 0, 0);
    }

    return super.getFootprint();
  }

  destroy(fromScene) {
    this.finishKneading();
    this.finishSpreading();

    if (this.kneadPulseTween) {
      this.kneadPulseTween.stop();
      this.kneadPulseTween = null;
    }

    if (this.spreadPulseTween) {
      this.spreadPulseTween.stop();
      this.spreadPulseTween = null;
    }

    this.cancelStackLongPress();

    if (this.stackParent) {
      const parent = this.stackParent;
      const index = parent.stackChildren.indexOf(this);

      if (index !== -1) {
        parent.stackChildren.splice(index, 1);
      }

      this.stackParent = null;
    }

    this.clearComputedShadeParts();
    super.destroy(fromScene);
  }
}
