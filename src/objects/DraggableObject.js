import * as Phaser from 'phaser/dist/phaser.esm.js';
import { SceneObject } from './SceneObject.js';

let shadowTextureId = 0;

export class DraggableObject extends SceneObject {
  constructor(scene, x, y, width, height) {
    super(scene, x, y);

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
    this.dragAnchorX = x;
    this.dragAnchorY = y;
    this.dragShadowOffset = 14;
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

  setPixelShadow(shadow) {
    if (this.shadow) {
      this.destroyPixelShadow(this.shadow);
    }

    this.shadow = shadow;
    this.shadow.compositionOffsetX ??= 0;
    this.shadow.compositionOffsetY ??= 0;
    this.shadow.setDepth(-1);
    this.shadow.setAlpha(this.restShadowAlpha);
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

    const bounds = this.getDraggablePartsBounds();
    const shadow = this.createShadowFromBounds(bounds);

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

    shadow.compositionOffsetX = centerX;
    shadow.compositionOffsetY = centerY;

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
    const edgeTextureKey = this.createShadowTextureFromParts(
      bounds,
      this.shadowEdgeScaleX,
      this.shadowEdgeScaleY,
    );
    const coreTextureKey = this.createShadowTextureFromParts(
      bounds,
      this.shadowCoreScaleX,
      this.shadowCoreScaleY,
    );

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
    shadow.compositionOffsetX = centerX;
    shadow.compositionOffsetY = centerY;

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

  createShadowTextureFromParts(bounds, scaleX, scaleY) {
    const width = Math.max(4, bounds.right - bounds.left);
    const height = Math.max(4, bounds.bottom - bounds.top);
    const centerX = bounds.left + width / 2;
    const centerY = bounds.top + height / 2;
    const padding = 4;
    const textureWidth = Math.max(4, Math.ceil(width * scaleX) + padding * 2);
    const textureHeight = Math.max(4, Math.ceil(height * scaleY) + padding * 2);
    const key = `computed-shadow-${shadowTextureId}`;
    const texture = this.scene.textures.createCanvas(key, textureWidth, textureHeight);

    shadowTextureId += 1;

    if (!texture) {
      return null;
    }

    const context = texture.getContext();
    let drewPixels = false;

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, textureWidth, textureHeight);
    context.fillStyle = '#ffffff';

    this.draggableParts.forEach((part) => {
      if (part.excludeFromCompositionShadow) {
        return;
      }

      drewPixels = this.paintPartShadowPixels(
        context,
        part,
        centerX,
        centerY,
        textureWidth,
        textureHeight,
        scaleX,
        scaleY,
      ) || drewPixels;
    });

    if (!drewPixels) {
      this.scene.textures.remove(key);
      return null;
    }

    texture.refresh();

    return key;
  }

  paintPartShadowPixels(context, part, centerX, centerY, textureWidth, textureHeight, shadowScaleX, shadowScaleY) {
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
    const scaleX = part.scaleX ?? 1;
    const scaleY = part.scaleY ?? 1;
    const rotation = part.rotation ?? 0;
    const originX = part.originX ?? 0.5;
    const originY = part.originY ?? 0.5;
    const sin = Math.sin(rotation);
    const cos = Math.cos(rotation);
    const pixelWidth = Math.max(1, Math.ceil(Math.abs(scaleX * shadowScaleX)));
    const pixelHeight = Math.max(1, Math.ceil(Math.abs(scaleY * shadowScaleY)));
    let drewPixels = false;

    for (let y = 0; y < sourceHeight; y += 1) {
      for (let x = 0; x < sourceWidth; x += 1) {
        const alpha = imageData.data[(y * sourceWidth + x) * 4 + 3];

        if (alpha === 0) {
          continue;
        }

        const localTextureX = cropX + x + 0.5 - frameWidth * originX;
        const localTextureY = cropY + y + 0.5 - frameHeight * originY;
        const localPartX = localTextureX * scaleX;
        const localPartY = localTextureY * scaleY;
        const partX = part.x + localPartX * cos - localPartY * sin;
        const partY = part.y + localPartX * sin + localPartY * cos;
        const shadowX = Math.round(textureWidth / 2 + (partX - centerX) * shadowScaleX - pixelWidth / 2);
        const shadowY = Math.round(textureHeight / 2 + (partY - centerY) * shadowScaleY - pixelHeight / 2);

        context.fillRect(shadowX, shadowY, pixelWidth, pixelHeight);
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

    const context = source.getContext('2d', { willReadFrequently: true });

    if (!context) {
      return null;
    }

    return {
      imageData: context.getImageData(crop.cx, crop.cy, sourceWidth, sourceHeight),
      part,
      sourceWidth,
      sourceHeight,
      cropX: crop.x ?? 0,
      cropY: crop.y ?? 0,
      frameWidth: frame.realWidth ?? sourceWidth,
      frameHeight: frame.realHeight ?? sourceHeight,
    };
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
    if (this.shadow) {
      const shadow = this.shadow;

      this.shadow = null;
      this.destroyPixelShadow(shadow);
    }

    super.destroy(fromScene);
  }

  handleDragStart() {
    this.isDragging = true;
    this.dragAnchorX = this.x;
    this.dragAnchorY = this.y;
    this.stopDropImpact();
    this.setDepth(this.dragDepth);
    this.tweenDragLift(this.dragLift, this.dragLiftDuration, 'Quad.easeOut');
  }

  handleDrag(_pointer, dragX, dragY) {
    this.dragAnchorX = dragX;
    this.dragAnchorY = dragY;
    this.updateDragPosition();
  }

  handleDragEnd() {
    this.isDragging = false;
    this.tweenDragLift(0, this.dropLiftDuration, 'Quad.easeIn', () => {
      if (!this.isDragging) {
        this.setDepth(this.restDepth);
        this.playDropImpact();
      }
    });
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
