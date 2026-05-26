import * as Phaser from 'phaser/dist/phaser.esm.js';
import { COLORS } from '../game/constants.js';
import { IngredientObject } from './IngredientObject.js';
import { JAPANESE_NAMES } from './JapaneseNames.js';
import { Nigiri } from './Nigiri.js';
import { getCachedFullImageData, resolveVariantTexture, toHexColor } from './ProceduralTexture.js';

const PIXEL = 1.8;
const RICE_BALL_BASE_KEY = 'rice-ball-pixel';
const RICE_BALL_VARIANT_POOL = 6;
const RICE_BALL_WIDTH = 30;
const RICE_BALL_HEIGHT = 26;
const RICE_BALL_WEIGHT_GRAMS = 20;
const visibleTextureBoundsCache = new Map();

export class RiceBall extends IngredientObject {
  constructor(scene, x, y, options = {}) {
    const { textureKey, variantIndex } = resolveVariantTexture(scene, RICE_BALL_BASE_KEY, options, {
      width: RICE_BALL_WIDTH,
      height: RICE_BALL_HEIGHT,
      pool: RICE_BALL_VARIANT_POOL,
      paint: RiceBall.paintTexture,
      shapeNoise: { chipChance: 0.026, bumpChance: 0.018 },
    });

    super(scene, x, y, 54, 46, {
      ...options,
      japaneseName: options.japaneseName ?? JAPANESE_NAMES.riceBall,
    });
    this.setCenteredHitbox(54, 46, 0, 3);
    this.ownWeightGrams = options.weightGrams ?? RICE_BALL_WEIGHT_GRAMS;
    this.variantIndex = variantIndex;
    this.computedShadePixelSize = 1;
    this.computedShadeBottomProfileSmoothing = 2;

    this.stackCategory = 'rice';
    this.acceptedStackCategories = ['fish'];
    this.maxStackedItems = 1;
    this.stackOffsetX = 0;
    this.stackOffsetY = -10;
    this.kneadableStackCategory = 'fish';
    this.guidedKneadStrokes = true;
    this.finishedStackDisplayName = 'Nigiri';

    this.sprite = scene.add.image(0, 0, textureKey);
    this.sprite.setScale(PIXEL);
    this.sprite.setOrigin(0.5);

    this.addDraggablePart(this.sprite);
    this.refreshCompositionShadow();
    this.applyRestingDepth();
  }

  getPlacementRectAt(x = this.x, y = this.y) {
    const bounds = RiceBall.getVisibleTextureBounds(this.scene, this.sprite?.texture?.key);

    if (!bounds || !this.sprite) {
      return super.getPlacementRectAt(x, y);
    }

    const frameWidth = this.sprite.frame?.realWidth ?? RICE_BALL_WIDTH;
    const frameHeight = this.sprite.frame?.realHeight ?? RICE_BALL_HEIGHT;
    const scaleX = Math.abs(this.sprite.scaleX || PIXEL);
    const scaleY = Math.abs(this.sprite.scaleY || PIXEL);
    const basePosition = this.draggablePartBasePositions?.get(this.sprite) ?? { x: 0, y: 0 };
    const visibleWidth = (bounds.right - bounds.left) * scaleX;
    const visibleHeight = (bounds.bottom - bounds.top) * scaleY;
    const visibleCenterX = (bounds.left + (bounds.right - bounds.left) / 2 - frameWidth / 2) * scaleX;
    const visibleBottom = (bounds.bottom - frameHeight / 2) * scaleY;
    const width = visibleWidth * this.shadowEdgeDragScaleX;
    const height = visibleHeight * this.shadowEdgeDragScaleY;
    const centerX = x + basePosition.x + visibleCenterX;
    const bottom = y + basePosition.y + visibleBottom;
    const centerY = bottom - height / 2 + this.restShadowOffset;

    return new Phaser.Geom.Rectangle(
      centerX - width / 2,
      centerY - height / 2,
      width,
      height,
    );
  }

  acceptsStackPlacement(other, placement = {}) {
    if (!super.acceptsStackPlacement(other, placement)) {
      return false;
    }

    if (other?.fishType === 'shrimp' && !other.isPeeled) {
      return false;
    }

    return this.fishSizeFitsRice(other);
  }

  getStackPlacementRejectionReason(other, placement = {}) {
    if (other?.fishType === 'shrimp' && !other.isPeeled) {
      return 'peel shrimp before placing on rice';
    }

    if (other?.stackCategory === 'fish' && !this.fishSizeFitsRice(other)) {
      return 'fish piece must be within 35% of rice ball size';
    }

    return super.getStackPlacementRejectionReason?.(other, placement) ?? 'stack OK';
  }

  fishSizeFitsRice(other) {
    if (other?.stackCategory !== 'fish' || typeof other.getPlacementRectAt !== 'function') {
      return true;
    }

    const riceSize = this.getVisibleSize();
    const fishRect = other.getPlacementRectAt();

    if (!riceSize || !fishRect || riceSize.width <= 0 || riceSize.height <= 0) {
      return true;
    }

    const widthRatio = fishRect.width / riceSize.width;
    const heightRatio = fishRect.height / riceSize.height;

    return widthRatio >= 0.65 && widthRatio <= 1.35
      && heightRatio >= 0.65 && heightRatio <= 1.35;
  }

  getVisibleSize() {
    const bounds = RiceBall.getVisibleTextureBounds(this.scene, this.sprite?.texture?.key);

    if (!bounds || !this.sprite) {
      return null;
    }

    const scaleX = Math.abs(this.sprite.scaleX || PIXEL);
    const scaleY = Math.abs(this.sprite.scaleY || PIXEL);

    return {
      width: (bounds.right - bounds.left) * scaleX,
      height: (bounds.bottom - bounds.top) * scaleY,
    };
  }

  static getVisibleTextureBounds(scene, textureKey) {
    if (!scene || !textureKey) {
      return null;
    }

    if (visibleTextureBoundsCache.has(textureKey)) {
      return visibleTextureBoundsCache.get(textureKey);
    }

    const texture = scene.textures.get(textureKey);
    const source = texture?.getSourceImage?.();
    const cachedImageData = getCachedFullImageData(source);
    let imageData = cachedImageData;

    if (!imageData) {
      const canvas = source?.getContext ? source : source?.canvas;
      const context = canvas?.getContext?.('2d', { willReadFrequently: true });

      if (!context) {
        return null;
      }

      imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    }

    const { data, width, height } = imageData;
    let left = width;
    let right = -1;
    let top = height;
    let bottom = -1;

    for (let py = 0; py < height; py += 1) {
      for (let px = 0; px < width; px += 1) {
        if (data[(py * width + px) * 4 + 3] === 0) {
          continue;
        }

        left = Math.min(left, px);
        right = Math.max(right, px + 1);
        top = Math.min(top, py);
        bottom = Math.max(bottom, py + 1);
      }
    }

    const bounds = right >= left && bottom >= top
      ? { left, right, top, bottom }
      : null;

    visibleTextureBoundsCache.set(textureKey, bounds);
    return bounds;
  }

  createKneadedStackResult(topping) {
    if (topping?.stackCategory !== 'fish') {
      return null;
    }

    if (topping?.fishType === 'shrimp' && !topping.isPeeled) {
      return null;
    }

    const cuttableObjects = this.scene.cuttableObjects;
    const cuttableIndex = Array.isArray(cuttableObjects) ? cuttableObjects.indexOf(topping) : -1;

    if (cuttableIndex !== -1) {
      cuttableObjects.splice(cuttableIndex, 1);
    }

    const fishType = topping.fishType ?? 'salmon';
    const toppingTags = typeof topping.gatherStackFlavorTags === 'function'
      ? topping.gatherStackFlavorTags()
      : (topping.flavorTags ?? []);
    const flavorTags = IngredientObject.unionFlavorTags(this.flavorTags, toppingTags);
    const nigiri = new Nigiri(this.scene, this.x, this.y, {
      fishType,
      fishSubtype: topping.fishSubtype ?? null,
      weightGrams: this.weightGrams,
      variant: topping.variantIndex ?? this.variantIndex,
      flavorTags,
    });

    nigiri.setObjectRotation(this.rotation ?? 0);

    return nigiri;
  }

  static paintTexture(context, rng) {
    const jitter = (range) => Math.floor(rng() * (range * 2 + 1)) - range;

    context.fillStyle = toHexColor(COLORS.riceStroke);
    context.fillRect(10, 4, 10, 3);
    context.fillRect(7, 6, 17, 3);
    context.fillRect(5, 8, 21, 4);
    context.fillRect(3, 11, 25, 7);
    context.fillRect(4, 18, 23, 3);
    context.fillRect(7, 21, 17, 2);
    context.fillRect(11, 23, 9, 1);

    context.fillRect(8, 5, 13, 3);
    context.fillRect(6, 8, 18, 4);
    context.fillRect(5, 12, 20, 6);
    context.fillRect(7, 18, 15, 3);

    context.fillStyle = toHexColor(COLORS.riceWhite);
    context.fillRect(9, 6, 11, 3);
    context.fillRect(7, 9, 17, 5);
    context.fillRect(6, 13, 18, 5);
    context.fillRect(8, 18, 13, 2);

    context.fillStyle = toHexColor(0xf9f4e6);
    context.fillRect(10, 6, 8, 2);
    context.fillRect(8, 9, 13, 4);
    context.fillRect(7, 13, 14, 4);

    context.fillStyle = toHexColor(COLORS.riceWhite);
    context.fillRect(11, 6, 6, 1);
    context.fillRect(9, 10, 6, 2);
    context.fillRect(16, 11, 5, 2);

    context.fillStyle = toHexColor(COLORS.riceLight);
    context.fillRect(24, 10, 2, 7);
    context.fillRect(22, 17, 3, 3);
    context.fillRect(17, 20, 6, 2);
    context.fillRect(10, 22, 10, 1);

    const grainAnchors = [
      { x: 10, y: 8 },
      { x: 18, y: 9 },
      { x: 13, y: 14 },
      { x: 20, y: 15 },
      { x: 9, y: 18 },
    ];
    grainAnchors.forEach((anchor) => {
      if (rng() < 0.15) {
        return;
      }
      const ox = jitter(1);
      const oy = jitter(1);

      context.fillStyle = toHexColor(COLORS.riceGrain);
      context.fillRect(anchor.x + ox, anchor.y + oy, 2, 1);
    });

    context.fillStyle = toHexColor(0xfffaef);
    for (let i = 0; i < 4; i += 1) {
      if (rng() < 0.5) {
        continue;
      }
      const sx = 8 + Math.floor(rng() * 14);
      const sy = 8 + Math.floor(rng() * 10);

      context.fillRect(sx, sy, 1, 1);
    }
  }
}
