import * as Phaser from 'phaser/dist/phaser.esm.js';
import { IngredientObject } from './IngredientObject.js';
import { JAPANESE_NAMES } from './JapaneseNames.js';

const BRUSH_KEY = 'brush-pixel';
const BRUSH_SHADOW_KEY = 'brush-shadow-pixel';
const PIXEL = 2.2;
const BRUSH_TEXTURE_WIDTH = 7;
const BRUSH_TEXTURE_HEIGHT = 22;
const BRUSH_TIP_LOCAL_X = 0;
const BRUSH_TIP_LOCAL_Y = 8 * PIXEL;

export class Brush extends IngredientObject {
  constructor(scene, x, y, options = {}) {
    Brush.createTextures(scene);

    const displayWidth = BRUSH_TEXTURE_WIDTH * PIXEL;
    const displayHeight = BRUSH_TEXTURE_HEIGHT * PIXEL;

    super(scene, x, y, displayWidth, displayHeight, {
      ...options,
      hasIngredientTraits: options.hasIngredientTraits ?? false,
      japaneseName: options.japaneseName ?? JAPANESE_NAMES.nikiriBrush,
      visualVariation: false,
    });

    this.isRotatable = false;
    this.isBrush = true;
    this.isTool = true;
    this.keepInteractiveInStack = true;
    this.displayName = options.displayName ?? 'Nikiri Brush';
    this.stackCategory = 'tool';
    this.acceptedStackCategories = [];
    this.maxStackedItems = 0;
    this.ownWeightGrams = options.weightGrams ?? 18;
    this.restDepth = 40;
    this.softness = 0.35;
    this.restShadowOffset = 4;
    this.dragShadowOffset = 10;
    this.brushTipOffset = new Phaser.Math.Vector2(BRUSH_TIP_LOCAL_X, BRUSH_TIP_LOCAL_Y);
    this.minBrushStrokeDistance = 10;
    this.lastBrushPoint = null;

    const shadow = scene.add.image(0, this.restShadowOffset, BRUSH_SHADOW_KEY);
    shadow.setScale(PIXEL * 0.95, PIXEL * 0.55);
    shadow.setOrigin(0.5);
    shadow.setAlpha(0.4);
    shadow.setTint(0x6f5d48);
    this.setPixelShadow(shadow);

    this.sprite = scene.add.image(0, 0, BRUSH_KEY);
    this.sprite.setScale(PIXEL);
    this.sprite.setOrigin(0.5);
    this.addDraggablePart(this.sprite);

    this.setCenteredHitbox(displayWidth, displayHeight);
    this.refreshCompositionShadow?.();
    this.applyRestingDepth();

    this.isDipped = false;
  }

  setDipped(active) {
    this.isDipped = Boolean(active);
  }

  handleDragStart(pointer) {
    const wasOnNikiri = this.stackParent?.fixedContents?.style === 'nikiri';

    if (!super.handleDragStart(pointer)) {
      return false;
    }

    if (wasOnNikiri) {
      this.setDipped(true);
    }
    this.lastBrushPoint = this.getBrushPoint();
    return true;
  }

  beginManualDrag(pointer) {
    const wasOnNikiri = this.stackParent?.fixedContents?.style === 'nikiri';

    if (!super.beginManualDrag(pointer)) {
      return false;
    }

    if (wasOnNikiri) {
      this.setDipped(true);
    }
    this.lastBrushPoint = this.getBrushPoint();
    return true;
  }

  handleDrag(pointer, dragX, dragY) {
    const wasDragging = this.isDragging;
    const previous = wasDragging ? (this.lastBrushPoint || this.getBrushPoint()) : null;

    if (!super.handleDrag(pointer, dragX, dragY)) {
      return false;
    }

    if (!wasDragging) {
      this.lastBrushPoint = this.getBrushPoint();
      return true;
    }

    const next = this.getBrushPoint();
    const distance = Phaser.Math.Distance.Between(previous.x, previous.y, next.x, next.y);

    if (distance >= this.minBrushStrokeDistance) {
      this.emit('brushstroke', { brush: this, start: previous, end: next });
      this.lastBrushPoint = next;
    }

    return true;
  }

  handleDragEnd(pointer) {
    const ended = super.handleDragEnd(pointer);
    this.lastBrushPoint = null;
    return ended;
  }

  getBrushPoint() {
    if (this.localToWorldPoint) {
      return this.localToWorldPoint({ x: this.brushTipOffset.x, y: this.brushTipOffset.y });
    }

    return new Phaser.Math.Vector2(this.x + this.brushTipOffset.x, this.y + this.brushTipOffset.y);
  }

  static createTextures(scene) {
    if (!scene.textures.exists(BRUSH_KEY)) {
      Brush.createBrushTexture(scene);
    }

    if (!scene.textures.exists(BRUSH_SHADOW_KEY)) {
      Brush.createShadowTexture(scene);
    }
  }

  static createBrushTexture(scene) {
    const width = BRUSH_TEXTURE_WIDTH;
    const height = BRUSH_TEXTURE_HEIGHT;
    const texture = scene.textures.createCanvas(BRUSH_KEY, width, height);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);

    context.fillStyle = '#6e3f24';
    context.fillRect(2, 1, 3, 11);
    context.fillStyle = '#a16b43';
    context.fillRect(2, 1, 1, 10);
    context.fillStyle = '#4e2c1a';
    context.fillRect(4, 1, 1, 11);

    context.fillStyle = '#7a8086';
    context.fillRect(1, 12, 5, 2);
    context.fillStyle = '#cdd3d6';
    context.fillRect(1, 12, 5, 1);
    context.fillStyle = '#4d5256';
    context.fillRect(1, 13, 5, 1);

    context.fillStyle = '#8a4f26';
    context.fillRect(1, 14, 5, 6);
    context.fillStyle = '#a8693d';
    context.fillRect(2, 14, 1, 6);
    context.fillRect(4, 14, 1, 6);

    context.fillStyle = '#3d1d0e';
    context.fillRect(1, 14, 1, 6);
    context.fillRect(3, 14, 1, 6);
    context.fillRect(5, 14, 1, 6);

    context.fillStyle = '#d39060';
    context.fillRect(2, 14, 1, 1);

    texture.refresh();
  }

  static createShadowTexture(scene) {
    const width = BRUSH_TEXTURE_WIDTH;
    const height = BRUSH_TEXTURE_HEIGHT;
    const texture = scene.textures.createCanvas(BRUSH_SHADOW_KEY, width, height);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);

    context.fillStyle = '#ffffff';
    context.fillRect(2, 2, 3, 10);
    context.fillRect(1, 12, 5, 2);
    context.fillRect(1, 14, 5, 6);

    texture.refresh();
  }
}
