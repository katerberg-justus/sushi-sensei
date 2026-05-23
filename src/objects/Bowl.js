import * as Phaser from 'phaser/dist/phaser.esm.js';
import { COLORS } from '../game/constants.js';
import { IngredientObject } from './IngredientObject.js';
import { toHexColor } from './ProceduralTexture.js';

const PIXEL = 2.25;
const BOWL_TEXTURE_WIDTH = 60;
const BOWL_TEXTURE_HEIGHT = 38;
const BOWL_DISPLAY_WIDTH = BOWL_TEXTURE_WIDTH * PIXEL;
const BOWL_DISPLAY_HEIGHT = BOWL_TEXTURE_HEIGHT * PIXEL;
const BOWL_CAPACITY_GRAMS = 180;
const CONTENT_ELLIPSE = {
  x: 30,
  y: 14,
  rx: 23,
  ry: 5,
};

let bowlTextureId = 0;

const BOWL_PALETTES = {
  blue: {
    rimLight: 0xd8eef2,
    rim: 0xa8cfda,
    body: 0x6fa8bf,
    bodyDark: 0x3f7890,
    foot: 0x2f5f72,
    accent: 0xffffff,
  },
  red: {
    rimLight: 0xffe0d7,
    rim: 0xe8a193,
    body: 0xc7584d,
    bodyDark: 0x8f312d,
    foot: 0x6e2727,
    accent: 0xfff3d7,
  },
  green: {
    rimLight: 0xdff1df,
    rim: 0xa8d0a6,
    body: 0x6fa66e,
    bodyDark: 0x417742,
    foot: 0x2d5b31,
    accent: 0xf5ffe8,
  },
  black: {
    rimLight: 0xe5e0d8,
    rim: 0x8a8379,
    body: 0x3b3b3f,
    bodyDark: 0x1f2024,
    foot: 0x15161a,
    accent: 0xf2dec2,
  },
  cream: {
    rimLight: 0xfff4dd,
    rim: 0xe9d2a8,
    body: 0xd8b978,
    bodyDark: 0xa6814b,
    foot: 0x7d633d,
    accent: 0xffffff,
  },
};

const INGREDIENT_CONTENT_STYLES = {
  rice: {
    base: COLORS.riceWhite,
    light: COLORS.riceHighlight,
    dark: COLORS.riceGrain,
  },
  nori: {
    base: 0x18372e,
    light: 0x2d5d4a,
    dark: 0x0b1a16,
  },
  tamago: {
    base: 0xf4ca61,
    light: 0xfadf85,
    dark: 0xd89c38,
  },
  salmon: {
    base: COLORS.salmon,
    light: 0xffd7c7,
    dark: COLORS.salmonStroke,
  },
  maguro: {
    base: 0xb93446,
    light: 0xe98e96,
    dark: 0x7f2231,
  },
  hamachi: {
    base: 0xf1c49d,
    light: 0xffead0,
    dark: 0xd69b72,
  },
  tai: {
    base: 0xf4ddd7,
    light: 0xffffff,
    dark: 0xd7ada7,
  },
  unagi: {
    base: 0x8b4d2c,
    light: 0xd89154,
    dark: 0x4c2418,
  },
  mixed: {
    base: 0xd8c8a8,
    light: 0xfff4df,
    dark: 0x9c8261,
  },
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function paletteFromOption(color) {
  if (typeof color === 'string' && BOWL_PALETTES[color]) {
    return { ...BOWL_PALETTES[color] };
  }

  if (color && typeof color === 'object') {
    return { ...BOWL_PALETTES.blue, ...color };
  }

  return { ...BOWL_PALETTES.blue };
}

export class Bowl extends IngredientObject {
  constructor(scene, x, y, options = {}) {
    super(scene, x, y, BOWL_DISPLAY_WIDTH, BOWL_DISPLAY_HEIGHT, {
      ...options,
      visualVariation: false,
    });

    this.displayName = options.displayName ?? 'Bowl';
    this.isRotatable = false;
    this.stackCategory = 'bowl';
    this.acceptedStackCategories = options.acceptedStackCategories ?? ['rice', 'fish', 'nori'];
    this.maxStackedItems = options.maxStackedItems ?? 10;
    this.stackOffsetX = 0;
    this.stackOffsetY = -8;
    this.ownWeightGrams = options.weightGrams ?? 120;
    this.capacityGrams = options.capacityGrams ?? BOWL_CAPACITY_GRAMS;
    this.restDepth = 16;
    this.softness = 0.25;
    this.restShadowOffset = 7;
    this.dragShadowOffset = 7;
    this.shadowEdgeScaleX = 0.9;
    this.shadowEdgeScaleY = 0.48;
    this.shadowCoreScaleX = 0.8;
    this.shadowCoreScaleY = 0.4;
    this.footprintDepthFactor = 0.55;
    this.preserveStackChildRotation = true;
    this.bowlPalette = paletteFromOption(options.color ?? options.palette ?? 'blue');
    this.textureKey = `bowl-pixel-${bowlTextureId}`;
    bowlTextureId += 1;
    this.ensureTexture();

    this.sprite = scene.add.image(0, 0, this.textureKey);
    this.sprite.setScale(PIXEL);
    this.sprite.setOrigin(0.5);
    this.sprite.compositionWidth = BOWL_DISPLAY_WIDTH;
    this.sprite.compositionHeight = BOWL_DISPLAY_HEIGHT * 0.82;
    this.sprite.compositionOffsetY = 5;

    this.setCenteredHitbox(BOWL_DISPLAY_WIDTH * 0.92, BOWL_DISPLAY_HEIGHT * 0.76, 0, 6);
    this.addDraggablePart(this.sprite);
    this.refreshCompositionShadow();
    this.applyRestingDepth();
  }

  static get palettes() {
    return BOWL_PALETTES;
  }

  get contentItems() {
    return (this.stackChildren ?? []).filter((child) => child?.isIngredient);
  }

  getFullness() {
    const contentsWeight = this.contentItems.reduce(
      (sum, child) => sum + (child?.weightGrams ?? 0),
      0,
    );
    const byWeight = contentsWeight / this.capacityGrams;
    const byCount = this.contentItems.length / this.maxStackedItems;

    return clamp(Math.max(byWeight, byCount), 0, 1);
  }

  acceptsStackPlacement(other, placement = {}) {
    if (!super.acceptsStackPlacement(other, placement)) {
      return false;
    }

    return this.getLocalContentPoint(other, placement) !== null;
  }

  getStackPlacementRejectionReason(other, placement = {}) {
    return this.getLocalContentPoint(other, placement) ? 'stack OK' : 'outside bowl';
  }

  getStackPlacementOffset(child, drop = {}) {
    const local = this.getLocalContentPoint(child, drop);

    if (!local) {
      return { x: this.stackOffsetX, y: this.stackOffsetY };
    }

    return local;
  }

  getLocalContentPoint(child, drop = {}) {
    const dropX = drop.x ?? child?.x ?? this.x;
    const dropY = drop.y ?? child?.y ?? this.y;
    const localPoint = this.worldToLocalPoint({ x: dropX, y: dropY });
    const ellipseCenterX = 0;
    const ellipseCenterY = (CONTENT_ELLIPSE.y - BOWL_TEXTURE_HEIGHT / 2) * PIXEL;
    const radiusX = CONTENT_ELLIPSE.rx * PIXEL * 0.94;
    const radiusY = CONTENT_ELLIPSE.ry * PIXEL * 1.3;
    const dx = localPoint.x - ellipseCenterX;
    const dy = localPoint.y - ellipseCenterY;
    const normalized = (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY);

    if (normalized > 1.2) {
      return null;
    }

    const scale = normalized > 1 ? 1 / Math.sqrt(normalized) : 1;

    return {
      x: dx * scale * 0.72,
      y: ellipseCenterY + dy * scale * 0.55 + this.stackOffsetY,
    };
  }

  getPlacementRectAt(x = this.x, y = this.y) {
    const width = CONTENT_ELLIPSE.rx * PIXEL * 2;
    const height = CONTENT_ELLIPSE.ry * PIXEL * 1.45;
    const centerOffsetY = (CONTENT_ELLIPSE.y - BOWL_TEXTURE_HEIGHT / 2) * PIXEL + 2;

    return new Phaser.Geom.Rectangle(
      x - width / 2,
      y + centerOffsetY - height / 2,
      width,
      height,
    );
  }

  getWorldHitboxRect(centerX = this.x, centerY = this.y) {
    return new Phaser.Geom.Rectangle(
      centerX - BOWL_DISPLAY_WIDTH * 0.46,
      centerY - BOWL_DISPLAY_HEIGHT * 0.22,
      BOWL_DISPLAY_WIDTH * 0.92,
      BOWL_DISPLAY_HEIGHT * 0.48,
    );
  }

  handleStackChildAttached(child) {
    this.setChildSunkInBowl(child, true);
    this.refreshBowlTexture();
    this.refreshCompositionShadow?.();
  }

  handleStackChildDetached(child) {
    this.setChildSunkInBowl(child, false);
    this.refreshBowlTexture();
    this.refreshCompositionShadow?.();
  }

  setChildSunkInBowl(child, active) {
    if (!child) {
      return;
    }

    if (active) {
      child.bowlStoredAlpha ??= child.alpha ?? 1;
      child.bowlStoredScale ??= { x: child.scaleX ?? 1, y: child.scaleY ?? 1 };
      child.bowlStoredVisible ??= child.visible ?? true;
      child.bowlStoredShadowVisible ??= child.shadow?.visible ?? true;
      child.bowlStoredCompositionFlags = (child.draggableParts ?? []).map((part) => ({
        part,
        excludeFromCompositionShadow: part.excludeFromCompositionShadow,
      }));
      child.bowlStoredCompositionFlags.forEach(({ part }) => {
        part.excludeFromCompositionShadow = true;
      });
      child.setVisible?.(false);
      child.shadow?.setVisible?.(false);
      return;
    }

    if (child.bowlStoredVisible !== undefined) {
      child.setVisible?.(child.bowlStoredVisible);
      child.bowlStoredVisible = undefined;
    }

    if (child.bowlStoredShadowVisible !== undefined) {
      child.shadow?.setVisible?.(child.bowlStoredShadowVisible);
      child.bowlStoredShadowVisible = undefined;
    }

    if (child.bowlStoredCompositionFlags) {
      child.bowlStoredCompositionFlags.forEach(({ part, excludeFromCompositionShadow }) => {
        part.excludeFromCompositionShadow = excludeFromCompositionShadow;
      });
      child.bowlStoredCompositionFlags = undefined;
    }

    if (child.bowlStoredAlpha !== undefined) {
      child.setAlpha?.(child.bowlStoredAlpha);
      child.bowlStoredAlpha = undefined;
    }

    if (child.bowlStoredScale) {
      child.setScale?.(child.bowlStoredScale.x, child.bowlStoredScale.y);
      child.bowlStoredScale = undefined;
    }
  }

  ensureTexture() {
    if (!this.scene.textures.exists(this.textureKey)) {
      this.scene.textures.createCanvas(this.textureKey, BOWL_TEXTURE_WIDTH, BOWL_TEXTURE_HEIGHT);
    }

    this.refreshBowlTexture();
  }

  refreshBowlTexture() {
    const texture = this.scene.textures.get(this.textureKey);
    const context = texture?.getContext?.();

    if (!context) {
      return this;
    }

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, BOWL_TEXTURE_WIDTH, BOWL_TEXTURE_HEIGHT);
    this.paintBowlTexture(context);
    texture.refresh();

    return this;
  }

  paintBowlTexture(context) {
    const palette = this.bowlPalette;

    this.paintInterior(context, palette);
    this.paintContents(context);
    this.paintFrontWall(context, palette);
    this.paintFrontRim(context, palette);
    this.paintFoot(context, palette);
  }

  paintInterior(context, palette) {
    const basin = this.mixColors(palette.rim, palette.body, 0.4);
    const innerBand = this.mixColors(palette.rim, palette.body, 0.18);

    context.fillStyle = toHexColor(basin);
    context.fillRect(12, 10, 36, 2);
    context.fillRect(8, 12, 44, 2);
    context.fillRect(6, 14, 48, 3);

    context.fillStyle = toHexColor(innerBand);
    context.fillRect(11, 12, 38, 1);
    context.fillRect(9, 14, 42, 1);
  }

  paintContents(context) {
    const fullness = this.getFullness();

    if (fullness <= 0) {
      const interiorLine = this.mixColors(this.bowlPalette.rim, this.bowlPalette.body, 0.28);

      context.fillStyle = toHexColor(interiorLine);
      context.fillRect(11, 13, 38, 1);
      context.fillRect(9, 15, 42, 1);
      return;
    }

    const styles = this.getContentStyles();
    const dominant = styles[0] ?? INGREDIENT_CONTENT_STYLES.mixed;
    const topY = Math.round(16 - fullness * 4);
    const halfWidth = Math.round(14 + fullness * 9);
    const halfHeight = Math.round(2 + fullness * 4);

    context.fillStyle = toHexColor(dominant.base);
    this.fillPixelEllipse(context, CONTENT_ELLIPSE.x, topY, halfWidth, halfHeight);
  }

  mixColors(first, second, amount) {
    const ratio = clamp(amount, 0, 1);
    const inverse = 1 - ratio;
    const r = Math.round(((first >> 16) & 0xff) * inverse + ((second >> 16) & 0xff) * ratio);
    const g = Math.round(((first >> 8) & 0xff) * inverse + ((second >> 8) & 0xff) * ratio);
    const b = Math.round((first & 0xff) * inverse + (second & 0xff) * ratio);

    return (r << 16) | (g << 8) | b;
  }

  getContentStyles() {
    const styles = [];
    const seen = new Set();

    this.contentItems.forEach((child) => {
      const key = this.getContentStyleKey(child);

      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      styles.push(INGREDIENT_CONTENT_STYLES[key] ?? INGREDIENT_CONTENT_STYLES.mixed);
    });

    return styles.length ? styles : [INGREDIENT_CONTENT_STYLES.mixed];
  }

  getContentStyleKey(child) {
    if (child?.fishType) {
      return child.fishType;
    }

    if (child?.stackCategory === 'rice') {
      return 'rice';
    }

    if (child?.stackCategory === 'nori') {
      return 'nori';
    }

    return child?.stackCategory ?? 'mixed';
  }

  paintFrontWall(context, palette) {
    context.fillStyle = toHexColor(palette.body);
    context.fillRect(6, 16, 48, 2);
    context.fillRect(9, 16, 42, 9);
    context.fillRect(12, 25, 36, 4);
    context.fillRect(17, 29, 26, 2);
    context.fillRect(6, 18, 4, 5);
    context.fillRect(50, 18, 4, 5);
  }

  paintFrontRim(context, palette) {
    context.fillStyle = toHexColor(palette.rim);
    context.fillRect(6, 14, 48, 2);
    context.fillRect(7, 16, 46, 1);
    context.fillRect(10, 16, 40, 2);
    context.fillRect(15, 18, 30, 1);
  }

  paintFoot(context, palette) {
    context.fillStyle = toHexColor(palette.foot);
    context.fillRect(21, 32, 18, 2);
    context.fillRect(24, 34, 12, 1);
  }

  fillPixelEllipse(context, centerX, centerY, radiusX, radiusY) {
    for (let y = Math.floor(centerY - radiusY); y <= Math.ceil(centerY + radiusY); y += 1) {
      for (let x = Math.floor(centerX - radiusX); x <= Math.ceil(centerX + radiusX); x += 1) {
        const dx = (x - centerX) / radiusX;
        const dy = (y - centerY) / radiusY;

        if (dx * dx + dy * dy <= 1) {
          context.fillRect(x, y, 1, 1);
        }
      }
    }
  }

  destroy(fromScene) {
    const textureKey = this.textureKey;
    const scene = this.scene;

    super.destroy(fromScene);

    if (textureKey && scene?.textures?.exists(textureKey)) {
      scene.textures.remove(textureKey);
    }
  }
}
