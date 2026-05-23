import * as Phaser from 'phaser/dist/phaser.esm.js';
import { COLORS } from '../game/constants.js';
import { IngredientObject } from './IngredientObject.js';
import { toHexColor } from './ProceduralTexture.js';

const PIXEL = 2.25;
const BOWL_TEXTURE_WIDTH = 60;
const BOWL_TEXTURE_HEIGHT = 38;
const BOWL_CAPACITY_GRAMS = 180;
const MAX_CONTENT_WEIGHT_GRAMS = 10;
const CONTENT_RIM_Y = 17;
const CONTENT_RIM_OVERFLOW = 3;
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

const VESSEL_PRESETS = {
  bowl: {
    displayName: 'Bowl',
    pixelScale: PIXEL,
    textureWidth: BOWL_TEXTURE_WIDTH,
    textureHeight: BOWL_TEXTURE_HEIGHT,
    capacityGrams: BOWL_CAPACITY_GRAMS,
    maxContentWeightGrams: MAX_CONTENT_WEIGHT_GRAMS,
    weightGrams: 120,
    stackOffsetY: -8,
    contentRimY: CONTENT_RIM_Y,
    contentRimOverflow: CONTENT_RIM_OVERFLOW,
    contentEllipse: CONTENT_ELLIPSE,
    hitbox: { width: 0.92, height: 0.76, offsetY: 6 },
    composition: { height: 0.82, offsetY: 5 },
    shadow: {
      restOffset: 7,
      edgeScaleX: 0.9,
      edgeScaleY: 0.48,
      coreScaleX: 0.8,
      coreScaleY: 0.4,
      footprintDepthFactor: 0.55,
    },
  },
  smallBowl: {
    displayName: 'Small Bowl',
    pixelScale: 1.65,
    textureWidth: BOWL_TEXTURE_WIDTH,
    textureHeight: BOWL_TEXTURE_HEIGHT,
    capacityGrams: 45,
    maxContentWeightGrams: 5,
    weightGrams: 45,
    stackOffsetY: -6,
    contentRimY: CONTENT_RIM_Y,
    contentRimOverflow: CONTENT_RIM_OVERFLOW,
    contentEllipse: CONTENT_ELLIPSE,
    hitbox: { width: 0.9, height: 0.72, offsetY: 5 },
    composition: { height: 0.82, offsetY: 4 },
    shadow: {
      restOffset: 5,
      edgeScaleX: 0.82,
      edgeScaleY: 0.42,
      coreScaleX: 0.72,
      coreScaleY: 0.34,
      footprintDepthFactor: 0.52,
    },
  },
  tinyCup: {
    displayName: 'Tiny Cup',
    pixelScale: 1.2,
    textureWidth: BOWL_TEXTURE_WIDTH,
    textureHeight: BOWL_TEXTURE_HEIGHT,
    capacityGrams: 18,
    maxContentWeightGrams: 3,
    weightGrams: 22,
    stackOffsetY: -4,
    contentRimY: CONTENT_RIM_Y,
    contentRimOverflow: 2,
    contentEllipse: { x: 30, y: 14, rx: 19, ry: 4 },
    hitbox: { width: 0.86, height: 0.68, offsetY: 4 },
    composition: { height: 0.78, offsetY: 3 },
    shadow: {
      restOffset: 4,
      edgeScaleX: 0.74,
      edgeScaleY: 0.36,
      coreScaleX: 0.64,
      coreScaleY: 0.3,
      footprintDepthFactor: 0.48,
    },
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
  wasabi: {
    base: 0x7fbf5b,
    light: 0xb8e282,
    dark: 0x426f32,
  },
  nikiri: {
    base: 0x4b2518,
    light: 0x9b5a35,
    dark: 0x21100b,
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

function resolveVesselPreset(options = {}) {
  const presetName = options.preset ?? options.type ?? 'bowl';
  const preset = VESSEL_PRESETS[presetName] ?? VESSEL_PRESETS.bowl;
  const profile = options.profile ?? {};

  return {
    ...preset,
    ...profile,
    hitbox: { ...preset.hitbox, ...profile.hitbox },
    composition: { ...preset.composition, ...profile.composition },
    contentEllipse: { ...preset.contentEllipse, ...profile.contentEllipse },
    shadow: { ...preset.shadow, ...profile.shadow },
  };
}

function normalizeFixedContents(contents) {
  if (!contents) {
    return null;
  }

  if (typeof contents === 'string') {
    return { style: contents, fullness: 0.7 };
  }

  return {
    style: contents.style ?? contents.type ?? 'mixed',
    fullness: clamp(contents.fullness ?? 0.7, 0, 1),
  };
}

export class ContainerVessel extends IngredientObject {
  constructor(scene, x, y, options = {}) {
    const profile = resolveVesselPreset(options);
    const pixelScale = options.pixelScale ?? options.scale ?? profile.pixelScale ?? PIXEL;
    const textureWidth = profile.textureWidth ?? BOWL_TEXTURE_WIDTH;
    const textureHeight = profile.textureHeight ?? BOWL_TEXTURE_HEIGHT;
    const displayWidth = textureWidth * pixelScale;
    const displayHeight = textureHeight * pixelScale;

    super(scene, x, y, displayWidth, displayHeight, {
      ...options,
      visualVariation: false,
    });

    this.vesselProfile = profile;
    this.pixelScale = pixelScale;
    this.textureWidth = textureWidth;
    this.textureHeight = textureHeight;
    this.vesselDisplayWidth = displayWidth;
    this.vesselDisplayHeight = displayHeight;
    this.contentEllipse = profile.contentEllipse;
    this.contentRimY = profile.contentRimY;
    this.contentRimOverflow = profile.contentRimOverflow;
    this.maxContentWeightGrams = options.maxContentWeightGrams ?? profile.maxContentWeightGrams;
    this.fixedContents = normalizeFixedContents(options.contents ?? options.content);
    this.displayName = options.displayName ?? profile.displayName;
    this.isRotatable = false;
    this.stackCategory = 'bowl';
    this.acceptedStackCategories = options.acceptedStackCategories ?? ['rice', 'fish', 'nori'];
    this.maxStackedItems = options.maxStackedItems ?? 10;
    this.stackLocked = true;
    this.stackOffsetX = 0;
    this.stackOffsetY = options.stackOffsetY ?? profile.stackOffsetY;
    this.ownWeightGrams = options.weightGrams ?? profile.weightGrams;
    this.capacityGrams = options.capacityGrams ?? profile.capacityGrams;
    this.restDepth = 16;
    this.softness = 0.25;
    this.restShadowOffset = profile.shadow.restOffset;
    this.dragShadowOffset = profile.shadow.restOffset;
    this.shadowEdgeScaleX = profile.shadow.edgeScaleX;
    this.shadowEdgeScaleY = profile.shadow.edgeScaleY;
    this.shadowCoreScaleX = profile.shadow.coreScaleX;
    this.shadowCoreScaleY = profile.shadow.coreScaleY;
    this.footprintDepthFactor = profile.shadow.footprintDepthFactor;
    this.preserveStackChildRotation = true;
    this.bowlPalette = paletteFromOption(options.color ?? options.palette ?? options.material ?? 'blue');
    this.textureKey = `container-vessel-pixel-${bowlTextureId}`;
    bowlTextureId += 1;
    this.ensureTexture();

    this.sprite = scene.add.image(0, 0, this.textureKey);
    this.sprite.setScale(pixelScale);
    this.sprite.setOrigin(0.5);
    this.sprite.compositionWidth = displayWidth;
    this.sprite.compositionHeight = displayHeight * profile.composition.height;
    this.sprite.compositionOffsetY = profile.composition.offsetY;

    this.setCenteredHitbox(
      displayWidth * profile.hitbox.width,
      displayHeight * profile.hitbox.height,
      0,
      profile.hitbox.offsetY,
    );
    this.addDraggablePart(this.sprite);
    this.refreshCompositionShadow();
    this.applyRestingDepth();
  }

  static get palettes() {
    return BOWL_PALETTES;
  }

  static get presets() {
    return VESSEL_PRESETS;
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
    const fixed = this.fixedContents?.fullness ?? 0;

    return clamp(Math.max(byWeight, byCount, fixed), 0, 1);
  }

  acceptsStackPlacement(other, placement = {}) {
    if (!super.acceptsStackPlacement(other, placement)) {
      return false;
    }

    return this.isSmallCutIngredient(other) && this.getLocalContentPoint(other, placement) !== null;
  }

  getStackPlacementRejectionReason(other, placement = {}) {
    if (!this.isSmallCutIngredient(other)) {
      return `ingredient must be a cut piece up to ${this.maxContentWeightGrams}g`;
    }

    return this.getLocalContentPoint(other, placement) ? 'stack OK' : 'outside bowl';
  }

  isSmallCutIngredient(child) {
    if (!child?.isIngredient || child.stackCategory === 'bowl') {
      return false;
    }

    const width = child.textureWidth ?? child.pieces?.[0]?.cropWidth;
    const height = child.textureHeight ?? child.pieces?.[0]?.cropHeight;
    const sourceWidth = child.sourceTextureWidth ?? width;
    const sourceHeight = child.sourceTextureHeight ?? height;

    if (![width, height, sourceWidth, sourceHeight].every(Number.isFinite)) {
      return false;
    }

    const wasCut = width < sourceWidth || height < sourceHeight;
    const weight = child.ownWeightGrams ?? child.weightGrams;

    return wasCut && Number.isFinite(weight) && weight <= this.maxContentWeightGrams;
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
    const ellipseCenterY = (this.contentEllipse.y - this.textureHeight / 2) * this.pixelScale;
    const radiusX = this.contentEllipse.rx * this.pixelScale * 0.94;
    const radiusY = this.contentEllipse.ry * this.pixelScale * 1.3;
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
    const width = this.contentEllipse.rx * this.pixelScale * 2;
    const height = this.contentEllipse.ry * this.pixelScale * 1.45;
    const centerOffsetY = (this.contentEllipse.y - this.textureHeight / 2) * this.pixelScale + 2;

    return new Phaser.Geom.Rectangle(
      x - width / 2,
      y + centerOffsetY - height / 2,
      width,
      height,
    );
  }

  getWorldHitboxRect(centerX = this.x, centerY = this.y) {
    return new Phaser.Geom.Rectangle(
      centerX - this.vesselDisplayWidth * 0.46,
      centerY - this.vesselDisplayHeight * 0.22,
      this.vesselDisplayWidth * 0.92,
      this.vesselDisplayHeight * 0.48,
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
      this.scene.textures.createCanvas(this.textureKey, this.textureWidth, this.textureHeight);
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
    context.clearRect(0, 0, this.textureWidth, this.textureHeight);
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
    const ellipse = this.contentEllipse;

    context.fillStyle = toHexColor(basin);
    this.fillPixelEllipse(context, ellipse.x, ellipse.y, ellipse.rx, ellipse.ry + 2);

    context.fillStyle = toHexColor(innerBand);
    this.fillPixelEllipse(context, ellipse.x, ellipse.y + 1, Math.max(1, ellipse.rx - 4), Math.max(1, ellipse.ry - 1));
  }

  paintContents(context) {
    const fullness = this.getFullness();

    if (fullness <= 0) {
      const interiorLine = this.mixColors(this.bowlPalette.rim, this.bowlPalette.body, 0.28);

      context.fillStyle = toHexColor(interiorLine);
      this.strokePixelEllipse(context, this.contentEllipse.x, this.contentEllipse.y + 1, this.contentEllipse.rx - 5, this.contentEllipse.ry - 1);
      return;
    }

    const styles = this.getContentStyles();
    const mixed = this.mixContentStyles(styles);
    const surfaceY = this.contentRimY - Math.round(1 + fullness * 5);
    const radiusX = Math.round((this.contentEllipse.rx - 6) * Phaser.Math.Linear(0.72, 1, fullness));
    const radiusY = Math.max(2, Math.round((this.contentEllipse.ry - 1) * Phaser.Math.Linear(0.7, 1.05, fullness)));
    const frontY = this.getFrontRimBottomY();

    context.fillStyle = toHexColor(mixed.base);
    this.fillContentBasin(context, surfaceY, frontY, radiusX);
    this.fillPixelEllipse(context, this.contentEllipse.x, surfaceY, radiusX, radiusY);

    styles.forEach((style, index) => {
      const color = index % 2 === 0 ? style.light : style.dark;
      const y = surfaceY - Math.floor(radiusY / 2) + 1 + index;
      const rowHalfWidth = this.getEllipseHalfWidth(surfaceY, radiusX - 3, radiusY, y);
      const startX = this.contentEllipse.x - rowHalfWidth + 3 + (index % 3) * 3;

      context.fillStyle = toHexColor(color);
      for (let x = startX; x < this.contentEllipse.x + rowHalfWidth - 3; x += 7) {
        context.fillRect(x, y, 2, 1);
      }
    });
  }

  fillContentMass(context, centerX, surfaceY, bottomY, halfWidth) {
    const topY = Math.min(surfaceY, bottomY);
    const lowerY = Math.max(surfaceY, bottomY);
    const height = Math.max(1, lowerY - topY);

    for (let y = topY; y <= lowerY; y += 1) {
      const progress = (y - topY) / height;
      const capNarrowing = y === topY ? 3 : y === topY + 1 ? 1 : 0;
      const rowHalfWidth = Math.round(halfWidth + progress * 2) - capNarrowing;

      context.fillRect(centerX - rowHalfWidth, y, rowHalfWidth * 2, 1);
    }
  }

  mixContentStyles(styles) {
    const palette = styles.length ? styles : [INGREDIENT_CONTENT_STYLES.mixed];
    const averageColor = (key) => {
      const totals = palette.reduce((sum, style) => ({
        r: sum.r + ((style[key] >> 16) & 0xff),
        g: sum.g + ((style[key] >> 8) & 0xff),
        b: sum.b + (style[key] & 0xff),
      }), { r: 0, g: 0, b: 0 });
      const count = palette.length;

      return (Math.round(totals.r / count) << 16)
        | (Math.round(totals.g / count) << 8)
        | Math.round(totals.b / count);
    };

    return {
      base: averageColor('base'),
      light: averageColor('light'),
      dark: averageColor('dark'),
    };
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

    if (this.fixedContents?.style) {
      seen.add(this.fixedContents.style);
      styles.push(INGREDIENT_CONTENT_STYLES[this.fixedContents.style] ?? INGREDIENT_CONTENT_STYLES.mixed);
    }

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
    this.fillBowlFrontBody(context, palette);
  }

  fillContentBasin(context, surfaceY, frontY, maxHalfWidth) {
    const ellipse = this.contentEllipse;
    const openingRadiusY = ellipse.ry + 2;
    const topY = Math.min(surfaceY, frontY);
    const bottomY = Math.max(surfaceY, frontY);

    for (let y = topY; y <= bottomY; y += 1) {
      const openingHalfWidth = this.getEllipseHalfWidth(ellipse.y, ellipse.rx - 4, openingRadiusY, y);
      const fillProgress = bottomY === topY ? 1 : (y - topY) / (bottomY - topY);
      const halfWidth = Math.min(
        maxHalfWidth,
        Math.max(1, Math.round(openingHalfWidth * Phaser.Math.Linear(0.82, 1, fillProgress))),
      );

      context.fillRect(ellipse.x - halfWidth, y, halfWidth * 2, 1);
    }
  }

  fillBowlFrontBody(context, palette) {
    const ellipse = this.contentEllipse;
    const centerX = ellipse.x;
    const topY = ellipse.y;
    const rimBottomY = this.getFrontRimBottomY();
    const bottomY = 31;
    const lowerHeight = Math.max(1, bottomY - rimBottomY);
    const rimRadiusX = ellipse.rx + 1;
    const rimRadiusY = ellipse.ry;

    for (let y = topY; y <= bottomY; y += 1) {
      const lowerProgress = clamp((y - rimBottomY) / lowerHeight, 0, 1);
      const belly = Math.sin(lowerProgress * Math.PI) * 2.5;
      const halfWidth = Math.round(rimRadiusX - lowerProgress * 11 + belly);
      const rowColor = lowerProgress > 0.72 ? palette.bodyDark : palette.body;

      context.fillStyle = toHexColor(rowColor);

      for (let x = centerX - halfWidth; x < centerX + halfWidth; x += 1) {
        const rimCurveY = this.getLowerEllipseYForX(centerX, topY, rimRadiusX, rimRadiusY, x);

        if (y < rimCurveY) {
          continue;
        }

        context.fillRect(x, y, 1, 1);
      }

      if (lowerProgress > 0.08 && lowerProgress < 0.72) {
        context.fillStyle = toHexColor(this.mixColors(palette.body, palette.bodyDark, 0.34));
        context.fillRect(centerX - halfWidth, y, 2, 1);
        context.fillRect(centerX + halfWidth - 2, y, 2, 1);
      }
    }

    context.fillStyle = toHexColor(this.mixColors(palette.body, palette.rim, 0.22));
    this.fillLowerEllipseBand(context, centerX, rimBottomY, 21, 3, 1);
  }

  paintFrontRim(context, palette) {
    const ellipse = this.contentEllipse;

    context.fillStyle = toHexColor(palette.rim);
    this.fillLowerEllipseBand(context, ellipse.x, ellipse.y + 1, ellipse.rx + 1, ellipse.ry, 1);

    context.fillStyle = toHexColor(palette.rimLight);
    this.strokePixelEllipseArc(context, ellipse.x, ellipse.y, ellipse.rx, ellipse.ry + 1, ellipse.y);
  }

  getFrontRimBottomY() {
    return this.contentEllipse.y + this.contentEllipse.ry;
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

  strokePixelEllipse(context, centerX, centerY, radiusX, radiusY) {
    const radiusXSquared = radiusX * radiusX;
    const radiusYSquared = radiusY * radiusY;

    for (let y = Math.floor(centerY - radiusY); y <= Math.ceil(centerY + radiusY); y += 1) {
      for (let x = Math.floor(centerX - radiusX); x <= Math.ceil(centerX + radiusX); x += 1) {
        const dx = x - centerX;
        const dy = y - centerY;
        const value = (dx * dx) / radiusXSquared + (dy * dy) / radiusYSquared;

        if (value > 0.72 && value <= 1.12) {
          context.fillRect(x, y, 1, 1);
        }
      }
    }
  }

  strokePixelEllipseArc(context, centerX, centerY, radiusX, radiusY, minY = -Infinity) {
    const radiusXSquared = radiusX * radiusX;
    const radiusYSquared = radiusY * radiusY;

    for (let y = Math.floor(centerY - radiusY); y <= Math.ceil(centerY + radiusY); y += 1) {
      if (y < minY) {
        continue;
      }

      for (let x = Math.floor(centerX - radiusX); x <= Math.ceil(centerX + radiusX); x += 1) {
        const dx = x - centerX;
        const dy = y - centerY;
        const value = (dx * dx) / radiusXSquared + (dy * dy) / radiusYSquared;

        if (value > 0.78 && value <= 1.14) {
          context.fillRect(x, y, 1, 1);
        }
      }
    }
  }

  fillLowerEllipseBand(context, centerX, centerY, radiusX, radiusY, thickness) {
    for (let y = centerY; y <= Math.ceil(centerY + radiusY); y += 1) {
      const outerHalfWidth = this.getEllipseHalfWidth(centerY, radiusX, radiusY, y);
      const innerHalfWidth = this.getEllipseHalfWidth(
        centerY,
        Math.max(1, radiusX - thickness),
        Math.max(1, radiusY - thickness),
        y,
      );

      if (outerHalfWidth <= 0) {
        continue;
      }

      context.fillRect(centerX - outerHalfWidth, y, Math.max(1, outerHalfWidth - innerHalfWidth), 1);
      context.fillRect(centerX + innerHalfWidth, y, Math.max(1, outerHalfWidth - innerHalfWidth), 1);

      if (y >= centerY + radiusY - thickness) {
        context.fillRect(centerX - outerHalfWidth, y, outerHalfWidth * 2, 1);
      }
    }
  }

  getEllipseHalfWidth(centerY, radiusX, radiusY, y) {
    const dy = (y - centerY) / radiusY;

    if (Math.abs(dy) > 1) {
      return 0;
    }

    return Math.max(1, Math.round(radiusX * Math.sqrt(1 - dy * dy)));
  }

  getLowerEllipseYForX(centerX, centerY, radiusX, radiusY, x) {
    const dx = (x - centerX) / radiusX;

    if (Math.abs(dx) >= 1) {
      return centerY;
    }

    return Math.round(centerY + radiusY * Math.sqrt(1 - dx * dx));
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

export class Bowl extends ContainerVessel {
  constructor(scene, x, y, options = {}) {
    super(scene, x, y, {
      preset: 'bowl',
      ...options,
    });
  }
}
