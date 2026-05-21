import * as Phaser from 'phaser/dist/phaser.esm.js';
import { SceneObject } from './SceneObject.js';

let shadowTextureId = 0;

const draggableRegistry = new Set();
const shadowImageDataCache = new WeakMap();
const shadowTextureCache = new Map();
const SHADOW_TEXTURE_CACHE_MAX = 200;

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
      if (this.scene?.textures?.exists(key)) {
        this.scene.textures.remove(key);
      }
    });
  }

  refreshCompositionShadow() {
    if (!this.draggableParts.length) {
      return null;
    }

    if (this.isDragging) {
      return this.regenerateCompositionShadow();
    }

    this.scheduleCompositionShadowRefresh();
    return null;
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

    const bounds = this.getDraggablePartsShadowBounds();
    const shadow = this.createShadowFromBounds(bounds);
    shadow.isCompositionShadow = true;
    shadow.keepWorldRotation = true;

    return this.setPixelShadow(shadow);
  }

  getDraggablePartsBounds() {
    return this.draggableParts.reduce((bounds, part) => {
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

  createShadowFromBounds(bounds) {
    const sampledShadow = this.createShadowFromPartPixels(bounds);

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

  createShadowFromPartPixels(bounds) {
    const width = Math.max(4, bounds.right - bounds.left);
    const height = Math.max(4, bounds.bottom - bounds.top);
    const centerX = bounds.left + width / 2;
    const centerY = bounds.top + height / 2;
    const [edgeTextureKey, coreTextureKey] = this.createShadowTexturesFromParts(bounds);

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

  createShadowTexturesFromParts(bounds) {
    const cacheKey = this.getShadowCacheKey(bounds);

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

    this.draggableParts.forEach((part) => {
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

  getShadowCacheKey(bounds) {
    const partSignatures = [];

    for (const part of this.draggableParts) {
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
      const context = source.getContext('2d', { willReadFrequently: true });

      if (!context) {
        return null;
      }

      imageData = context.getImageData(crop.cx, crop.cy, sourceWidth, sourceHeight);
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

  getDraggablePartsShadowBounds() {
    const rotation = this.rotation ?? 0;
    const projectionSin = Math.sin(rotation);
    const projectionCos = Math.cos(rotation);
    const bounds = this.draggableParts.reduce((currentBounds, part) => {
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
      return this.getDraggablePartsBounds();
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

    if (this.pendingShadowRefresh) {
      this.pendingShadowRefresh.remove(false);
      this.pendingShadowRefresh = null;
    }

    if (this.snapBackTween) {
      this.snapBackTween.stop();
      this.snapBackTween = null;
    }

    if (this.shadow) {
      const shadow = this.shadow;

      this.shadow = null;
      this.destroyPixelShadow(shadow);
    }

    super.destroy(fromScene);
  }

  getFootprint() {
    return new Phaser.Geom.Rectangle(
      this.x + this.hitbox.x,
      this.y + this.hitbox.y,
      this.hitbox.width,
      this.hitbox.height,
    );
  }

  canStackOn(_other) {
    return false;
  }

  accepts(_other) {
    return false;
  }

  canOccupyPosition(x, y) {
    const candidate = new Phaser.Geom.Rectangle(
      x + this.hitbox.x,
      y + this.hitbox.y,
      this.hitbox.width,
      this.hitbox.height,
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

    this.suppressedDragPointerId = null;
    this.ensureCompositionShadowReady();
    this.isDragging = true;
    this.dragAnchorX = this.x;
    this.dragAnchorY = this.y;
    this.stopSnapBack();
    this.stopDropImpact();
    this.setDepth(this.dragDepth);
    this.lastValidX = this.x;
    this.lastValidY = this.y;
    this.tweenDragLift(this.dragLift, this.dragLiftDuration, 'Quad.easeOut');
    return true;
  }

  handleDrag(_pointer, dragX, dragY) {
    if (!this.isDragging) {
      return false;
    }

    this.dragAnchorX = dragX;
    this.dragAnchorY = dragY;
    this.updateDragPosition();

    if (this.canOccupyPosition(dragX, dragY)) {
      this.lastValidX = dragX;
      this.lastValidY = dragY;
    }

    return true;
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
    this.tweenDragLift(0, this.dropLiftDuration, 'Quad.easeIn', () => {
      if (!this.isDragging) {
        this.setDepth(this.restDepth);
        this.playDropImpact();
      }
    });

    if (!this.canOccupyPosition(this.x, this.y)) {
      this.snapBackTo(this.lastValidX, this.lastValidY);
    }

    return true;
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
    const rotation = -(this.rotation ?? 0);
    const sin = Math.sin(rotation);
    const cos = Math.cos(rotation);

    return new Phaser.Math.Vector2(
      x * cos - y * sin,
      x * sin + y * cos,
    );
  }

  updateDragPosition() {
    this.setPosition(this.dragAnchorX, this.dragAnchorY);
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

        if (this.isDragging) {
          this.updateDragPosition();
        }
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
