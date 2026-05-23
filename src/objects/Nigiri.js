import { COLORS } from '../game/constants.js';
import { CUTTABLE_FISH_STYLES } from './CuttableFish.js';
import { IngredientObject } from './IngredientObject.js';
import { resolveVariantTexture, toHexColor } from './ProceduralTexture.js';

const PIXEL = 1.8;
const NIGIRI_BASE_KEY = 'nigiri';
const NIGIRI_VARIANT_POOL = 6;
const NIGIRI_WIDTH = 32;
const NIGIRI_HEIGHT = 27;
const NIGIRI_WEIGHT_GRAMS = 34;

const FISH_STYLES = {
  ...CUTTABLE_FISH_STYLES,
  tuna: { ...CUTTABLE_FISH_STYLES.maguro, displayName: 'Tuna' },
  tamago: {
    displayName: 'Tamago',
    base: 0xf1c35b,
    stroke: 0xd49d3f,
    highlight: 0xf6d56d,
    fat: 0xfadf85,
    glint: 0xffedaa,
  },
};

export class Nigiri extends IngredientObject {
  constructor(scene, x, y, options = {}) {
    const fishType = options.fishType ?? 'salmon';
    const fishStyle = FISH_STYLES[fishType] ?? FISH_STYLES.salmon;
    const { textureKey, variantIndex } = resolveVariantTexture(scene, `${NIGIRI_BASE_KEY}-${fishType}-pixel`, options, {
      width: NIGIRI_WIDTH,
      height: NIGIRI_HEIGHT,
      pool: NIGIRI_VARIANT_POOL,
      paint: (context, rng) => Nigiri.paintTexture(context, rng, fishStyle),
      shapeNoise: { chipChance: 0.026, bumpChance: 0.018 },
    });
    const displayWidth = NIGIRI_WIDTH * PIXEL;
    const displayHeight = NIGIRI_HEIGHT * PIXEL;

    super(scene, x, y, displayWidth, displayHeight, options);
    this.setCenteredHitbox(54, 44, 0, 3);
    this.ownWeightGrams = options.weightGrams ?? NIGIRI_WEIGHT_GRAMS;
    this.displayName = `${fishStyle.displayName} Nigiri`;
    this.fishType = fishType;
    this.stackCategory = 'sushi';
    this.variantIndex = variantIndex;
    this.restDepth = 24;
    this.softness = 0.82;
    this.computedShadePixelSize = 1;
    this.computedShadeBottomProfileSmoothing = 2;

    this.sprite = scene.add.image(0, 0, textureKey);
    this.sprite.setScale(PIXEL);
    this.sprite.setOrigin(0.5);

    this.addDraggablePart(this.sprite);
    this.refreshCompositionShadow();
    this.applyRestingDepth();
  }

  static paintTexture(context, rng, fishStyle) {
    const jitter = (range) => Math.floor(rng() * (range * 2 + 1)) - range;
    const chance = (probability) => rng() < probability;

    context.fillStyle = toHexColor(COLORS.riceStroke);
    context.fillRect(9, 14, 14, 2);
    context.fillRect(6, 16, 21, 4);
    context.fillRect(5, 20, 23, 4);
    context.fillRect(8, 24, 17, 2);

    context.fillStyle = toHexColor(COLORS.riceWhite);
    context.fillRect(10, 15, 12, 2);
    context.fillRect(7, 17, 19, 4);
    context.fillRect(7, 21, 19, 3);
    context.fillRect(10, 24, 12, 1);

    context.fillStyle = toHexColor(0xfffbef);
    context.fillRect(11, 15, 8, 1);
    context.fillRect(9, 17, 13, 3);
    context.fillRect(10, 21, 10, 2);

    context.fillStyle = toHexColor(COLORS.riceGrain);
    [
      { x: 10, y: 18 },
      { x: 16, y: 22 },
      { x: 23, y: 20 },
    ].forEach((grain) => {
      if (chance(0.7)) {
        context.fillRect(grain.x + jitter(1), grain.y + jitter(1), 1, 1);
      }
    });

    context.fillStyle = toHexColor(fishStyle.base);
    context.fillRect(7, 17, 18, 2);
    context.fillRect(5, 13, 22, 5);
    context.fillRect(4, 9, 24, 5);
    context.fillRect(7, 6, 20, 4);
    context.fillRect(9, 5, 16, 2);
    context.fillRect(3, 10, 2, 5);
    context.fillRect(27, 9, 2, 6);

    if (fishStyle.edgeAccent) {
      context.fillStyle = toHexColor(fishStyle.edgeAccent);
      context.fillRect(6, 6, 20, 1);
      context.fillRect(4, 9, 24, 1);
      context.fillRect(6, 17, 20, 1);
    }

    context.fillStyle = toHexColor(fishStyle.highlight);
    [
      { x: 9, y: 6, w: 6 },
      { x: 18, y: 6, w: 6 },
      { x: 7, y: 10, w: 7 },
      { x: 17, y: 10, w: 8 },
      { x: 10, y: 14, w: 7 },
      { x: 20, y: 14, w: 5 },
    ].forEach((highlight) => {
      if (chance(0.84)) {
        context.fillRect(
          highlight.x + jitter(1),
          highlight.y + jitter(1),
          Math.max(2, highlight.w + jitter(1)),
          1,
        );
      }
    });

    if (fishStyle.glaze) {
      context.fillStyle = toHexColor(fishStyle.glaze);
      context.fillRect(6, 9, 21, 1);
      context.fillRect(5, 13, 22, 1);
      context.fillRect(8, 17, 16, 1);

      context.fillStyle = toHexColor(fishStyle.grill);
      [10, 17, 24].forEach((x, index) => {
        const top = 7 + jitter(1);

        context.fillRect(x + jitter(1), top, 1, 3 + (index % 2));
        context.fillRect(x + jitter(1), top + 6 + jitter(1), 1, 2 + (index % 2));
      });
    }

    context.fillStyle = toHexColor(fishStyle.fat);
    [
      { x: 8, y: 7, segments: [3, 3, 3] },
      { x: 17, y: 7, segments: [3, 4, 3] },
      { x: 7, y: 11, segments: [3, 3, 3, 2] },
      { x: 16, y: 11, segments: [4, 3, 3] },
      { x: 11, y: 15, segments: [3, 3] },
    ].forEach((line) => {
      if (!chance(0.88)) {
        return;
      }

      line.segments.forEach((width, index) => {
        context.fillRect(line.x + jitter(1) + index * 3, line.y + jitter(1) + index, width, 1);
      });
    });

    context.fillStyle = toHexColor(fishStyle.glint);
    for (let i = 0; i < 4; i += 1) {
      if (chance(0.62)) {
        context.fillRect(8 + Math.floor(rng() * 17), 7 + Math.floor(rng() * 9), 1, 1);
      }
    }
  }
}
