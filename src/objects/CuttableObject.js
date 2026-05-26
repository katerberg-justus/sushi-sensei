import * as Phaser from 'phaser/dist/phaser.esm.js';
import { SceneObject } from './SceneObject.js';

const visibleBoundsCache = new Map();
const visiblePixelCountCache = new Map();
const MIN_CUTTABLE_STROKE_COVERAGE = 0.8;

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
    this.sourceTextureWidth = options.sourceTextureWidth ?? textureWidth;
    this.sourceTextureHeight = options.sourceTextureHeight ?? textureHeight;
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

    if (!options.skipInitialPiece) {
      this.addPiece(0, 0, textureWidth, textureHeight);
    }
    this.setDepth(this.cutDepth);
  }

  static setupCuttable(target, textureKey, textureWidth, textureHeight, pixelScale = 1, options = {}) {
    target.textureKey = textureKey;
    target.cropOriginX = 0;
    target.cropOriginY = 0;
    target.textureWidth = textureWidth;
    target.textureHeight = textureHeight;
    target.sourceTextureWidth = options.sourceTextureWidth ?? target.sourceTextureWidth ?? textureWidth;
    target.sourceTextureHeight = options.sourceTextureHeight ?? target.sourceTextureHeight ?? textureHeight;
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

    if (!options.skipInitialPiece) {
      target.addPiece(0, 0, textureWidth, textureHeight);
    }
    target.setDepth(target.cutDepth);

    if (target.refreshCuttableGeometry) {
      target.refreshCuttableGeometry();
    }
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

    const orientation = Math.abs(localDx) >= Math.abs(localDy) ? 'horizontal' : 'vertical';

    if (!this.allowedCutOrientations.has(orientation)) {
      return false;
    }

    const bounds = this.getLocalCutRectangle();
    const clippedStroke = this.clipStrokeToLocalBounds(startLocal, endLocal, bounds);

    if (!clippedStroke || !this.hasEnoughStrokeCoverage(orientation, clippedStroke, bounds)) {
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

  clipStrokeToLocalBounds(start, end, bounds) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    let entry = 0;
    let exit = 1;
    const edges = [
      [-dx, start.x - bounds.left],
      [dx, bounds.right - start.x],
      [-dy, start.y - bounds.top],
      [dy, bounds.bottom - start.y],
    ];

    for (const [direction, distance] of edges) {
      if (Math.abs(direction) < 0.0001) {
        if (distance < 0) {
          return null;
        }
        continue;
      }

      const progress = distance / direction;

      if (direction < 0) {
        entry = Math.max(entry, progress);
      } else {
        exit = Math.min(exit, progress);
      }

      if (entry > exit) {
        return null;
      }
    }

    return {
      start: new Phaser.Math.Vector2(
        Phaser.Math.Linear(start.x, end.x, entry),
        Phaser.Math.Linear(start.y, end.y, entry),
      ),
      end: new Phaser.Math.Vector2(
        Phaser.Math.Linear(start.x, end.x, exit),
        Phaser.Math.Linear(start.y, end.y, exit),
      ),
    };
  }

  hasEnoughStrokeCoverage(orientation, clippedStroke, bounds) {
    const coverage = orientation === 'horizontal'
      ? Math.abs(clippedStroke.end.x - clippedStroke.start.x)
      : Math.abs(clippedStroke.end.y - clippedStroke.start.y);
    const required = (orientation === 'horizontal' ? bounds.width : bounds.height)
      * MIN_CUTTABLE_STROKE_COVERAGE;

    return coverage >= required;
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

      const parentVisibleBounds = piece.visibleBounds ?? this.getPieceVisibleTextureBounds(piece);

      piece.visibleBounds = parentVisibleBounds;

      const buildPiece = (cropX, cropY, cropWidth, cropHeight) => this.createPieceData(
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        this.intersectVisibleBounds(parentVisibleBounds, cropX, cropY, cropWidth, cropHeight),
      );

      if (orientation === 'horizontal') {
        cutPieces = [
          buildPiece(piece.cropX, piece.cropY, piece.cropWidth, split),
          buildPiece(piece.cropX, piece.cropY + split, piece.cropWidth, piece.cropHeight - split),
        ];
      } else {
        cutPieces = [
          buildPiece(piece.cropX, piece.cropY, split, piece.cropHeight),
          buildPiece(piece.cropX + split, piece.cropY, piece.cropWidth - split, piece.cropHeight),
        ];
      }

      this.assignCutPieceWeights(cutPieces);

      return true;
    });

    if (!cutPieces) {
      return false;
    }

    const replacements = cutPieces.map((piece) => this.createCuttableFromPiece(piece));

    replacements.forEach((object) => {
      object.setDepth(this.depth);
    });
    this.donateRenderArtifactsTo(replacements, orientation);
    this.separateCuttableObjects(replacements, orientation, localPosition);

    return replacements;
  }

  donateRenderArtifactsTo(children, orientation) {
    const skipShadeCommit = orientation === 'vertical';

    const baseDelay = 110;
    const stagger = 40;

    children.forEach((child, index) => {
      if (child.borrowComputedShadeFrom) {
        child.borrowComputedShadeFrom(this);
      }

      if (child.borrowCompositionShadowFrom) {
        child.borrowCompositionShadowFrom(this);
      }

      if (skipShadeCommit) {
        child.skipDeferredComputedShadeRefresh = true;
      }

      const scene = child.scene;

      if (!scene) {
        if (child.commitDeferredRenderArtifacts) {
          child.commitDeferredRenderArtifacts();
        }
        return;
      }

      scene.time.delayedCall(baseDelay + index * stagger, () => {
        if (!child.scene || !child.active) {
          return;
        }

        if (child.commitDeferredRenderArtifacts) {
          child.commitDeferredRenderArtifacts();
        }
      });
    });
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

    object.deferComputedShadeRefresh = true;
    object.deferCompositionShadowRefresh = true;

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
    if (this.japaneseName) {
      object.setJapaneseName?.(this.japaneseName);
    }
    this.copyCuttableRotationTo(object);

    return object;
  }

  createReplacementCuttable(position, piece) {
    if (this.addDraggablePart && this.constructor !== CuttableObject) {
      const visualVariation = this.getIngredientVisualVariation?.();
      const options = {
        ...this.getIngredientTraitOptions?.(),
        cropX: piece.cropX,
        cropY: piece.cropY,
        cropWidth: piece.cropWidth,
        cropHeight: piece.cropHeight,
        visibleBounds: piece.visibleBounds,
        weightGrams: piece.weightGrams,
        minimumCutWidth: this.minimumCutWidth,
        variant: this.variantIndex,
        skipInitialPiece: true,
        sourceTextureWidth: this.sourceTextureWidth ?? this.textureWidth,
        sourceTextureHeight: this.sourceTextureHeight ?? this.textureHeight,
      };

      if (visualVariation) {
        options.visualVariation = visualVariation;
      }

      if (this.fishType) {
        options.fishType = this.fishType;
      }

      if (this.fishSubtype) {
        options.fishSubtype = this.fishSubtype;
      }

      if (this.canFlipFish) {
        options.isFishBottomUp = this.isFishBottomUp;
      }

      if (this.getCuttableReplacementOptions) {
        Object.assign(options, this.getCuttableReplacementOptions(piece));
      }

      return new this.constructor(this.scene, position.x, position.y, options);
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
        skipInitialPiece: true,
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
    this.sourceTextureWidth = options.sourceTextureWidth ?? this.sourceTextureWidth ?? piece.cropWidth;
    this.sourceTextureHeight = options.sourceTextureHeight ?? this.sourceTextureHeight ?? piece.cropHeight;
    this.cutWidth = piece.cropWidth * this.pixelScale;
    this.cutHeight = piece.cropHeight * this.pixelScale;
    this.minimumCutWidth = options.minimumCutWidth ?? this.minimumCutWidth;
    this.minSwipeDistance = options.minSwipeDistance ?? this.minSwipeDistance;
    this.cutDepth = options.cutDepth ?? this.cutDepth;
    this.cutGap = options.cutGap ?? this.cutGap;
    this.allowedCutOrientations = new Set(options.allowedCutOrientations ?? this.allowedCutOrientations);
    this.pieces = [this.createPieceData(
      piece.cropX,
      piece.cropY,
      piece.cropWidth,
      piece.cropHeight,
      piece.visibleBounds,
    )];
    this.setAnchorToPieceVisibleCenter(this.pieces[0]);
    this.pieces[0].image = this.createPieceImage(this.pieces[0]);
    this.registerCuttablePart(this.pieces[0].image);
    this.applyFishSurfaceState?.(this.isFishBottomUp);
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

  createPieceData(cropX, cropY, cropWidth, cropHeight, visibleBounds = null) {
    const piece = {
      cropX,
      cropY,
      cropWidth,
      cropHeight,
    };

    if (visibleBounds) {
      piece.visibleBounds = visibleBounds;
    }

    return piece;
  }

  assignCutPieceWeights(pieces) {
    if (!Array.isArray(pieces) || !pieces.length || !Number.isFinite(this.ownWeightGrams)) {
      return pieces;
    }

    const visiblePixelCounts = pieces.map((piece) => this.getPieceVisiblePixelCount(piece));
    const totalVisiblePixels = visiblePixelCounts.reduce((sum, count) => sum + count, 0);
    const fallbackArea = pieces.reduce(
      (sum, piece) => sum + piece.cropWidth * piece.cropHeight,
      0,
    );
    const parentWeight = this.ownWeightGrams;

    pieces.forEach((piece, index) => {
      const proportion = totalVisiblePixels > 0
        ? visiblePixelCounts[index] / totalVisiblePixels
        : (piece.cropWidth * piece.cropHeight) / fallbackArea;

      piece.weightGrams = parentWeight * proportion;
    });

    return pieces;
  }

  intersectVisibleBounds(parentBounds, cropX, cropY, cropWidth, cropHeight) {
    if (!parentBounds) {
      return null;
    }

    const left = Math.max(parentBounds.left, cropX);
    const right = Math.min(parentBounds.right, cropX + cropWidth);
    const top = Math.max(parentBounds.top, cropY);
    const bottom = Math.min(parentBounds.bottom, cropY + cropHeight);

    if (right <= left || bottom <= top) {
      return {
        left: cropX,
        right: cropX + cropWidth,
        top: cropY,
        bottom: cropY + cropHeight,
      };
    }

    return { left, right, top, bottom };
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
    if (piece.visibleBounds) {
      return piece.visibleBounds;
    }

    const cacheKey = `${this.textureKey}|${piece.cropX},${piece.cropY},${piece.cropWidth},${piece.cropHeight}`;
    const cached = visibleBoundsCache.get(cacheKey);

    if (cached) {
      piece.visibleBounds = cached;
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
    piece.visibleBounds = bounds;

    return bounds;
  }

  getPieceVisiblePixelCount(piece) {
    if (Number.isFinite(piece.visiblePixelCount)) {
      return piece.visiblePixelCount;
    }

    const cacheKey = `${this.textureKey}|${piece.cropX},${piece.cropY},${piece.cropWidth},${piece.cropHeight}`;
    const cached = visiblePixelCountCache.get(cacheKey);

    if (cached !== undefined) {
      piece.visiblePixelCount = cached;
      return cached;
    }

    const texture = this.scene.textures.get(this.textureKey);
    const source = texture?.getSourceImage?.();
    const supportsCanvasElement = typeof HTMLCanvasElement !== 'undefined';
    const canvas = supportsCanvasElement && source instanceof HTMLCanvasElement
      ? source
      : supportsCanvasElement && source?.canvas instanceof HTMLCanvasElement
        ? source.canvas
        : null;

    if (!canvas) {
      const fallbackCount = piece.cropWidth * piece.cropHeight;

      visiblePixelCountCache.set(cacheKey, fallbackCount);
      piece.visiblePixelCount = fallbackCount;
      return fallbackCount;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      const fallbackCount = piece.cropWidth * piece.cropHeight;

      visiblePixelCountCache.set(cacheKey, fallbackCount);
      piece.visiblePixelCount = fallbackCount;
      return fallbackCount;
    }

    const bounds = piece.visibleBounds ?? this.getPieceVisibleTextureBounds(piece);
    const left = Math.max(piece.cropX, Math.floor(bounds.left));
    const right = Math.min(piece.cropX + piece.cropWidth, Math.ceil(bounds.right));
    const top = Math.max(piece.cropY, Math.floor(bounds.top));
    const bottom = Math.min(piece.cropY + piece.cropHeight, Math.ceil(bounds.bottom));

    if (right <= left || bottom <= top) {
      visiblePixelCountCache.set(cacheKey, 0);
      piece.visiblePixelCount = 0;
      return 0;
    }

    const width = right - left;
    const height = bottom - top;
    const imageData = context.getImageData(left, top, width, height);
    let visiblePixels = 0;

    for (let index = 3; index < imageData.data.length; index += 4) {
      if (imageData.data[index] > 0) {
        visiblePixels += 1;
      }
    }

    visiblePixelCountCache.set(cacheKey, visiblePixels);
    piece.visiblePixelCount = visiblePixels;

    return visiblePixels;
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
    const rotation = this.getCuttableWorldRotation();

    if (object.setObjectRotation) {
      object.setObjectRotation(rotation);
      return;
    }

    object.setRotation(rotation);
  }

  getCuttableWorldRotation() {
    let rotation = this.rotation ?? 0;
    let parent = this.parentContainer;

    while (parent) {
      rotation += parent.rotation ?? 0;
      parent = parent.parentContainer;
    }

    return rotation;
  }
}
