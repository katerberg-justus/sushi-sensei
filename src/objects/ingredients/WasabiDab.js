import { IngredientObject } from '../base/IngredientObject.js';
import { JAPANESE_NAMES } from '../JapaneseNames.js';
import { toHexColor } from '../ProceduralTexture.js';

const PIXEL = 1.7;
const WASABI_KEY = 'wasabi-dab-pixel';
const WASABI_WIDTH = 18;
const WASABI_HEIGHT = 14;
const WASABI_WEIGHT_GRAMS = 1.4;

export class WasabiDab extends IngredientObject {
  constructor(scene, x, y, options = {}) {
    WasabiDab.ensureTexture(scene);

    const displayWidth = WASABI_WIDTH * PIXEL;
    const displayHeight = WASABI_HEIGHT * PIXEL;

    super(scene, x, y, displayWidth, displayHeight, {
      ...options,
      japaneseName: options.japaneseName ?? JAPANESE_NAMES.wasabi,
    });

    this.displayName = options.displayName ?? 'Wasabi';
    this.ownWeightGrams = options.weightGrams ?? WASABI_WEIGHT_GRAMS;
    this.stackCategory = 'wasabi';
    this.acceptedStackCategories = [];
    this.maxStackedItems = 0;
    this.restDepth = 18;
    this.softness = 0.8;
    this.restShadowOffset = 1;
    this.dragShadowOffset = 4;
    this.shadowEdgeScaleX = 0.74;
    this.shadowEdgeScaleY = 0.42;
    this.shadowCoreScaleX = 0.64;
    this.shadowCoreScaleY = 0.34;
    this.textureKey = WASABI_KEY;

    this.sprite = scene.add.image(0, 0, WASABI_KEY);
    this.sprite.setOrigin(0.5);
    this.sprite.setScale(PIXEL);
    this.sprite.compositionWidth = displayWidth * 0.84;
    this.sprite.compositionHeight = displayHeight * 0.68;
    this.sprite.compositionOffsetY = 1;

    this.setCenteredHitbox(displayWidth * 0.86, displayHeight * 0.7, 0, 1);
    this.addDraggablePart(this.sprite);
    this.refreshCompositionShadow();
    this.applyRestingDepth();
  }

  static ensureTexture(scene) {
    if (scene.textures.exists(WASABI_KEY)) {
      return;
    }

    const texture = scene.textures.createCanvas(WASABI_KEY, WASABI_WIDTH, WASABI_HEIGHT);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, WASABI_WIDTH, WASABI_HEIGHT);
    WasabiDab.paintTexture(context);
    texture.refresh();
  }

  static paintTexture(context) {
    context.fillStyle = toHexColor(0x426f32);
    context.fillRect(5, 9, 9, 2);
    context.fillRect(3, 7, 13, 3);
    context.fillRect(4, 5, 10, 2);
    context.fillRect(7, 3, 5, 2);

    context.fillStyle = toHexColor(0x7fbf5b);
    context.fillRect(4, 7, 11, 2);
    context.fillRect(5, 5, 8, 2);
    context.fillRect(8, 3, 4, 2);
    context.fillRect(6, 9, 7, 1);

    context.fillStyle = toHexColor(0xb8e282);
    context.fillRect(6, 5, 3, 1);
    context.fillRect(9, 4, 2, 1);
    context.fillRect(5, 7, 4, 1);
    context.fillRect(10, 8, 3, 1);

    context.fillStyle = toHexColor(0x2f5426);
    context.fillRect(4, 9, 2, 1);
    context.fillRect(13, 8, 2, 1);
  }
}
