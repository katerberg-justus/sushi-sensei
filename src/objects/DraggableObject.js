import * as Phaser from 'phaser/dist/phaser.esm.js';
import { SceneObject } from './SceneObject.js';
import { getCachedFullImageData, sliceCachedImageData } from './ProceduralTexture.js';

let shadowTextureId = 0;

const draggableRegistry = new Set();
const shadowImageDataCache = new WeakMap();
const shadowTextureCache = new Map();
const SHADOW_TEXTURE_CACHE_MAX = 200;

const sharedTextureRefs = new Map();

export function holdSharedTexture(key) {
  if (!key) {
    return;
  }

  if (sharedTextureRefs.has(key)) {
    sharedTextureRefs.set(key, sharedTextureRefs.get(key) + 1);
  } else {
    sharedTextureRefs.set(key, 2);
  }
}

export function releaseSharedTexture(scene, key) {
  if (!key) {
    return;
  }

  const count = sharedTextureRefs.get(key);

  if (count !== undefined) {
    if (count > 1) {
      sharedTextureRefs.set(key, count - 1);
      return;
    }

    sharedTextureRefs.delete(key);
  }

  if (scene?.textures?.exists(key)) {
    scene.textures.remove(key);
  }
}

export class DraggableObject extends SceneObject {
  constructor(scene, x, y, width, height) {
    super(scene, x, y);

    draggableRegistry.add(this);
    this.lastValidX = x;
    this.lastValidY = y;
    this.snapBackTween = null;
    this.snapBackDuration = 180;
    this.isDragging = false;
    this.dragDepth = 100;
    this.restDepth = 10;
    this.dragLift = 10;
    this.dragLiftDuration = 120;
    this.dropLiftDuration = 90;
    this.softness = 0.35;
    this.dropImpactDuration = 110;
    this.currentLift = 0;
    this.currentImpactProgress = 1;
    this.currentImpactScaleX = 1;
    this.currentImpactScaleY = 1;
    this.currentImpactSink = 0;
    this.dragLiftTween = null;
    this.dropImpactTween = null;
    this.suppressedDragPointerId = null;
    this.dragAnchorX = x;
    this.dragAnchorY = y;
    this.dragFollowSmoothing = 0.18;
    this.dragSnapDistance = 0.75;
    this.dragUpdateHandler = null;
    this.dragShadowOffset = 6;
    this.restShadowOffset = 6;
    this.dragShadowAlpha = 0.72;
    this.restShadowAlpha = 0;
    this.shadowEdgeAlpha = 0.22;
    this.shadowCoreAlpha = 0.3;
    this.shadowEdgeScaleX = 0.86;
    this.shadowEdgeScaleY = 0.34;
    this.shadowEdgeDragScaleX = 0.98;
    this.shadowEdgeDragScaleY = 0.44;
    this.shadowCoreScaleX = 0.84;
    this.shadowCoreScaleY = 0.32;
    this.draggableParts = [];
    this.draggablePartBaseScales = new Map();
    this.draggablePartBasePositions = new Map();
    this.shadow = null;
    this.stackDragShadow = null;
    this.stackDragShadowNeedsRefresh = false;
    this.stackDragShadowOriginalShadow = null;
    this.footprintDepthFactor = 0.34;
    this.hitbox = new Phaser.Geom.Rectangle(0, 0, width, height);

    this.setSize(width, height);
    this.setCenteredHitbox(width, height);
    this.input.cursor = 'grab';
    scene.input.setDraggable(this);
    scene.input.dragDistanceThreshold = Math.max(
      scene.input.dragDistanceThreshold ?? 0,
      4,
    );

    this.on('dragstart', this.handleDragStart, this);
    this.on('drag', this.handleDrag, this);
    this.on('dragend', this.handleDragEnd, this);

    this.applyRestingDepth();
  }

  setCenteredHitbox(width, height, offsetX = 0, offsetY = 0) {
    const originX = this.displayOriginX ?? 0;
    const originY = this.displayOriginY ?? 0;

    this.hitbox = new Phaser.Geom.Rectangle(
      originX + offsetX - width / 2,
      originY + offsetY - height / 2,
      width,
      height,
    );

    if (this.input) {
      this.input.hitArea = this.hitbox;
      this.input.hitAreaCallback = Phaser.Geom.Rectangle.Contains;
      this.input.customHitArea = true;
    } else {
      this.setInteractive(this.hitbox, Phaser.Geom.Rectangle.Contains);
    }

    return this;
  }

  addDraggablePart(part) {
    this.draggableParts.push(part);
    this.draggablePartBaseScales.set(part, {
      scaleX: part.scaleX,
      scaleY: part.scaleY,
    });
    this.draggablePartBasePositions.set(part, {
      x: part.x,
      y: part.y,
    });
    this.add(part);

    return part;
  }

  removeDraggablePart(part) {
    const index = this.draggableParts.indexOf(part);

    if (index !== -1) {
      this.draggableParts.splice(index, 1);
    }

    this.draggablePartBaseScales.delete(part);
    this.draggablePartBasePositions.delete(part);
    this.remove(part);

    return part;
  }

  setPixelShadow(shadow) {
    if (this.shadow) {
      this.destroyPixelShadow(this.shadow);
    }

    this.shadow = shadow;
    this.shadow.compositionOffsetX ??= 0;
    this.shadow.compositionOffsetY ??= 0;
    this.shadow.setDepth(-1);
    this.shadow.setAlpha(this.restShadowAlpha);
    this.syncPixelShadowRotation();
    this.setShadowScreenOffset(this.restShadowOffset);
    this.addAt(this.shadow, 0);

    return shadow;
  }

  destroyPixelShadow(shadow) {
    const textureKeys = shadow?.generatedTextureKeys ?? [];

    shadow.destroy();

    textureKeys.forEach((key) => {
      releaseSharedTexture(this.scene, key);
    });
  }

  refreshCompositionShadow() {
    if (!this.draggableParts.length) {
      return null;
    }

    if (this.deferCompositionShadowRefresh) {
      return null;
    }

    if (this.isDragging) {
      return this.regenerateCompositionShadow();
    }

    this.scheduleCompositionShadowRefresh();
    return null;
  }

  borrowCompositionShadowFrom(parent) {
    if (!parent?.shadow?.generatedTextureKeys?.length || !this.scene) {
      return null;
    }

    const [edgeKey, coreKey] = parent.shadow.generatedTextureKeys;

    if (!edgeKey || !coreKey
      || !this.scene.textures.exists(edgeKey)
      || !this.scene.textures.exists(coreKey)) {
      return null;
    }

    const bounds = this.getDraggablePartsShadowBounds
      ? this.getDraggablePartsShadowBounds()
      : this.getDraggablePartsBounds();
    const width = Math.max(4, bounds.right - bounds.left);
    const height = Math.max(4, bounds.bottom - bounds.top);
    const centerX = bounds.left + width / 2;
    const centerY = bounds.top + height / 2;

    holdSharedTexture(edgeKey);
    holdSharedTexture(coreKey);

    const edge = this.scene.add.image(0, 0, edgeKey);

    edge.setOrigin(0.5);
    edge.setTint(0x9a8064);

    const core = this.scene.add.image(0, 0, coreKey);

    core.setOrigin(0.5);
    core.setTint(0x6f5d48);

    const shadow = this.scene.add.container(0, 0, [edge, core]);

    shadow.generatedTextureKeys = [edgeKey, coreKey];
    shadow.compositionOffsetX = bounds.localCenterX ?? centerX;
    shadow.compositionOffsetY = bounds.localCenterY ?? centerY;
    shadow.isCompositionShadow = true;
    shadow.keepWorldRotation = true;
    shadow.isBorrowedShadow = true;

    shadow.setPixelBlurProgress = (progress) => {
      const liftProgress = Phaser.Math.Clamp(progress, 0, 1);

      edge.setAlpha(Phaser.Math.Linear(0, this.shadowEdgeAlpha, liftProgress));
      core.setAlpha(Phaser.Math.Linear(0, this.shadowCoreAlpha, liftProgress));
      edge.setScale(
        Phaser.Math.Linear(1, this.shadowEdgeDragScaleX / this.shadowEdgeScaleX, liftProgress),
        Phaser.Math.Linear(1, this.shadowEdgeDragScaleY / this.shadowEdgeScaleY, liftProgress),
      );
      core.setScale(
        Phaser.Math.Linear(1, this.shadowEdgeDragScaleX / this.shadowEdgeScaleX, liftProgress),
        Phaser.Math.Linear(1, this.shadowEdgeDragScaleY / this.shadowEdgeScaleY, liftProgress),
      );
    };
    shadow.setPixelBlurProgress(0);

    return this.setPixelShadow(shadow);
  }

  scheduleCompositionShadowRefresh() {
    if (this.pendingShadowRefresh || !this.scene) {
      return;
    }

    this.pendingShadowRefresh = this.scene.time.delayedCall(0, () => {
      this.pendingShadowRefresh = null;
      if (this.scene) {
        this.regenerateCompositionShadow();
      }
    });
  }

  ensureCompositionShadowReady() {
    if (!this.pendingShadowRefresh) {
      return;
    }

    this.pendingShadowRefresh.remove(false);
    this.pendingShadowRefresh = null;
    this.regenerateCompositionShadow();
  }

  regenerateCompositionShadow() {
    if (!this.draggableParts.length || !this.scene) {
      return null;
    }

    const parts = this.getCompositionShadowParts();
    const bounds = this.getDraggablePartsShadowBounds(parts);
    const shadow = this.createShadowFromBounds(bounds, parts);
    shadow.isCompositionShadow = true;
    shadow.keepWorldRotation = true;

    return this.setPixelShadow(shadow);
  }

  getDraggablePartsBounds(parts = this.getCompositionShadowParts()) {
    return parts.reduce((bounds, part) => {
      if (part.excludeFromCompositionShadow) {
        return bounds;
      }

      const width = part.compositionWidth ?? part.displayWidth;
      const height = part.compositionHeight ?? part.displayHeight;
      const centerX = part.x + (part.compositionOffsetX ?? 0);
      const centerY = part.y + (part.compositionOffsetY ?? 0);
      const left = centerX - width / 2;
      const right = left + width;
      const top = centerY - height / 2;
      const bottom = top + height;

      return {
        left: Math.min(bounds.left, left),
        right: Math.max(bounds.right, right),
        top: Math.min(bounds.top, top),
        bottom: Math.max(bounds.bottom, bottom),
      };
    }, {
      left: Infinity,
      right: -Infinity,
      top: Infinity,
      bottom: -Infinity,
    });
  }

  createShadowFromBounds(bounds, parts = this.getCompositionShadowParts()) {
    const sampledShadow = this.createShadowFromPartPixels(bounds, parts);

    if (sampledShadow) {
      return sampledShadow;
    }

    const width = Math.max(4, bounds.right - bounds.left);
    const height = Math.max(4, bounds.bottom - bounds.top);
    const centerX = bounds.left + width / 2;
    const centerY = bounds.top + height / 2;
    const edge = this.scene.add.graphics();
    const core = this.scene.add.graphics();

    edge.fillStyle(0x9a8064, 1);
    edge.fillEllipse(0, 0, width * this.shadowEdgeScaleX, height * this.shadowEdgeScaleY);

    core.fillStyle(0x6f5d48, 1);
    core.fillEllipse(0, 0, width * this.shadowCoreScaleX, height * this.shadowCoreScaleY);

    const shadow = this.scene.add.container(0, 0, [edge, core]);

    shadow.compositionOffsetX = bounds.localCenterX ?? centerX;
    shadow.compositionOffsetY = bounds.localCenterY ?? centerY;

    shadow.setPixelBlurProgress = (progress) => {
      const liftProgress = Phaser.Math.Clamp(progress, 0, 1);

      edge.setAlpha(Phaser.Math.Linear(0, this.shadowEdgeAlpha, liftProgress));
      core.setAlpha(Phaser.Math.Linear(0, this.shadowCoreAlpha, liftProgress));
      edge.setScale(
        Phaser.Math.Linear(1, this.shadowEdgeDragScaleX / this.shadowEdgeScaleX, liftProgress),
        Phaser.Math.Linear(1, this.shadowEdgeDragScaleY / this.shadowEdgeScaleY, liftProgress),
      );
      core.setScale(
        Phaser.Math.Linear(1, this.shadowEdgeDragScaleX / this.shadowEdgeScaleX, liftProgress),
        Phaser.Math.Linear(1, this.shadowEdgeDragScaleY / this.shadowEdgeScaleY, liftProgress),
      );
    };
    shadow.setPixelBlurProgress(0);

    return shadow;
  }

  createShadowFromPartPixels(bounds, parts = this.getCompositionShadowParts()) {
    const width = Math.max(4, bounds.right - bounds.left);
    const height = Math.max(4, bounds.bottom - bounds.top);
    const centerX = bounds.left + width / 2;
    const centerY = bounds.top + height / 2;
    const [edgeTextureKey, coreTextureKey] = this.createShadowTexturesFromParts(bounds, parts);

    if (!edgeTextureKey || !coreTextureKey) {
      [edgeTextureKey, coreTextureKey].forEach((key) => {
        if (key && this.scene.textures.exists(key)) {
          this.scene.textures.remove(key);
        }
      });

      return null;
    }

    const edge = this.scene.add.image(0, 0, edgeTextureKey);
    edge.setOrigin(0.5);
    edge.setTint(0x9a8064);

    const core = this.scene.add.image(0, 0, coreTextureKey);
    core.setOrigin(0.5);
    core.setTint(0x6f5d48);

    const shadow = this.scene.add.container(0, 0, [edge, core]);

    shadow.generatedTextureKeys = [edgeTextureKey, coreTextureKey];
    shadow.compositionOffsetX = bounds.localCenterX ?? centerX;
    shadow.compositionOffsetY = bounds.localCenterY ?? centerY;

    shadow.setPixelBlurProgress = (progress) => {
      const liftProgress = Phaser.Math.Clamp(progress, 0, 1);

      edge.setAlpha(Phaser.Math.Linear(0, this.shadowEdgeAlpha, liftProgress));
      core.setAlpha(Phaser.Math.Linear(0, this.shadowCoreAlpha, liftProgress));
      edge.setScale(
        Phaser.Math.Linear(1, this.shadowEdgeDragScaleX / this.shadowEdgeScaleX, liftProgress),
        Phaser.Math.Linear(1, this.shadowEdgeDragScaleY / this.shadowEdgeScaleY, liftProgress),
      );
      core.setScale(
        Phaser.Math.Linear(1, this.shadowEdgeDragScaleX / this.shadowEdgeScaleX, liftProgress),
        Phaser.Math.Linear(1, this.shadowEdgeDragScaleY / this.shadowEdgeScaleY, liftProgress),
      );
    };
    shadow.setPixelBlurProgress(0);

    return shadow;
  }

  createShadowTexturesFromParts(bounds, parts = this.getCompositionShadowParts()) {
    const cacheKey = this.getShadowCacheKey(bounds, parts);

    if (cacheKey) {
      const cached = shadowTextureCache.get(cacheKey);

      if (cached) {
        shadowTextureCache.delete(cacheKey);
        shadowTextureCache.set(cacheKey, cached);
        const keys = this.createShadowTexturesFromCachedPixels(cached);

        if (keys) {
          return keys;
        }
      }
    }

    const width = Math.max(4, bounds.right - bounds.left);
    const height = Math.max(4, bounds.bottom - bounds.top);
    const centerX = bounds.left + width / 2;
    const centerY = bounds.top + height / 2;
    const padding = 4;
    const layers = [
      { scaleX: this.shadowEdgeScaleX, scaleY: this.shadowEdgeScaleY },
      { scaleX: this.shadowCoreScaleX, scaleY: this.shadowCoreScaleY },
    ];

    const created = layers.map((layer) => {
      const textureWidth = Math.max(4, Math.ceil(width * layer.scaleX) + padding * 2);
      const textureHeight = Math.max(4, Math.ceil(height * layer.scaleY) + padding * 2);
      const key = `computed-shadow-${shadowTextureId}`;
      const texture = this.scene.textures.createCanvas(key, textureWidth, textureHeight);

      shadowTextureId += 1;

      if (!texture) {
        return null;
      }

      const context = texture.getContext();

      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, textureWidth, textureHeight);
      context.fillStyle = '#ffffff';

      return { key, texture, context, textureWidth, textureHeight, ...layer };
    });

    if (created.some((entry) => !entry)) {
      created.forEach((entry) => {
        if (entry && this.scene.textures.exists(entry.key)) {
          this.scene.textures.remove(entry.key);
        }
      });
      return [null, null];
    }

    let drewPixels = false;

    parts.forEach((part) => {
      if (part.excludeFromCompositionShadow) {
        return;
      }

      drewPixels = this.paintPartShadowPixels(
        created,
        part,
        centerX,
        centerY,
        bounds,
      ) || drewPixels;
    });

    if (!drewPixels) {
      created.forEach((entry) => this.scene.textures.remove(entry.key));
      return [null, null];
    }

    created.forEach((entry) => entry.texture.refresh());

    if (cacheKey) {
      const snapshot = created.map((entry) => ({
        imageData: entry.context.getImageData(0, 0, entry.textureWidth, entry.textureHeight),
        width: entry.textureWidth,
        height: entry.textureHeight,
      }));

      shadowTextureCache.set(cacheKey, snapshot);

      while (shadowTextureCache.size > SHADOW_TEXTURE_CACHE_MAX) {
        const oldest = shadowTextureCache.keys().next().value;
        shadowTextureCache.delete(oldest);
      }
    }

    return created.map((entry) => entry.key);
  }

  createShadowTexturesFromCachedPixels(cached) {
    const keys = [];

    for (const entry of cached) {
      const key = `computed-shadow-${shadowTextureId}`;
      shadowTextureId += 1;
      const texture = this.scene.textures.createCanvas(key, entry.width, entry.height);

      if (!texture) {
        keys.forEach((existing) => this.scene.textures.remove(existing));
        return null;
      }

      const context = texture.getContext();
      context.putImageData(entry.imageData, 0, 0);
      texture.refresh();
      keys.push(key);
    }

    return keys;
  }

  getShadowCacheKey(bounds, parts = this.getCompositionShadowParts()) {
    const partSignatures = [];

    for (const part of parts) {
      if (part.excludeFromCompositionShadow) {
        continue;
      }

      const signature = this.getPartShadowCacheSignature(part);

      if (!signature) {
        return null;
      }

      partSignatures.push(signature);
    }

    if (!partSignatures.length) {
      return null;
    }

    const projection = `${Math.round((bounds.projectionSin ?? 0) * 1000)},${Math.round((bounds.projectionCos ?? 1) * 1000)}`;
    const dims = `${Math.round(bounds.left)},${Math.round(bounds.top)},${Math.round(bounds.right)},${Math.round(bounds.bottom)}`;
    const layers = `${this.shadowEdgeScaleX},${this.shadowEdgeScaleY},${this.shadowCoreScaleX},${this.shadowCoreScaleY}`;

    return `${partSignatures.join('|')}::${projection}::${dims}::${layers}`;
  }

  getPartShadowCacheSignature(part) {
    const frame = part.frame;

    if (!frame) {
      return null;
    }

    const textureKey = part.texture?.key ?? '';
    const frameName = frame.name ?? '';
    const crop = part.isCropped && part._crop
      ? `${part._crop.cx},${part._crop.cy},${part._crop.cw},${part._crop.ch},${part._crop.x ?? 0},${part._crop.y ?? 0}`
      : `${frame.cutX ?? 0},${frame.cutY ?? 0},${frame.cutWidth ?? frame.realWidth},${frame.cutHeight ?? frame.realHeight},0,0`;

    return [
      textureKey,
      frameName,
      crop,
      Math.round((part.scaleX ?? 1) * 1000),
      Math.round((part.scaleY ?? 1) * 1000),
      Math.round((part.rotation ?? 0) * 1000),
      Math.round((part.x ?? 0) * 10),
      Math.round((part.y ?? 0) * 10),
      Math.round((part.originX ?? 0.5) * 1000),
      Math.round((part.originY ?? 0.5) * 1000),
    ].join(',');
  }

  paintPartShadowPixels(
    layers,
    part,
    centerX,
    centerY,
    bounds = null,
  ) {
    const sourceData = this.getPartShadowSourceData(part);

    if (!sourceData) {
      return false;
    }

    const {
      imageData,
      sourceWidth,
      sourceHeight,
      cropX,
      cropY,
      frameWidth,
      frameHeight,
    } = sourceData;
    const data = imageData.data;
    const scaleX = part.scaleX ?? 1;
    const scaleY = part.scaleY ?? 1;
    const rotation = part.rotation ?? 0;
    const originX = part.originX ?? 0.5;
    const originY = part.originY ?? 0.5;
    const sin = Math.sin(rotation);
    const cos = Math.cos(rotation);
    const projectionSin = bounds?.projectionSin ?? 0;
    const projectionCos = bounds?.projectionCos ?? 1;
    const partX = part.x;
    const partY = part.y;
    const frameOffsetX = frameWidth * originX;
    const frameOffsetY = frameHeight * originY;
    const layerParams = layers.map((layer) => ({
      context: layer.context,
      halfWidth: layer.textureWidth / 2,
      halfHeight: layer.textureHeight / 2,
      shadowScaleX: layer.scaleX,
      shadowScaleY: layer.scaleY,
      pixelWidth: Math.max(1, Math.ceil(Math.abs(scaleX * layer.scaleX))),
      pixelHeight: Math.max(1, Math.ceil(Math.abs(scaleY * layer.scaleY))),
    }));
    let drewPixels = false;

    for (let y = 0; y < sourceHeight; y += 1) {
      const rowBase = y * sourceWidth;
      const localTextureY = cropY + y + 0.5 - frameOffsetY;
      const localPartYBase = localTextureY * scaleY;

      for (let x = 0; x < sourceWidth; x += 1) {
        if (data[(rowBase + x) * 4 + 3] === 0) {
          continue;
        }

        const localTextureX = cropX + x + 0.5 - frameOffsetX;
        const localPartX = localTextureX * scaleX;
        const worldPartX = partX + localPartX * cos - localPartYBase * sin;
        const worldPartY = partY + localPartX * sin + localPartYBase * cos;
        const projectedX = worldPartX * projectionCos - worldPartY * projectionSin;
        const projectedY = worldPartX * projectionSin + worldPartY * projectionCos;
        const offsetX = projectedX - centerX;
        const offsetY = projectedY - centerY;

        for (let i = 0; i < layerParams.length; i += 1) {
          const layer = layerParams[i];
          const shadowX = Math.round(layer.halfWidth + offsetX * layer.shadowScaleX - layer.pixelWidth / 2);
          const shadowY = Math.round(layer.halfHeight + offsetY * layer.shadowScaleY - layer.pixelHeight / 2);

          layer.context.fillRect(shadowX, shadowY, layer.pixelWidth, layer.pixelHeight);
        }
        drewPixels = true;
      }
    }

    return drewPixels;
  }

  getPartShadowSourceData(part) {
    const frame = part.frame;
    const source = this.getCanvasSourceForTexture(part.texture);

    if (!frame || !source) {
      return null;
    }

    const crop = part.isCropped && part._crop
      ? part._crop
      : {
          x: 0,
          y: 0,
          cx: frame.cutX ?? 0,
          cy: frame.cutY ?? 0,
          cw: frame.cutWidth ?? frame.realWidth,
          ch: frame.cutHeight ?? frame.realHeight,
        };
    const sourceWidth = Math.floor(crop.cw);
    const sourceHeight = Math.floor(crop.ch);

    if (sourceWidth <= 0 || sourceHeight <= 0) {
      return null;
    }

    let sourceCache = shadowImageDataCache.get(source);

    if (!sourceCache) {
      sourceCache = new Map();
      shadowImageDataCache.set(source, sourceCache);
    }

    const cacheKey = `${crop.cx},${crop.cy},${sourceWidth},${sourceHeight}`;
    let imageData = sourceCache.get(cacheKey);

    if (!imageData) {
      const fullImageData = getCachedFullImageData(source);

      if (fullImageData
        && crop.cx + sourceWidth <= fullImageData.width
        && crop.cy + sourceHeight <= fullImageData.height) {
        imageData = sliceCachedImageData(fullImageData, crop.cx, crop.cy, sourceWidth, sourceHeight);
      } else {
        const context = source.getContext('2d', { willReadFrequently: true });

        if (!context) {
          return null;
        }

        imageData = context.getImageData(crop.cx, crop.cy, sourceWidth, sourceHeight);
      }

      sourceCache.set(cacheKey, imageData);
    }

    return {
      imageData,
      part,
      sourceWidth,
      sourceHeight,
      cropX: crop.x ?? 0,
      cropY: crop.y ?? 0,
      frameWidth: frame.realWidth ?? sourceWidth,
      frameHeight: frame.realHeight ?? sourceHeight,
    };
  }

  getDraggablePartsShadowBounds(parts = this.getCompositionShadowParts()) {
    const rotation = this.rotation ?? 0;
    const projectionSin = Math.sin(rotation);
    const projectionCos = Math.cos(rotation);
    const bounds = parts.reduce((currentBounds, part) => {
      if (part.excludeFromCompositionShadow) {
        return currentBounds;
      }

      this.getPartCompositionCorners(part).forEach((point) => {
        const projectedX = point.x * projectionCos - point.y * projectionSin;
        const projectedY = point.x * projectionSin + point.y * projectionCos;

        currentBounds.left = Math.min(currentBounds.left, projectedX);
        currentBounds.right = Math.max(currentBounds.right, projectedX);
        currentBounds.top = Math.min(currentBounds.top, projectedY);
        currentBounds.bottom = Math.max(currentBounds.bottom, projectedY);
      });

      return currentBounds;
    }, {
      left: Infinity,
      right: -Infinity,
      top: Infinity,
      bottom: -Infinity,
    });

    if (!Number.isFinite(bounds.left) || !Number.isFinite(bounds.right)
      || !Number.isFinite(bounds.top) || !Number.isFinite(bounds.bottom)) {
      return this.getDraggablePartsBounds(parts);
    }

    const centerX = bounds.left + (bounds.right - bounds.left) / 2;
    const shadowHeight = (bounds.bottom - bounds.top) * this.shadowEdgeScaleY;
    const anchorY = bounds.bottom - shadowHeight / 2;

    bounds.localCenterX = centerX * projectionCos + anchorY * projectionSin;
    bounds.localCenterY = -centerX * projectionSin + anchorY * projectionCos;
    bounds.projectionSin = projectionSin;
    bounds.projectionCos = projectionCos;

    return bounds;
  }

  getPartCompositionCorners(part) {
    const width = part.compositionWidth ?? part.displayWidth;
    const height = part.compositionHeight ?? part.displayHeight;
    const centerX = part.x + (part.compositionOffsetX ?? 0);
    const centerY = part.y + (part.compositionOffsetY ?? 0);
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const rotation = part.rotation ?? 0;
    const sin = Math.sin(rotation);
    const cos = Math.cos(rotation);

    return [
      { x: -halfWidth, y: -halfHeight },
      { x: halfWidth, y: -halfHeight },
      { x: halfWidth, y: halfHeight },
      { x: -halfWidth, y: halfHeight },
    ].map((corner) => ({
      x: centerX + corner.x * cos - corner.y * sin,
      y: centerY + corner.x * sin + corner.y * cos,
    }));
  }

  getCompositionShadowParts() {
    return this.collectCompositionShadowParts();
  }

  collectCompositionShadowParts(transform = {
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
  }) {
    const parts = this.draggableParts.map((part) => (
      this.createTransformedShadowPart(part, transform)
    ));

    this.stackChildren?.forEach((child) => {
      if (!child?.collectCompositionShadowParts) {
        return;
      }

      const childTransform = this.composeChildShadowTransform(transform, child);

      parts.push(...child.collectCompositionShadowParts(childTransform));
    });

    return parts;
  }

  composeChildShadowTransform(parentTransform, child) {
    const childX = child.x ?? 0;
    const childY = child.y ?? 0;
    const parentSin = Math.sin(parentTransform.rotation);
    const parentCos = Math.cos(parentTransform.rotation);
    const scaledX = childX * parentTransform.scaleX;
    const scaledY = childY * parentTransform.scaleY;

    return {
      x: parentTransform.x + scaledX * parentCos - scaledY * parentSin,
      y: parentTransform.y + scaledX * parentSin + scaledY * parentCos,
      rotation: parentTransform.rotation + (child.rotation ?? 0),
      scaleX: parentTransform.scaleX * (child.scaleX ?? 1),
      scaleY: parentTransform.scaleY * (child.scaleY ?? 1),
    };
  }

  createTransformedShadowPart(part, transform) {
    if (!transform.x && !transform.y && !transform.rotation
      && transform.scaleX === 1 && transform.scaleY === 1) {
      return part;
    }

    const partX = part.x ?? 0;
    const partY = part.y ?? 0;
    const transformSin = Math.sin(transform.rotation);
    const transformCos = Math.cos(transform.rotation);
    const scaledX = partX * transform.scaleX;
    const scaledY = partY * transform.scaleY;
    const proxy = {
      texture: part.texture,
      frame: part.frame,
      isCropped: part.isCropped,
      _crop: part._crop,
      originX: part.originX,
      originY: part.originY,
      excludeFromCompositionShadow: part.excludeFromCompositionShadow,
    };

    proxy.x = transform.x + scaledX * transformCos - scaledY * transformSin;
    proxy.y = transform.y + scaledX * transformSin + scaledY * transformCos;
    proxy.rotation = transform.rotation + (part.rotation ?? 0);
    proxy.scaleX = (part.scaleX ?? 1) * transform.scaleX;
    proxy.scaleY = (part.scaleY ?? 1) * transform.scaleY;
    proxy.displayWidth = (part.displayWidth ?? 0) * Math.abs(transform.scaleX);
    proxy.displayHeight = (part.displayHeight ?? 0) * Math.abs(transform.scaleY);

    if (part.compositionWidth !== undefined) {
      proxy.compositionWidth = part.compositionWidth * Math.abs(transform.scaleX);
    }

    if (part.compositionHeight !== undefined) {
      proxy.compositionHeight = part.compositionHeight * Math.abs(transform.scaleY);
    }

    if (part.compositionOffsetX || part.compositionOffsetY) {
      const offsetX = (part.compositionOffsetX ?? 0) * transform.scaleX;
      const offsetY = (part.compositionOffsetY ?? 0) * transform.scaleY;

      proxy.compositionOffsetX = offsetX * transformCos - offsetY * transformSin;
      proxy.compositionOffsetY = offsetX * transformSin + offsetY * transformCos;
    }

    return proxy;
  }

  getCanvasSourceForTexture(texture) {
    const source = texture?.getSourceImage?.();

    if (source?.getContext) {
      return source;
    }

    if (source?.canvas?.getContext) {
      return source.canvas;
    }

    return null;
  }

  destroy(fromScene) {
    draggableRegistry.delete(this);

    if (this.stackDragShadow) {
      this.deactivateStackDragShadow();
    }

    if (this.pendingShadowRefresh) {
      this.pendingShadowRefresh.remove(false);
      this.pendingShadowRefresh = null;
    }

    if (this.snapBackTween) {
      this.snapBackTween.stop();
      this.snapBackTween = null;
    }

    this.stopDragPositionUpdates();

    if (this.shadow) {
      const shadow = this.shadow;

      this.shadow = null;
      this.destroyPixelShadow(shadow);
    }

    super.destroy(fromScene);
  }

  applyDragDepth() {
    let maxDepth = this.restDepth;

    for (const other of draggableRegistry) {
      if (other === this || !other.scene) {
        continue;
      }
      if (other.depth > maxDepth) {
        maxDepth = other.depth;
      }
    }

    this.setDepth(maxDepth + this.dragDepth);
  }

  applyRestingDepth() {
    const footprint = this.getFootprint();
    const bottom = footprint.y + footprint.height;

    this.setDepth(this.restDepth + bottom);
  }

  refreshOtherRestingDepths() {
    for (const other of draggableRegistry) {
      if (other === this || !other.scene || other.isDragging) {
        continue;
      }

      const footprint = other.getFootprint();
      const bottom = footprint.y + footprint.height;

      other.setDepth(other.restDepth + bottom);
    }
  }

  getFootprint() {
    const depthFactor = Phaser.Math.Clamp(this.footprintDepthFactor ?? 1, 0, 1);
    const footprintHeight = this.hitbox.height * depthFactor;
    const bottom = this.y + this.hitbox.y + this.hitbox.height;

    return new Phaser.Geom.Rectangle(
      this.x + this.hitbox.x,
      bottom - footprintHeight,
      this.hitbox.width,
      footprintHeight,
    );
  }

  canStackOn(_other) {
    return false;
  }

  accepts(_other) {
    return false;
  }

  canOccupyPosition(x, y) {
    const depthFactor = Phaser.Math.Clamp(this.footprintDepthFactor ?? 1, 0, 1);
    const footprintHeight = this.hitbox.height * depthFactor;
    const bottom = y + this.hitbox.y + this.hitbox.height;
    const candidate = new Phaser.Geom.Rectangle(
      x + this.hitbox.x,
      bottom - footprintHeight,
      this.hitbox.width,
      footprintHeight,
    );

    for (const other of draggableRegistry) {
      if (other === this || !other.scene) {
        continue;
      }

      const otherFootprint = other.getFootprint();

      if (!Phaser.Geom.Intersects.RectangleToRectangle(candidate, otherFootprint)) {
        continue;
      }

      if (this.canStackOn(other) && other.accepts(this)) {
        continue;
      }

      return false;
    }

    return true;
  }

  shouldSuppressDragStart(_pointer) {
    return false;
  }

  getDragPointerId(pointer) {
    if (!pointer) {
      return null;
    }

    const id = pointer.id ?? pointer.pointerId;
    const downTime = pointer.downTime ?? null;

    if (id !== undefined && downTime !== null) {
      return `${id}:${downTime}`;
    }

    return id ?? downTime;
  }

  isDragSuppressed(pointer) {
    const pointerId = this.getDragPointerId(pointer);

    return pointerId !== null && pointerId === this.suppressedDragPointerId;
  }

  handleDragStart(pointer) {
    if (this.shouldSuppressDragStart(pointer)) {
      this.suppressedDragPointerId = this.getDragPointerId(pointer);
      this.isDragging = false;
      return false;
    }

    if (this.stackParent && this.detachFromStackParent) {
      this.detachFromStackParent();
    }

    this.suppressedDragPointerId = null;
    this.ensureCompositionShadowReady();
    this.isDragging = true;
    this.dragAnchorX = this.x;
    this.dragAnchorY = this.y;
    this.stopSnapBack();
    this.stopDropImpact();
    this.applyDragDepth();
    this.lastValidX = this.x;
    this.lastValidY = this.y;
    this.startDragPositionUpdates();
    this.tweenDragLift(this.dragLift, this.dragLiftDuration, 'Quad.easeOut');
    return true;
  }

  handleDrag(_pointer, dragX, dragY) {
    if (!this.isDragging) {
      return false;
    }

    this.dragAnchorX = dragX;
    this.dragAnchorY = dragY;

    if (this.canOccupyPosition(dragX, dragY)) {
      this.lastValidX = dragX;
      this.lastValidY = dragY;
    }

    this.updateStackHoverHighlight(dragX, dragY);

    return true;
  }

  updateStackHoverHighlight(x, y) {
    if (!this.stackCategory) {
      return;
    }

    const target = this.findStackTargetAt(x, y);

    if (target === this.currentStackHover) {
      return;
    }

    if (this.currentStackHover?.setStackHighlight) {
      this.currentStackHover.setStackHighlight(false);
    }

    if (target?.setStackHighlight) {
      target.setStackHighlight(true);
    }

    this.currentStackHover = target;
  }

  clearStackHoverHighlight() {
    if (this.currentStackHover?.setStackHighlight) {
      this.currentStackHover.setStackHighlight(false);
    }
    this.currentStackHover = null;
  }

  handleDragEnd(pointer) {
    if (this.isDragSuppressed(pointer)) {
      this.suppressedDragPointerId = null;
      return false;
    }

    if (!this.isDragging) {
      return false;
    }

    this.isDragging = false;
    this.stopDragPositionUpdates();
    this.tweenDragLift(0, this.dropLiftDuration, 'Quad.easeIn', () => {
      if (!this.isDragging) {
        this.applyRestingDepth();
        this.refreshOtherRestingDepths();
        this.playDropImpact();
      }
    });

    const stackTarget = this.findStackTargetAt(this.x, this.y);

    this.clearStackHoverHighlight();

    if (stackTarget && this.attachToStackTarget) {
      this.attachToStackTarget(stackTarget);
    } else if (!this.canOccupyPosition(this.x, this.y)) {
      this.snapBackTo(this.lastValidX, this.lastValidY);
    }

    return true;
  }

  getWorldHitboxRect(centerX = this.x, centerY = this.y) {
    return new Phaser.Geom.Rectangle(
      centerX + this.hitbox.x,
      centerY + this.hitbox.y,
      this.hitbox.width,
      this.hitbox.height,
    );
  }

  beginManualDrag(pointer) {
    if (this.isDragging) {
      return false;
    }

    this.isDragging = true;
    this.isManualDrag = true;
    this.dragAnchorX = this.x;
    this.dragAnchorY = this.y;
    this.manualDragOffsetX = this.x - pointer.x;
    this.manualDragOffsetY = this.y - pointer.y;
    this.lastValidX = this.x;
    this.lastValidY = this.y;

    this.stopSnapBack();
    this.stopDropImpact();
    this.ensureCompositionShadowReady();
    this.applyDragDepth();
    this.startDragPositionUpdates();
    this.tweenDragLift(this.dragLift, this.dragLiftDuration, 'Quad.easeOut');

    this.manualDragMoveHandler = (movePointer) => {
      if (!this.isDragging || !this.isManualDrag) {
        return;
      }

      const x = movePointer.x + this.manualDragOffsetX;
      const y = movePointer.y + this.manualDragOffsetY;

      this.dragAnchorX = x;
      this.dragAnchorY = y;

      if (this.canOccupyPosition(x, y)) {
        this.lastValidX = x;
        this.lastValidY = y;
      }

      this.updateStackHoverHighlight(x, y);
    };

    this.manualDragUpHandler = () => {
      this.endManualDrag();
    };

    this.scene.input.on('pointermove', this.manualDragMoveHandler);
    this.scene.input.on('pointerup', this.manualDragUpHandler);
    this.scene.input.on('pointerupoutside', this.manualDragUpHandler);

    return true;
  }

  endManualDrag() {
    if (!this.isManualDrag) {
      return false;
    }

    this.scene.input.off('pointermove', this.manualDragMoveHandler);
    this.scene.input.off('pointerup', this.manualDragUpHandler);
    this.scene.input.off('pointerupoutside', this.manualDragUpHandler);
    this.manualDragMoveHandler = null;
    this.manualDragUpHandler = null;
    this.isManualDrag = false;
    this.isDragging = false;
    this.stopDragPositionUpdates();

    this.tweenDragLift(0, this.dropLiftDuration, 'Quad.easeIn', () => {
      if (!this.isDragging) {
        this.applyRestingDepth();
        this.refreshOtherRestingDepths();
        this.playDropImpact();
      }
    });

    const stackTarget = this.findStackTargetAt(this.x, this.y);

    this.clearStackHoverHighlight();

    if (stackTarget && this.attachToStackTarget) {
      this.attachToStackTarget(stackTarget);
    } else if (!this.canOccupyPosition(this.x, this.y)) {
      this.snapBackTo(this.lastValidX, this.lastValidY);
    }

    return true;
  }

  findStackTargetAt(x, y) {
    if (!this.stackCategory) {
      return null;
    }

    const myRect = this.getWorldHitboxRect(x, y);
    let bestTarget = null;
    let bestDepth = -Infinity;

    for (const other of draggableRegistry) {
      if (other === this || !other.scene || other.isDragging) {
        continue;
      }

      const otherRect = other.getWorldHitboxRect();
      const placement = { x, y, sourceRect: myRect, targetRect: otherRect };

      if (!this.canStackOn(other, placement) || !other.accepts(this, placement)) {
        continue;
      }

      if (!Phaser.Geom.Intersects.RectangleToRectangle(myRect, otherRect)) {
        continue;
      }

      if (other.depth > bestDepth) {
        bestDepth = other.depth;
        bestTarget = other;
      }
    }

    return bestTarget;
  }

  snapBackTo(x, y) {
    this.stopSnapBack();

    this.snapBackTween = this.scene.tweens.add({
      targets: this,
      x,
      y,
      duration: this.snapBackDuration,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.snapBackTween = null;
      },
    });
  }

  stopSnapBack() {
    if (this.snapBackTween) {
      this.snapBackTween.stop();
      this.snapBackTween = null;
    }
  }

  setDragLift(lift) {
    this.updateStackDragShadow(lift);

    this.currentLift = lift;
    const liftOffset = this.getLocalVectorForWorldOffset(0, -lift + this.currentImpactSink);

    this.draggableParts.forEach((part) => {
      const basePosition = this.draggablePartBasePositions.get(part) || { x: part.x, y: 0 };

      part.setPosition(
        basePosition.x + liftOffset.x,
        basePosition.y + liftOffset.y,
      );
    });

    if (this.shadow) {
      const liftProgress = Phaser.Math.Clamp(lift / this.dragLift, 0, 1);
      const shadowScreenOffset = Phaser.Math.Linear(this.restShadowOffset, this.dragShadowOffset, liftProgress);

      this.setShadowScreenOffset(shadowScreenOffset);
      this.shadow.setAlpha(Phaser.Math.Linear(this.restShadowAlpha, this.dragShadowAlpha, liftProgress));

      if (this.shadow.setPixelBlurProgress) {
        this.shadow.setPixelBlurProgress(liftProgress);
      }
    }
  }

  updateStackDragShadow(lift) {
    const shouldMergeStackShadow = this.shouldUseMergedStackShadow(lift);

    if (shouldMergeStackShadow && !this.stackDragShadow) {
      this.activateStackDragShadow();
    } else if (!shouldMergeStackShadow && this.stackDragShadow) {
      this.deactivateStackDragShadow();
    }
  }

  shouldUseMergedStackShadow(lift) {
    return Boolean(
      this.isDragging
      && lift > 0
      && this.stackChildren?.some((child) => child?.scene),
    );
  }

  activateStackDragShadow() {
    if (!this.scene) {
      return;
    }

    const parts = this.getCompositionShadowParts();

    if (!parts.length) {
      return;
    }

    const bounds = this.getDraggablePartsShadowBounds(parts);
    const shadow = this.createShadowFromBounds(bounds, parts);

    shadow.isCompositionShadow = true;
    shadow.keepWorldRotation = true;

    this.stackDragShadowOriginalShadow = this.shadow;
    this.hideStackDragSourceShadows();
    this.stackDragShadow = shadow;
    this.shadow = shadow;
    this.shadow.compositionOffsetX ??= 0;
    this.shadow.compositionOffsetY ??= 0;
    this.shadow.setDepth(-1);
    this.shadow.setAlpha(0);
    this.syncPixelShadowRotation();
    this.addAt(this.shadow, 0);
    this.stackDragShadowNeedsRefresh = true;
  }

  refreshStackDragShadow() {
    if (!this.stackDragShadow || !this.scene) {
      return;
    }

    const previousShadow = this.stackDragShadow;
    const previousAlpha = previousShadow.alpha ?? 0;
    const parts = this.getCompositionShadowParts();

    if (!parts.length) {
      this.deactivateStackDragShadow();
      return;
    }

    const bounds = this.getDraggablePartsShadowBounds(parts);
    const shadow = this.createShadowFromBounds(bounds, parts);

    shadow.isCompositionShadow = true;
    shadow.keepWorldRotation = true;
    shadow.compositionOffsetX ??= 0;
    shadow.compositionOffsetY ??= 0;
    shadow.setDepth(-1);
    shadow.setAlpha(previousAlpha);

    this.remove(previousShadow);
    this.stackDragShadow = shadow;
    this.shadow = shadow;
    this.destroyPixelShadow(previousShadow);
    this.syncPixelShadowRotation();
    this.addAt(this.shadow, 0);
    this.stackDragShadowNeedsRefresh = false;
  }

  deactivateStackDragShadow() {
    const shadow = this.stackDragShadow;

    if (!shadow) {
      return;
    }

    this.remove(shadow);
    this.stackDragShadow = null;
    this.stackDragShadowNeedsRefresh = false;
    this.shadow = this.stackDragShadowOriginalShadow;
    this.destroyPixelShadow(shadow);
    this.showStackDragSourceShadows();
    this.stackDragShadowOriginalShadow = null;
  }

  hideStackDragSourceShadows() {
    this.setStackDragSourceShadowsVisible(false);
  }

  showStackDragSourceShadows() {
    this.setStackDragSourceShadowsVisible(true);
  }

  setStackDragSourceShadowsVisible(visible) {
    if (this.stackDragShadowOriginalShadow) {
      this.stackDragShadowOriginalShadow.setVisible(visible);
    }

    this.stackChildren?.forEach((child) => {
      child?.setStackDragSourceShadowsVisible?.(visible);

      if (child?.shadow && child.shadow !== child.stackDragShadow) {
        child.shadow.setVisible(visible);
      }
    });
  }

  setShadowScreenOffset(offsetY) {
    if (!this.shadow) {
      return;
    }

    const compositionOffset = new Phaser.Math.Vector2(
      this.shadow.compositionOffsetX ?? 0,
      this.shadow.compositionOffsetY ?? 0,
    );
    const screenOffset = this.getLocalVectorForWorldOffset(0, offsetY);

    this.shadow.setPosition(
      compositionOffset.x + screenOffset.x,
      compositionOffset.y + screenOffset.y,
    );
    this.syncPixelShadowRotation();
  }

  syncPixelShadowRotation() {
    if (!this.shadow?.keepWorldRotation) {
      return;
    }

    this.shadow.setRotation(-(this.rotation ?? 0));
  }

  getLocalVectorForWorldOffset(x, y) {
    const matrix = this.getWorldTransformMatrix?.();

    if (matrix?.applyInverse) {
      const origin = new Phaser.Math.Vector2();
      const offset = new Phaser.Math.Vector2();

      matrix.applyInverse(0, 0, origin);
      matrix.applyInverse(x, y, offset);

      return new Phaser.Math.Vector2(
        offset.x - origin.x,
        offset.y - origin.y,
      );
    }

    const rotation = -(this.rotation ?? 0);
    const sin = Math.sin(rotation);
    const cos = Math.cos(rotation);

    return new Phaser.Math.Vector2(
      x * cos - y * sin,
      x * sin + y * cos,
    );
  }

  startDragPositionUpdates() {
    if (this.dragUpdateHandler || !this.scene?.events) {
      return;
    }

    this.dragUpdateHandler = (_time, delta) => {
      if (this.isDragging) {
        this.updateDragPosition(delta);
      }
    };

    this.scene.events.on('update', this.dragUpdateHandler);
  }

  stopDragPositionUpdates() {
    if (!this.dragUpdateHandler || !this.scene?.events) {
      this.dragUpdateHandler = null;
      return;
    }

    this.scene.events.off('update', this.dragUpdateHandler);
    this.dragUpdateHandler = null;
  }

  updateDragPosition(delta = 16.67, snap = false) {
    if (snap || !this.isDragging) {
      this.setPosition(this.dragAnchorX, this.dragAnchorY);
      return;
    }

    const frameRatio = Math.max(delta, 0) / 16.67;
    const alpha = 1 - Math.pow(1 - this.dragFollowSmoothing, frameRatio);
    const nextX = Phaser.Math.Linear(this.x, this.dragAnchorX, alpha);
    const nextY = Phaser.Math.Linear(this.y, this.dragAnchorY, alpha);
    const distance = Phaser.Math.Distance.Between(
      nextX,
      nextY,
      this.dragAnchorX,
      this.dragAnchorY,
    );

    if (distance <= this.dragSnapDistance) {
      this.setPosition(this.dragAnchorX, this.dragAnchorY);
      return;
    }

    this.setPosition(nextX, nextY);
  }

  tweenDragLift(targetLift, duration, ease, onComplete = null) {
    if (this.dragLiftTween) {
      this.dragLiftTween.stop();
    }

    this.dragLiftTween = this.scene.tweens.add({
      targets: this,
      currentLift: targetLift,
      duration,
      ease,
      onUpdate: () => {
        this.setDragLift(this.currentLift);
      },
      onComplete: () => {
        this.dragLiftTween = null;

        if (onComplete) {
          onComplete();
        }
      },
    });
  }

  playDropImpact() {
    this.stopDropImpact();

    const impact = this.getDropImpact();

    this.dropImpactTween = this.scene.tweens.add({
      targets: this,
      currentImpactProgress: {
        from: 0,
        to: 1,
      },
      duration: impact.duration,
      ease: 'Linear',
      onUpdate: () => {
        this.setDropImpactProgress(this.currentImpactProgress, impact);
        this.applyDropImpact();
        this.setDragLift(this.currentLift);
      },
      onComplete: () => {
        this.dropImpactTween = null;
        this.resetDropImpact();
      },
    });

    this.stackChildren?.forEach((child) => {
      child.playDropImpact?.();
    });
  }

  getDropImpact() {
    const softness = Phaser.Math.Clamp(this.softness, 0, 1);

    return {
      squashX: softness * 0.24,
      squashY: softness * 0.34,
      stretchX: softness * 0.08,
      stretchY: softness * 0.12,
      sink: softness * 5,
      reboundLift: softness * 1.4,
      duration: this.dropImpactDuration + softness * 130,
    };
  }

  stopDropImpact() {
    if (this.dropImpactTween) {
      this.dropImpactTween.stop();
      this.dropImpactTween = null;
    }

    this.resetDropImpact();
  }

  setDropImpactProgress(progress, impact) {
    const clampedProgress = Phaser.Math.Clamp(progress, 0, 1);
    const damping = Math.pow(1 - clampedProgress, 2.2);
    const compression = Math.cos(clampedProgress * Math.PI * 3.5) * damping;

    if (compression >= 0) {
      this.currentImpactScaleX = 1 + impact.squashX * compression;
      this.currentImpactScaleY = 1 - impact.squashY * compression;
      this.currentImpactSink = impact.sink * compression;
      return;
    }

    const stretch = -compression;
    this.currentImpactScaleX = 1 - impact.stretchX * stretch;
    this.currentImpactScaleY = 1 + impact.stretchY * stretch;
    this.currentImpactSink = -impact.reboundLift * stretch;
  }

  applyDropImpact() {
    this.draggableParts.forEach((part) => {
      const baseScale = this.draggablePartBaseScales.get(part);

      if (!baseScale) {
        return;
      }

      part.setScale(
        baseScale.scaleX * this.currentImpactScaleX,
        baseScale.scaleY * this.currentImpactScaleY,
      );
    });
  }

  resetDropImpact() {
    this.currentImpactProgress = 1;
    this.currentImpactScaleX = 1;
    this.currentImpactScaleY = 1;
    this.currentImpactSink = 0;
    this.applyDropImpact();
    this.setDragLift(this.currentLift);
  }
}
