import * as Phaser from 'phaser/dist/phaser.esm.js';
import { IngredientObject } from './IngredientObject.js';
import { toHexColor } from './ProceduralTexture.js';

const PLATE_TEXTURE_WIDTH = 78;
const PLATE_TEXTURE_HEIGHT = 42;
const DEFAULT_MAX_FISH_WEIGHT_GRAMS = 12;

let plateTextureId = 0;

const PLATE_MATERIALS = {
  ceramic: {
    rimLight: 0xfffbef,
    rim: 0xe8dcc6,
    surface: 0xf5eddd,
    surfaceDark: 0xd9c9ad,
    foot: 0xbda989,
    accent: 0xffffff,
  },
  porcelain: {
    rimLight: 0xffffff,
    rim: 0xdde9ef,
    surface: 0xf3f9fb,
    surfaceDark: 0xc6d8df,
    foot: 0x9fb8c4,
    accent: 0x7fa8bc,
  },
  slate: {
    rimLight: 0x6d7474,
    rim: 0x3f4647,
    surface: 0x2b3031,
    surfaceDark: 0x171b1c,
    foot: 0x111414,
    accent: 0x9aa3a2,
  },
  bamboo: {
    rimLight: 0xf5dca2,
    rim: 0xd8aa64,
    surface: 0xe7c47e,
    surfaceDark: 0xb88345,
    foot: 0x8a6535,
    accent: 0xffedbd,
  },
  lacquer: {
    rimLight: 0xffd7c5,
    rim: 0xb83d34,
    surface: 0x8f2424,
    surfaceDark: 0x4d1417,
    foot: 0x2a0d10,
    accent: 0xffe1ad,
  },
};

const PLATE_PRESETS = {
  small: {
    displayName: 'Small Plate',
    pixelScale: 1.8,
    textureWidth: PLATE_TEXTURE_WIDTH,
    textureHeight: PLATE_TEXTURE_HEIGHT,
    capacityGrams: 90,
    weightGrams: 130,
    maxStackedItems: 4,
    stackOffsetY: -4,
    surfaceEllipse: { x: 39, y: 18, rx: 27, ry: 9 },
    hitbox: { width: 0.88, height: 0.58, offsetY: 2 },
    composition: { height: 0.72, offsetY: 5 },
    shadow: {
      restOffset: 5,
      edgeScaleX: 0.9,
      edgeScaleY: 0.36,
      coreScaleX: 0.78,
      coreScaleY: 0.3,
      footprintDepthFactor: 0.45,
    },
  },
  medium: {
    displayName: 'Plate',
    pixelScale: 2.25,
    textureWidth: PLATE_TEXTURE_WIDTH,
    textureHeight: PLATE_TEXTURE_HEIGHT,
    capacityGrams: 180,
    weightGrams: 210,
    maxStackedItems: 8,
    stackOffsetY: -6,
    surfaceEllipse: { x: 39, y: 18, rx: 31, ry: 10 },
    hitbox: { width: 0.9, height: 0.58, offsetY: 2 },
    composition: { height: 0.72, offsetY: 5 },
    shadow: {
      restOffset: 6,
      edgeScaleX: 0.96,
      edgeScaleY: 0.38,
      coreScaleX: 0.84,
      coreScaleY: 0.32,
      footprintDepthFactor: 0.46,
    },
  },
  large: {
    displayName: 'Large Plate',
    pixelScale: 2.8,
    textureWidth: PLATE_TEXTURE_WIDTH,
    textureHeight: PLATE_TEXTURE_HEIGHT,
    capacityGrams: 320,
    weightGrams: 330,
    maxStackedItems: 14,
    stackOffsetY: -8,
    surfaceEllipse: { x: 39, y: 18, rx: 34, ry: 11 },
    hitbox: { width: 0.92, height: 0.6, offsetY: 3 },
    composition: { height: 0.72, offsetY: 5 },
    shadow: {
      restOffset: 7,
      edgeScaleX: 1,
      edgeScaleY: 0.4,
      coreScaleX: 0.88,
      coreScaleY: 0.34,
      footprintDepthFactor: 0.48,
    },
  },
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function paletteFromOption(material) {
  if (typeof material === 'string' && PLATE_MATERIALS[material]) {
    return { ...PLATE_MATERIALS[material] };
  }

  if (material && typeof material === 'object') {
    return { ...PLATE_MATERIALS.ceramic, ...material };
  }

  return { ...PLATE_MATERIALS.ceramic };
}

function resolvePlatePreset(options = {}) {
  const presetName = options.preset ?? options.size ?? 'medium';
  const preset = PLATE_PRESETS[presetName] ?? PLATE_PRESETS.medium;
  const profile = options.profile ?? {};

  return {
    ...preset,
    ...profile,
    hitbox: { ...preset.hitbox, ...profile.hitbox },
    composition: { ...preset.composition, ...profile.composition },
    surfaceEllipse: { ...preset.surfaceEllipse, ...profile.surfaceEllipse },
    shadow: { ...preset.shadow, ...profile.shadow },
  };
}

export class Plate extends IngredientObject {
  constructor(scene, x, y, options = {}) {
    const profile = resolvePlatePreset(options);
    const pixelScale = options.pixelScale ?? options.scale ?? profile.pixelScale;
    const textureWidth = profile.textureWidth ?? PLATE_TEXTURE_WIDTH;
    const textureHeight = profile.textureHeight ?? PLATE_TEXTURE_HEIGHT;
    const displayWidth = textureWidth * pixelScale;
    const displayHeight = textureHeight * pixelScale;

    super(scene, x, y, displayWidth, displayHeight, {
      ...options,
      hasIngredientTraits: false,
      visualVariation: false,
    });

    this.plateProfile = profile;
    this.pixelScale = pixelScale;
    this.textureWidth = textureWidth;
    this.textureHeight = textureHeight;
    this.plateDisplayWidth = displayWidth;
    this.plateDisplayHeight = displayHeight;
    this.surfaceEllipse = profile.surfaceEllipse;
    this.displayName = options.displayName ?? profile.displayName;
    this.stackCategory = 'plate';
    this.acceptedStackCategories = options.acceptedStackCategories ?? ['fish', 'roll', 'rice', 'sushi'];
    this.maxStackedItems = options.maxStackedItems ?? profile.maxStackedItems;
    this.stackOffsetX = 0;
    this.stackOffsetY = options.stackOffsetY ?? profile.stackOffsetY;
    this.stackLocked = options.stackLocked ?? false;
    this.ownWeightGrams = options.weightGrams ?? profile.weightGrams;
    this.capacityGrams = options.capacityGrams ?? profile.capacityGrams;
    this.maxFishWeightGrams = options.maxFishWeightGrams
      ?? options.maxContentWeightGrams
      ?? DEFAULT_MAX_FISH_WEIGHT_GRAMS;
    this.isRotatable = false;
    this.restDepth = 12;
    this.softness = 0.18;
    this.restShadowOffset = profile.shadow.restOffset;
    this.dragShadowOffset = profile.shadow.restOffset;
    this.shadowEdgeScaleX = profile.shadow.edgeScaleX;
    this.shadowEdgeScaleY = profile.shadow.edgeScaleY;
    this.shadowCoreScaleX = profile.shadow.coreScaleX;
    this.shadowCoreScaleY = profile.shadow.coreScaleY;
    this.footprintDepthFactor = profile.shadow.footprintDepthFactor;
    this.preserveStackChildRotation = true;
    this.platePalette = paletteFromOption(options.material ?? options.color ?? options.palette ?? 'ceramic');
    this.textureKey = `plate-pixel-${plateTextureId}`;
    plateTextureId += 1;
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

  static get materials() {
    return PLATE_MATERIALS;
  }

  static get presets() {
    return PLATE_PRESETS;
  }

  get plateItems() {
    return (this.stackChildren ?? []).filter((child) => child?.isIngredient);
  }

  acceptsStackPlacement(other, placement = {}) {
    if (!super.acceptsStackPlacement(other, placement)) {
      return false;
    }

    return this.isPlateableItem(other) && this.getLocalSurfacePoint(other, placement) !== null;
  }

  getStackPlacementRejectionReason(other, placement = {}) {
    if (!this.isPlateableItem(other)) {
      return `plate accepts finished sushi or fish slices up to ${this.maxFishWeightGrams}g`;
    }

    return this.getLocalSurfacePoint(other, placement) ? 'stack OK' : 'outside plate';
  }

  isPlateableItem(child) {
    if (!child?.isIngredient || child.stackCategory === 'plate') {
      return false;
    }

    if (child.stackCategory === 'fish') {
      return this.isSmallFishSlice(child);
    }

    return child.isFinishedStack
      || child.stackCategory === 'roll'
      || child.stackCategory === 'sushi';
  }

  isSmallFishSlice(child) {
    const weight = child.ownWeightGrams ?? child.weightGrams;

    if (!Number.isFinite(weight) || weight > this.maxFishWeightGrams) {
      return false;
    }

    const width = child.textureWidth ?? child.pieces?.[0]?.cropWidth;
    const height = child.textureHeight ?? child.pieces?.[0]?.cropHeight;
    const sourceWidth = child.sourceTextureWidth ?? width;
    const sourceHeight = child.sourceTextureHeight ?? height;

    if (![width, height, sourceWidth, sourceHeight].every(Number.isFinite)) {
      return false;
    }

    return width < sourceWidth || height < sourceHeight;
  }

  getStackPlacementOffset(child, drop = {}) {
    return this.getLocalSurfacePoint(child, drop) ?? {
      x: this.stackOffsetX,
      y: this.stackOffsetY,
    };
  }

  getLocalSurfacePoint(child, drop = {}) {
    const dropX = drop.x ?? child?.x ?? this.x;
    const dropY = drop.y ?? child?.y ?? this.y;
    const localPoint = this.worldToLocalPoint({ x: dropX, y: dropY });
    const ellipseCenterX = 0;
    const ellipseCenterY = (this.surfaceEllipse.y - this.textureHeight / 2) * this.pixelScale;
    const radiusX = this.surfaceEllipse.rx * this.pixelScale * 0.9;
    const radiusY = this.surfaceEllipse.ry * this.pixelScale * 1.06;
    const dx = localPoint.x - ellipseCenterX;
    const dy = localPoint.y - ellipseCenterY;
    const normalized = (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY);

    if (normalized > 1.18) {
      return null;
    }

    const scale = normalized > 1 ? 1 / Math.sqrt(normalized) : 1;
    const itemCount = this.plateItems.length;
    const stagger = (itemCount % 2 === 0 ? -1 : 1) * Math.min(5, itemCount * 1.5);

    return {
      x: dx * scale * 0.82 + stagger,
      y: ellipseCenterY + dy * scale * 0.72 + this.stackOffsetY - itemCount * 1.5,
    };
  }

  getPlacementRectAt(x = this.x, y = this.y) {
    const width = this.surfaceEllipse.rx * this.pixelScale * 2;
    const height = this.surfaceEllipse.ry * this.pixelScale * 1.45;
    const centerOffsetY = (this.surfaceEllipse.y - this.textureHeight / 2) * this.pixelScale;

    return new Phaser.Geom.Rectangle(
      x - width / 2,
      y + centerOffsetY - height / 2,
      width,
      height,
    );
  }

  collectCompositionShadowParts(transform = {
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
  }) {
    return this.draggableParts.map((part) => (
      this.createTransformedShadowPart(part, transform)
    ));
  }

  shouldUseMergedStackShadow(lift) {
    return Boolean(
      lift > 0
      && this.stackChildren?.some((child) => child?.scene),
    );
  }

  showStackDragSourceShadows() {
    super.showStackDragSourceShadows();

    this.stackChildren?.forEach((child) => {
      this.setPlateChildShadowVisible(child, false);
    });
  }

  getWorldHitboxRect(centerX = this.x, centerY = this.y) {
    return new Phaser.Geom.Rectangle(
      centerX - this.plateDisplayWidth * 0.46,
      centerY - this.plateDisplayHeight * 0.18,
      this.plateDisplayWidth * 0.92,
      this.plateDisplayHeight * 0.36,
    );
  }

  handleStackChildAttached(child) {
    this.setPlateChildShadowVisible(child, false);
    child?.refreshCompositionShadow?.();
    this.refreshCompositionShadow?.();
  }

  handleStackChildDetached(child) {
    this.setPlateChildShadowVisible(child, true);
    child?.refreshCompositionShadow?.();
    this.refreshCompositionShadow?.();
  }

  setPlateChildShadowVisible(child, visible) {
    if (child?.shadow && child.shadow !== child.stackDragShadow) {
      child.shadow.setVisible(visible);
    }

    child?.stackChildren?.forEach((stackChild) => {
      this.setPlateChildShadowVisible(stackChild, visible);
    });
  }

  ensureTexture() {
    if (!this.scene.textures.exists(this.textureKey)) {
      this.scene.textures.createCanvas(this.textureKey, this.textureWidth, this.textureHeight);
    }

    this.refreshPlateTexture();
  }

  refreshPlateTexture() {
    const texture = this.scene.textures.get(this.textureKey);
    const context = texture?.getContext?.();

    if (!context) {
      return this;
    }

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, this.textureWidth, this.textureHeight);
    this.paintPlateTexture(context);
    texture.refresh();

    return this;
  }

  paintPlateTexture(context) {
    const palette = this.platePalette;
    const ellipse = this.surfaceEllipse;

    context.fillStyle = toHexColor(palette.foot);
    this.fillPixelEllipse(context, ellipse.x, ellipse.y + 9, ellipse.rx - 12, 2);

    context.fillStyle = toHexColor(palette.surfaceDark);
    this.fillPixelEllipse(context, ellipse.x, ellipse.y + 3, ellipse.rx + 4, ellipse.ry + 3);
    context.clearRect(ellipse.x - 1, ellipse.y + ellipse.ry + 6, 3, 1);

    context.fillStyle = toHexColor(palette.rim);
    this.fillPixelEllipse(context, ellipse.x, ellipse.y + 1, ellipse.rx + 3, ellipse.ry + 2);
    context.fillRect(ellipse.x - 4, ellipse.y - ellipse.ry - 1, 9, 1);

    context.fillStyle = toHexColor(palette.rimLight);
    this.strokePixelEllipse(context, ellipse.x, ellipse.y, ellipse.rx + 2, ellipse.ry + 3, 0.72, 1.1);

    context.fillStyle = toHexColor(palette.surface);
    this.fillPixelEllipse(context, ellipse.x, ellipse.y, ellipse.rx - 5, ellipse.ry - 1);

    context.fillStyle = toHexColor(this.mixColors(palette.surface, palette.surfaceDark, 0.28));
    this.strokePixelEllipse(context, ellipse.x, ellipse.y + 1, ellipse.rx - 11, Math.max(2, ellipse.ry - 4), 0.84, 1.14);
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

  strokePixelEllipse(context, centerX, centerY, radiusX, radiusY, min = 0.78, max = 1.14) {
    const radiusXSquared = radiusX * radiusX;
    const radiusYSquared = radiusY * radiusY;

    for (let y = Math.floor(centerY - radiusY); y <= Math.ceil(centerY + radiusY); y += 1) {
      for (let x = Math.floor(centerX - radiusX); x <= Math.ceil(centerX + radiusX); x += 1) {
        const dx = x - centerX;
        const dy = y - centerY;
        const value = (dx * dx) / radiusXSquared + (dy * dy) / radiusYSquared;

        if (value > min && value <= max) {
          context.fillRect(x, y, 1, 1);
        }
      }
    }
  }

  mixColors(first, second, amount) {
    const ratio = clamp(amount, 0, 1);
    const inverse = 1 - ratio;
    const r = Math.round(((first >> 16) & 0xff) * inverse + ((second >> 16) & 0xff) * ratio);
    const g = Math.round(((first >> 8) & 0xff) * inverse + ((second >> 8) & 0xff) * ratio);
    const b = Math.round((first & 0xff) * inverse + (second & 0xff) * ratio);

    return (r << 16) | (g << 8) | b;
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
