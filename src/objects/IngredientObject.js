import * as Phaser from 'phaser/dist/phaser.esm.js';
import { RotatableObject } from './RotatableObject.js';
import { holdSharedTexture, releaseSharedTexture } from './DraggableObject.js';

let computedShadeTextureId = 0;

export class IngredientObject extends RotatableObject {
  constructor(scene, x, y, width, height) {
    super(scene, x, y, width, height);

    this.isIngredient = true;
    this.softness = 0.9;
    this.restShadowOffset = 6;
    this.dragShadowOffset = 6;
    this.stackCategory = null;
    this.acceptedStackCategories = null;
    this.maxStackedItems = 1;
    this.stackOffsetX = 0;
    this.stackOffsetY = 0;
    this.stackChildren = [];
    this.stackParent = null;
    this.longPressDuration = 400;
    this.longPressMoveTolerance = 6;
    this.longPressTimer = null;
    this.longPressOrigin = null;
    this.longPressPointerMoveHandler = null;

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
  }

  addDraggablePart(part) {
    const addedPart = super.addDraggablePart(part);

    if (!part.excludeFromComputedShade) {
      this.addComputedShadePart(addedPart);
    }

    return addedPart;
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

      if (lower !== undefined) {
        nearestLower = { value: lower, distance: offset };
      }

      if (upper !== undefined) {
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

  handleStackLongPressDown(pointer) {
    if (!this.stackChildren?.length) {
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

    const topping = this.stackChildren[this.stackChildren.length - 1];

    if (!topping?.detachFromStackParent) {
      return;
    }

    const pointer = this.scene.input.activePointer;

    this.suppressedDragPointerId = this.getDragPointerId(pointer);

    topping.detachFromStackParent();
    topping.beginManualDrag?.(pointer);
  }

  setStackHighlight(active) {
    if (this.stackHighlightActive === active) {
      return;
    }

    this.stackHighlightActive = active;

    const tint = 0xfff2a8;

    this.draggableParts.forEach((part) => {
      if (part.excludeFromCompositionShadow || !part.setTint) {
        return;
      }

      if (active) {
        part.setTint(tint);
      } else {
        part.clearTint();
      }
    });
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

  acceptsStackPlacement(_other, _placement = {}) {
    return true;
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

    const offsetX = target.stackOffsetX ?? 0;
    const offsetY = target.stackOffsetY ?? 0;

    target.add(this);
    this.setPosition(offsetX, offsetY);
    this.setRotation(0);
    this.refreshRotatedGeometry?.();

    this.hoistShadowInto(target, offsetX, offsetY);

    if (this.input) {
      this.disableInteractive();
    }

    this.stackParent = target;
    target.stackChildren.push(this);

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
