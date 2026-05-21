import * as Phaser from 'phaser/dist/phaser.esm.js';
import { SceneObject } from './SceneObject.js';

const visibleBoundsCache = new Map();

export class CuttableObject extends SceneObject {
  static DEFAULT_MINIMUM_CUT_WIDTH = 5;
  static DEFAULT_ALLOWED_CUT_ORIENTATIONS = ['vertical', 'horizontal'];

  constructor(scene, x, y, textureKey, textureWidth, textureHeight, pixelScale = 1, options = {}) {
    super(scene, x, y);

    this.textureKey = textureKey;
    this.cropOriginX = 0;
    this.cropOriginY = 0;
    this.textureWidth = textureWidth;
    this.textureHeight = textureHeight;
    this.pixelScale = pixelScale;
    this.anchorTextureX = textureWidth / 2;
    this.anchorTextureY = textureHeight / 2;
    this.cutWidth = textureWidth * pixelScale;
    this.cutHeight = textureHeight * pixelScale;
    this.minSwipeDistance = 24;
    this.minimumCutWidth = options.minimumCutWidth ?? CuttableObject.DEFAULT_MINIMUM_CUT_WIDTH;
    this.cutDepth = 20;
    this.cutGap = 5;
    this.cutLine = null;
    this.allowedCutOrientations = new Set(
      options.allowedCutOrientations ?? CuttableObject.DEFAULT_ALLOWED_CUT_ORIENTATIONS,
    );
    this.pieces = [];

    this.setSize(this.cutWidth, this.cutHeight);

    this.addPiece(0, 0, textureWidth, textureHeight);
    this.setDepth(this.cutDepth);
  }

  static setupCuttable(target, textureKey, textureWidth, textureHeight, pixelScale = 1, options = {}) {
    target.textureKey = textureKey;
    target.cropOriginX = 0;
    target.cropOriginY = 0;
    target.textureWidth = textureWidth;
    target.textureHeight = textureHeight;
    target.pixelScale = pixelScale;
    target.anchorTextureX = textureWidth / 2;
    target.anchorTextureY = textureHeight / 2;
    target.cutWidth = textureWidth * pixelScale;
    target.cutHeight = textureHeight * pixelScale;
    target.minSwipeDistance = 24;
    target.minimumCutWidth = options.minimumCutWidth ?? CuttableObject.DEFAULT_MINIMUM_CUT_WIDTH;
    target.cutDepth = 20;
    target.cutGap = 5;
    target.cutLine = null;
    target.allowedCutOrientations = new Set(
      options.allowedCutOrientations ?? CuttableObject.DEFAULT_ALLOWED_CUT_ORIENTATIONS,
    );
    target.pieces = [];

    target.addPiece(0, 0, textureWidth, textureHeight);
    target.setDepth(target.cutDepth);
  }

  tryCutWith(cutter, start, end) {
    if (!cutter.canCut) {
      return false;
    }

    const startLocal = this.worldToCuttableLocalPoint(start);
    const endLocal = this.worldToCuttableLocalPoint(end);
    const localDx = endLocal.x - startLocal.x;
    const localDy = endLocal.y - startLocal.y;
    const distance = Math.hypot(end.x - start.x, end.y - start.y);

    if (distance < this.minSwipeDistance) {
      return false;
    }

    const bounds = this.getLocalCutRectangle();
    const stroke = new Phaser.Geom.Line(startLocal.x, startLocal.y, endLocal.x, endLocal.y);
    const startsInside = Phaser.Geom.Rectangle.Contains(bounds, startLocal.x, startLocal.y);
    const endsInside = Phaser.Geom.Rectangle.Contains(bounds, endLocal.x, endLocal.y);

    if (!startsInside && !endsInside && !Phaser.Geom.Intersects.LineToRectangle(stroke, bounds)) {
      return false;
    }

    const orientation = Math.abs(localDx) >= Math.abs(localDy) ? 'horizontal' : 'vertical';

    if (!this.allowedCutOrientations.has(orientation)) {
      return false;
    }

    if (cutter.canCutOrientation && !cutter.canCutOrientation(orientation, this)) {
      return false;
    }

    const cutPosition = this.getLocalCutPosition(orientation, startLocal, endLocal, bounds);
    const replacements = this.cut(orientation, cutPosition);

    if (replacements) {
      cutter.showCutTrace?.(start, end);
    }

    return replacements;
  }

  cut(orientation, localPosition) {
    if (!this.canCutOnAxis(orientation)) {
      return false;
    }

    const cropBounds = this.getLocalCropBounds();
    const texturePosition = orientation === 'horizontal'
      ? this.cropOriginY + (localPosition - cropBounds.top) / this.pixelScale
      : this.cropOriginX + (localPosition - cropBounds.left) / this.pixelScale;
    let cutPieces = null;

    this.pieces.some((piece) => {
      const start = orientation === 'horizontal' ? piece.cropY : piece.cropX;
      const size = orientation === 'horizontal' ? piece.cropHeight : piece.cropWidth;
      const split = Math.round(texturePosition - start);

      if (!this.isValidSplit(orientation, split, size)) {
        return false;
      }

      if (orientation === 'horizontal') {
        cutPieces = [
          this.createPieceData(piece.cropX, piece.cropY, piece.cropWidth, split),
          this.createPieceData(piece.cropX, piece.cropY + split, piece.cropWidth, piece.cropHeight - split),
        ];
      } else {
        cutPieces = [
          this.createPieceData(piece.cropX, piece.cropY, split, piece.cropHeight),
          this.createPieceData(piece.cropX + split, piece.cropY, piece.cropWidth - split, piece.cropHeight),
        ];
      }

      return true;
    });

    if (!cutPieces) {
      return false;
    }

    const replacements = cutPieces.map((piece) => this.createCuttableFromPiece(piece));

    replacements.forEach((object) => {
      object.setDepth(this.depth);
    });
    this.separateCuttableObjects(replacements, orientation, localPosition);

    return replacements;
  }

  canCutOnAxis(orientation) {
    const size = orientation === 'horizontal' ? this.cutHeight : this.cutWidth;

    return size >= this.minimumCutWidth * 2;
  }

  isValidSplit(orientation, split, size) {
    const minimumTextureWidth = this.minimumCutWidth / this.pixelScale;
    const firstSize = split;
    const secondSize = size - split;

    return firstSize >= minimumTextureWidth && secondSize >= minimumTextureWidth;
  }

  createCuttableFromPiece(piece) {
    const visualPiece = this.createVisualPieceData(piece);
    const position = this.getPieceWorldVisibleCenter(visualPiece);
    const object = this.createReplacementCuttable(position, visualPiece);

    object.configureAsCutPiece(visualPiece, {
      minimumCutWidth: this.minimumCutWidth,
      minSwipeDistance: this.minSwipeDistance,
      cutDepth: this.cutDepth,
      cutGap: this.cutGap,
      allowedCutOrientations: this.allowedCutOrientations,
    });
    if (this.displayName) {
      object.displayName = this.displayName;
    }
    this.copyCuttableRotationTo(object);

    return object;
  }

  createReplacementCuttable(position, piece) {
    if (this.addDraggablePart && this.constructor !== CuttableObject) {
      return new this.constructor(this.scene, position.x, position.y, {
        cropWidth: piece.cropWidth,
        cropHeight: piece.cropHeight,
        minimumCutWidth: this.minimumCutWidth,
      });
    }

    return new CuttableObject(
      this.scene,
      position.x,
      position.y,
      this.textureKey,
      piece.cropWidth,
      piece.cropHeight,
      this.pixelScale,
      {
        minimumCutWidth: this.minimumCutWidth,
      },
    );
  }

  configureAsCutPiece(piece, options = {}) {
    this.pieces.forEach((currentPiece) => {
      currentPiece.image.destroy();
    });
    this.clearCuttableDraggableParts();

    this.cropOriginX = piece.cropX;
    this.cropOriginY = piece.cropY;
    this.textureWidth = piece.cropWidth;
    this.textureHeight = piece.cropHeight;
    this.cutWidth = piece.cropWidth * this.pixelScale;
    this.cutHeight = piece.cropHeight * this.pixelScale;
    this.minimumCutWidth = options.minimumCutWidth ?? this.minimumCutWidth;
    this.minSwipeDistance = options.minSwipeDistance ?? this.minSwipeDistance;
    this.cutDepth = options.cutDepth ?? this.cutDepth;
    this.cutGap = options.cutGap ?? this.cutGap;
    this.allowedCutOrientations = new Set(options.allowedCutOrientations ?? this.allowedCutOrientations);
    this.pieces = [this.createPieceData(piece.cropX, piece.cropY, piece.cropWidth, piece.cropHeight)];
    this.setAnchorToPieceVisibleCenter(this.pieces[0]);
    this.pieces[0].image = this.createPieceImage(this.pieces[0]);
    this.registerCuttablePart(this.pieces[0].image);
    this.refreshCuttableGeometry();

    if (this.dragAnchorX !== undefined) {
      this.dragAnchorX = this.x;
      this.dragAnchorY = this.y;
    }

    return this;
  }

  refreshCuttableGeometry() {
    this.setSize(this.cutWidth, this.cutHeight);

    if (this.setCenteredHitbox) {
      const bounds = this.getCuttableLocalBounds();
      const width = bounds.right - bounds.left;
      const height = bounds.bottom - bounds.top;
      const centerX = bounds.left + width / 2;
      const centerY = bounds.top + height / 2;

      this.setCenteredHitbox(width, height, centerX, centerY);
    }

    if (this.refreshCompositionShadow) {
      this.refreshCompositionShadow();
    }

    return this;
  }

  getCuttableLocalBounds() {
    return this.pieces.reduce((bounds, piece) => {
      const image = piece.image;
      const width = image.compositionWidth ?? image.displayWidth;
      const height = image.compositionHeight ?? image.displayHeight;
      const centerX = image.x + (image.compositionOffsetX ?? 0);
      const centerY = image.y + (image.compositionOffsetY ?? 0);
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

  addPiece(cropX, cropY, cropWidth, cropHeight) {
    const piece = this.createPieceData(cropX, cropY, cropWidth, cropHeight);

    piece.image = this.createPieceImage(piece);
    this.pieces.push(piece);
    this.registerCuttablePart(piece.image);

    return piece;
  }

  registerCuttablePart(part) {
    if (this.addDraggablePart) {
      this.addDraggablePart(part);
      return;
    }

    this.add(part);
  }

  clearCuttableDraggableParts() {
    if (!this.draggableParts) {
      return;
    }

    this.clearComputedShadeParts?.();

    if (this.shadow) {
      if (this.destroyPixelShadow) {
        this.destroyPixelShadow(this.shadow);
      } else {
        this.shadow.destroy();
      }

      this.shadow = null;
    }

    this.draggableParts = [];

    if (this.draggablePartBaseScales) {
      this.draggablePartBaseScales.clear();
    }

    if (this.draggablePartBasePositions) {
      this.draggablePartBasePositions.clear();
    }
  }

  createPieceData(cropX, cropY, cropWidth, cropHeight) {
    return {
      cropX,
      cropY,
      cropWidth,
      cropHeight,
    };
  }

  createVisualPieceData(piece) {
    return {
      ...piece,
      visibleBounds: this.getPieceVisibleTextureBounds(piece),
    };
  }

  createPieceImage(piece) {
    const image = this.scene.add.image(0, 0, this.textureKey);
    const visibleBounds = piece.visibleBounds ?? this.getPieceVisibleTextureBounds(piece);
    const frameCenterX = image.frame.realWidth / 2;
    const frameCenterY = image.frame.realHeight / 2;
    const visibleWidth = (visibleBounds.right - visibleBounds.left) * this.pixelScale;
    const visibleHeight = (visibleBounds.bottom - visibleBounds.top) * this.pixelScale;
    const visibleLeft = (visibleBounds.left - this.anchorTextureX) * this.pixelScale;
    const visibleTop = (visibleBounds.top - this.anchorTextureY) * this.pixelScale;

    image.setOrigin(0.5);
    image.setCrop(piece.cropX, piece.cropY, piece.cropWidth, piece.cropHeight);
    image.setScale(this.pixelScale);
    image.setPosition(
      (frameCenterX - this.anchorTextureX) * this.pixelScale,
      (frameCenterY - this.anchorTextureY) * this.pixelScale,
    );
    image.compositionWidth = visibleWidth;
    image.compositionHeight = visibleHeight;
    image.compositionOffsetX = visibleLeft + visibleWidth / 2 - image.x;
    image.compositionOffsetY = visibleTop + visibleHeight / 2 - image.y;

    return image;
  }

  setAnchorToPieceVisibleCenter(piece) {
    const visibleBounds = piece.visibleBounds ?? this.getPieceVisibleTextureBounds(piece);

    this.anchorTextureX = visibleBounds.left + (visibleBounds.right - visibleBounds.left) / 2;
    this.anchorTextureY = visibleBounds.top + (visibleBounds.bottom - visibleBounds.top) / 2;
  }

  getPieceVisibleTextureBounds(piece) {
    const cacheKey = `${this.textureKey}|${piece.cropX},${piece.cropY},${piece.cropWidth},${piece.cropHeight}`;
    const cached = visibleBoundsCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const texture = this.scene.textures.get(this.textureKey);
    const source = texture?.getSourceImage?.();

    if (!source) {
      return this.getPieceCropBounds(piece);
    }

    const supportsCanvasElement = typeof HTMLCanvasElement !== 'undefined';
    const canvas = supportsCanvasElement && source instanceof HTMLCanvasElement
      ? source
      : supportsCanvasElement && source.canvas instanceof HTMLCanvasElement
        ? source.canvas
        : null;

    if (!canvas) {
      return this.getPieceCropBounds(piece);
    }

    const context = canvas.getContext('2d');

    if (!context) {
      return this.getPieceCropBounds(piece);
    }

    const imageData = context.getImageData(piece.cropX, piece.cropY, piece.cropWidth, piece.cropHeight);
    let left = piece.cropWidth;
    let right = 0;
    let top = piece.cropHeight;
    let bottom = 0;

    for (let y = 0; y < piece.cropHeight; y += 1) {
      for (let x = 0; x < piece.cropWidth; x += 1) {
        const alpha = imageData.data[(y * piece.cropWidth + x) * 4 + 3];

        if (alpha === 0) {
          continue;
        }

        left = Math.min(left, x);
        right = Math.max(right, x + 1);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y + 1);
      }
    }

    if (right <= left || bottom <= top) {
      return this.getPieceCropBounds(piece);
    }

    const bounds = {
      left: piece.cropX + left,
      right: piece.cropX + right,
      top: piece.cropY + top,
      bottom: piece.cropY + bottom,
    };

    visibleBoundsCache.set(cacheKey, bounds);

    return bounds;
  }

  getPieceCropBounds(piece) {
    return {
      left: piece.cropX,
      right: piece.cropX + piece.cropWidth,
      top: piece.cropY,
      bottom: piece.cropY + piece.cropHeight,
    };
  }

  getPieceWorldVisibleCenter(piece) {
    const visibleBounds = piece.visibleBounds ?? this.getPieceVisibleTextureBounds(piece);
    const localCenter = {
      x: (visibleBounds.left + (visibleBounds.right - visibleBounds.left) / 2 - this.anchorTextureX) * this.pixelScale,
      y: (visibleBounds.top + (visibleBounds.bottom - visibleBounds.top) / 2 - this.anchorTextureY) * this.pixelScale,
    };

    return this.localToCuttableWorldPoint(localCenter);
  }

  getLocalCropBounds() {
    const left = (this.cropOriginX - this.anchorTextureX) * this.pixelScale;
    const top = (this.cropOriginY - this.anchorTextureY) * this.pixelScale;

    return {
      left,
      right: left + this.cutWidth,
      top,
      bottom: top + this.cutHeight,
    };
  }

  separatePieces(orientation, localPosition) {
    this.pieces.forEach((piece) => {
      const pieceCenter = orientation === 'horizontal'
        ? piece.image.y
        : piece.image.x;
      const direction = pieceCenter < localPosition ? -1 : 1;
      const target = direction * this.cutGap;
      const tweenTarget = orientation === 'horizontal'
        ? { y: piece.image.y + target }
        : { x: piece.image.x + target };

      this.scene.tweens.add({
        targets: piece.image,
        ...tweenTarget,
        duration: 90,
        ease: 'Quad.easeOut',
      });
    });
  }

  separateCuttableObjects(objects, orientation, localPosition) {
    objects.forEach((object) => {
      const center = orientation === 'horizontal'
        ? this.worldToCuttableLocalPoint(object).y
        : this.worldToCuttableLocalPoint(object).x;
      const direction = center < localPosition ? -1 : 1;
      const localOffset = orientation === 'horizontal'
        ? { x: 0, y: direction * this.cutGap }
        : { x: direction * this.cutGap, y: 0 };
      const worldOffset = this.localVectorToCuttableWorldVector(localOffset);

      this.scene.tweens.add({
        targets: object,
        x: object.x + worldOffset.x,
        y: object.y + worldOffset.y,
        duration: 90,
        ease: 'Quad.easeOut',
      });
    });
  }

  showCutLine(orientation, localPosition) {
    if (this.cutLine) {
      this.cutLine.destroy();
    }

    this.cutLine = this.scene.add.rectangle(
      orientation === 'horizontal' ? 0 : localPosition,
      orientation === 'horizontal' ? localPosition : 0,
      orientation === 'horizontal' ? this.cutWidth : 3,
      orientation === 'horizontal' ? 3 : this.cutHeight,
      0xffffff,
      0.9,
    );
    this.add(this.cutLine);

    this.scene.tweens.add({
      targets: this.cutLine,
      alpha: 0,
      duration: 180,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (this.cutLine) {
          this.cutLine.destroy();
          this.cutLine = null;
        }
      },
    });
  }

  getLocalCutPosition(orientation, start, end, bounds) {
    if (orientation === 'vertical') {
      const centerY = bounds.y + bounds.height / 2;
      const sampleY = Phaser.Math.Clamp(centerY, Math.min(start.y, end.y), Math.max(start.y, end.y));
      const progress = Math.abs(end.y - start.y) < 0.001
        ? 0.5
        : (sampleY - start.y) / (end.y - start.y);
      const localX = Phaser.Math.Linear(start.x, end.x, Phaser.Math.Clamp(progress, 0, 1));

      return Phaser.Math.Clamp(localX, bounds.left, bounds.right);
    }

    const centerX = bounds.x + bounds.width / 2;
    const sampleX = Phaser.Math.Clamp(centerX, Math.min(start.x, end.x), Math.max(start.x, end.x));
    const progress = Math.abs(end.x - start.x) < 0.001
      ? 0.5
      : (sampleX - start.x) / (end.x - start.x);
    const localY = Phaser.Math.Linear(start.y, end.y, Phaser.Math.Clamp(progress, 0, 1));

    return Phaser.Math.Clamp(localY, bounds.top, bounds.bottom);
  }

  getLocalCutRectangle() {
    const bounds = this.getLocalCropBounds();

    return new Phaser.Geom.Rectangle(
      bounds.left,
      bounds.top,
      bounds.right - bounds.left,
      bounds.bottom - bounds.top,
    );
  }

  getWorldCutBounds() {
    const bounds = this.getLocalCropBounds();
    const points = [
      this.localToCuttableWorldPoint({ x: bounds.left, y: bounds.top }),
      this.localToCuttableWorldPoint({ x: bounds.right, y: bounds.top }),
      this.localToCuttableWorldPoint({ x: bounds.right, y: bounds.bottom }),
      this.localToCuttableWorldPoint({ x: bounds.left, y: bounds.bottom }),
    ];
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));

    return new Phaser.Geom.Rectangle(
      minX,
      minY,
      maxX - minX,
      maxY - minY,
    );
  }

  worldToCuttableLocalPoint(point) {
    if (this.worldToLocalPoint) {
      return this.worldToLocalPoint(point);
    }

    const local = new Phaser.Math.Vector2();

    this.getWorldTransformMatrix().applyInverse(point.x, point.y, local);

    return local;
  }

  localToCuttableWorldPoint(point) {
    if (this.localToWorldPoint) {
      return this.localToWorldPoint(point);
    }

    const world = new Phaser.Math.Vector2();

    this.getWorldTransformMatrix().transformPoint(point.x, point.y, world);

    return world;
  }

  localVectorToCuttableWorldVector(vector) {
    if (this.localVectorToWorld) {
      return this.localVectorToWorld(vector);
    }

    const origin = this.localToCuttableWorldPoint({ x: 0, y: 0 });
    const end = this.localToCuttableWorldPoint(vector);

    return new Phaser.Math.Vector2(end.x - origin.x, end.y - origin.y);
  }

  copyCuttableRotationTo(object) {
    const rotation = this.rotation ?? 0;

    if (object.setObjectRotation) {
      object.setObjectRotation(rotation);
      return;
    }

    object.setRotation(rotation);
  }
}
