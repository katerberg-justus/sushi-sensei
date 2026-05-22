import { COLORS } from '../game/constants.js';
import { IngredientObject } from './IngredientObject.js';
import { resolveVariantTexture, toHexColor } from './ProceduralTexture.js';

const PIXEL = 1.8;
const RICE_BALL_BASE_KEY = 'rice-ball-pixel';
const RICE_BALL_VARIANT_POOL = 6;
const RICE_BALL_WIDTH = 30;
const RICE_BALL_HEIGHT = 26;
const TOPPING_SIZE_TOLERANCE = 0.25;

export class RiceBall extends IngredientObject {
  constructor(scene, x, y, options = {}) {
    const { textureKey, variantIndex } = resolveVariantTexture(scene, RICE_BALL_BASE_KEY, options, {
      width: RICE_BALL_WIDTH,
      height: RICE_BALL_HEIGHT,
      pool: RICE_BALL_VARIANT_POOL,
      paint: RiceBall.paintTexture,
    });

    super(scene, x, y, 54, 46);
    this.setCenteredHitbox(54, 46, 0, 3);
    this.variantIndex = variantIndex;
    this.computedShadePixelSize = 1;
    this.computedShadeBottomProfileSmoothing = 2;

    this.acceptedStackCategories = ['fish'];
    this.maxStackedItems = 1;
    this.stackOffsetX = 0;
    this.stackOffsetY = -5;

    this.sprite = scene.add.image(0, 0, textureKey);
    this.sprite.setScale(PIXEL);
    this.sprite.setOrigin(0.5);

    this.addDraggablePart(this.sprite);
    this.refreshCompositionShadow();
    this.applyRestingDepth();
  }

  acceptsStackPlacement(other, placement = {}) {
    if (other.stackCategory !== 'fish') {
      return true;
    }

    const targetRect = placement.targetRect ?? this.getWorldHitboxRect?.();
    const sourceRect = placement.sourceRect ?? other.getWorldHitboxRect?.(placement.x, placement.y);

    if (!targetRect || !sourceRect) {
      return false;
    }

    const minSizeRatio = 1 - TOPPING_SIZE_TOLERANCE;
    const maxSizeRatio = 1 + TOPPING_SIZE_TOLERANCE;
    const widthRatio = sourceRect.width / targetRect.width;
    const heightRatio = sourceRect.height / targetRect.height;

    if (
      widthRatio < minSizeRatio
      || widthRatio > maxSizeRatio
      || heightRatio < minSizeRatio
      || heightRatio > maxSizeRatio
    ) {
      return false;
    }

    const sourceCenterX = sourceRect.centerX ?? sourceRect.x + sourceRect.width / 2;
    const sourceCenterY = sourceRect.centerY ?? sourceRect.y + sourceRect.height / 2;
    const targetCenterX = targetRect.centerX ?? targetRect.x + targetRect.width / 2;
    const targetCenterY = targetRect.centerY ?? targetRect.y + targetRect.height / 2;
    const maxHorizontalDistance = targetRect.width * TOPPING_SIZE_TOLERANCE;
    const maxVerticalDistance = targetRect.height * TOPPING_SIZE_TOLERANCE;

    return Math.abs(sourceCenterX - targetCenterX) <= maxHorizontalDistance
      && Math.abs(sourceCenterY - targetCenterY) <= maxVerticalDistance;
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
