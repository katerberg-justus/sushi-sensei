import * as Phaser from 'phaser/dist/phaser.esm.js';
import { COLORS } from '../../game/constants.js';
import { CUTTABLE_FISH_STYLES } from '../ingredients/CuttableFish.js';
import { IngredientObject } from '../base/IngredientObject.js';
import { composeJapaneseName, JAPANESE_FISH_NAMES, JAPANESE_NAMES } from '../JapaneseNames.js';
import { resolveVariantTexture, toHexColor } from '../ProceduralTexture.js';
import { SHRIMP_STYLE, Shrimp } from '../ingredients/Shrimp.js';

const PIXEL = 1.8;
const NIGIRI_BASE_KEY = 'nigiri';
const NIGIRI_VARIANT_POOL = 6;
const NIGIRI_WIDTH = 32;
const NIGIRI_HEIGHT = 27;
const NIGIRI_WEIGHT_GRAMS = 34;
const NIGIRI_GLAZE_KEY = 'nigiri-glaze-pixel';
const NIGIRI_FISH_REGION = { x: 3, y: 5, width: 26, height: 13 };

const FISH_STYLES = {
  ...CUTTABLE_FISH_STYLES,
  shrimp: SHRIMP_STYLE,
  tuna: { ...CUTTABLE_FISH_STYLES.maguro, displayName: 'Tuna', japaneseName: JAPANESE_FISH_NAMES.maguro },
  tamago: {
    displayName: 'Tamago',
    japaneseName: JAPANESE_NAMES.tamago,
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
    const fishSubtypeStyle = Nigiri.getFishSubtypeStyle(fishStyle, options.fishSubtype);
    const fishSubtype = fishSubtypeStyle?.key ?? null;
    const mergedFishStyle = fishType === 'shrimp'
      ? Shrimp.mergeSubtypeStyle(fishStyle, fishSubtypeStyle)
      : Nigiri.mergeSubtypeStyle(fishStyle, fishSubtypeStyle);
    const fishDisplayName = fishSubtypeStyle?.displayName ?? fishStyle.displayName;
    const subtypeBaseKey = fishSubtype
      ? `${NIGIRI_BASE_KEY}-${fishType}-${fishSubtype}-pixel`
      : `${NIGIRI_BASE_KEY}-${fishType}-pixel`;
    const { textureKey, variantIndex } = resolveVariantTexture(scene, subtypeBaseKey, options, {
      width: NIGIRI_WIDTH,
      height: NIGIRI_HEIGHT,
      pool: NIGIRI_VARIANT_POOL,
      paint: (context, rng) => Nigiri.paintTexture(context, rng, mergedFishStyle),
      shapeNoise: { chipChance: 0.026, bumpChance: 0.018 },
    });
    const displayWidth = NIGIRI_WIDTH * PIXEL;
    const displayHeight = NIGIRI_HEIGHT * PIXEL;

    const fishJapaneseName = fishSubtypeStyle?.japaneseName ?? fishStyle.japaneseName ?? null;

    super(scene, x, y, displayWidth, displayHeight, {
      ...options,
      japaneseName: options.japaneseName ?? composeJapaneseName(fishJapaneseName, JAPANESE_NAMES.nigiri),
    });
    this.setCenteredHitbox(54, 44, 0, 3);
    this.ownWeightGrams = options.weightGrams ?? NIGIRI_WEIGHT_GRAMS;
    this.displayName = `${fishDisplayName} Nigiri`;
    this.fishType = fishType;
    this.fishSubtype = fishSubtype;
    this.fishDisplayName = fishStyle.displayName;
    this.fishSubtypeDisplayName = fishSubtypeStyle?.displayName ?? null;
    this.fishJapaneseName = fishStyle.japaneseName ?? null;
    this.fishSubtypeJapaneseName = fishSubtypeStyle?.japaneseName ?? null;
    this.stackCategory = 'sushi';
    this.variantIndex = variantIndex;
    this.isRotatable = false;
    this.restDepth = 24;
    this.softness = 0.82;
    this.computedShadePixelSize = 1;
    this.computedShadeBottomProfileSmoothing = 2;

    this.sprite = scene.add.image(0, 0, textureKey);
    this.sprite.setScale(PIXEL);
    this.sprite.setOrigin(0.5);

    this.addDraggablePart(this.sprite);

    Nigiri.ensureGlazeTexture(scene);
    this.glazeSprite = scene.add.image(0, 0, NIGIRI_GLAZE_KEY);
    this.glazeSprite.setScale(PIXEL);
    this.glazeSprite.setOrigin(0.5);
    this.glazeSprite.setVisible(false);
    this.glazeSprite.excludeFromCompositionShadow = true;
    this.addDraggablePart(this.glazeSprite);

    this.isGlazed = false;
    this.glazeStroke = null;
    this.glazeStrokeProgress = 0;
    this.glazeMeter = null;
    this.glazeRequiredCoverage = 0.9;
    this.glazeStartZone = 0.2;

    this.refreshCompositionShadow();
    this.applyRestingDepth();
  }

  static getFishSubtypeStyle(fishStyle, fishSubtype = null) {
    if (typeof fishSubtype !== 'string') {
      return null;
    }

    const normalizedSubtype = fishSubtype.trim().toLowerCase();

    return (fishStyle.subtypes ?? [])
      .find((subtype) => subtype.key === normalizedSubtype) ?? null;
  }

  static mergeSubtypeStyle(fishStyle, subtypeStyle) {
    if (!subtypeStyle) {
      return fishStyle;
    }

    return {
      ...fishStyle,
      ...(subtypeStyle.palette ?? {}),
      fatDensity: subtypeStyle.fatDensity ?? fishStyle.fatDensity ?? 1,
    };
  }

  setGlazed() {
    if (this.isGlazed) {
      return false;
    }

    this.isGlazed = true;
    this.glazeSprite?.setVisible(true);
    const baseName = `${this.fishSubtypeDisplayName ?? this.fishDisplayName} Nigiri`;
    const baseJapaneseName = this.fishSubtypeJapaneseName ?? this.fishJapaneseName;
    this.displayName = `Nikiri-Glazed ${baseName}`;
    this.setJapaneseName(baseJapaneseName
      ? { kanji: `煮切り${baseJapaneseName.kanji}握り`, kana: `にきり${baseJapaneseName.kana}にぎり` }
      : null);
    return true;
  }

  getGlazeTargetWorldRect() {
    const rect = this.getWorldHitboxRect();
    return new Phaser.Geom.Rectangle(rect.x, rect.y, rect.width, rect.height / 2);
  }

  beginGlazeStroke(brushRect) {
    if (this.isGlazed) {
      return;
    }

    const target = this.getGlazeTargetWorldRect();

    if (!brushRect || !Phaser.Geom.Intersects.RectangleToRectangle(brushRect, target)) {
      this.glazeStroke = null;
      this.glazeStrokeProgress = 0;
      this.hideGlazeMeter();
      return;
    }

    const brushCenterX = brushRect.x + brushRect.width / 2;
    const startedAtLeft = brushCenterX <= target.x + target.width * this.glazeStartZone;

    this.glazeStroke = {
      startedAtLeft,
      minX: brushCenterX,
      maxX: brushCenterX,
      lastX: brushCenterX,
      width: target.width,
      leftEdge: target.x,
    };
    this.glazeStrokeProgress = 0;
    this.showGlazeMeter();
    this.updateGlazeMeter();
  }

  extendGlazeStroke(brushRect) {
    if (this.isGlazed || !this.glazeStroke) {
      return;
    }

    const target = this.getGlazeTargetWorldRect();

    if (!brushRect || !Phaser.Geom.Intersects.RectangleToRectangle(brushRect, target)) {
      return;
    }

    const brushCenterX = brushRect.x + brushRect.width / 2;
    const stroke = this.glazeStroke;

    if (brushCenterX < stroke.lastX - 1) {
      this.endGlazeStroke();
      return;
    }

    stroke.lastX = brushCenterX;
    stroke.minX = Math.min(stroke.minX, brushCenterX);
    stroke.maxX = Math.max(stroke.maxX, brushCenterX);

    const coverage = stroke.width > 0
      ? (stroke.maxX - stroke.minX) / stroke.width
      : 0;

    this.glazeStrokeProgress = stroke.startedAtLeft
      ? Phaser.Math.Clamp(coverage, 0, 1)
      : 0;
    this.updateGlazeMeter();

    if (stroke.startedAtLeft && coverage >= this.glazeRequiredCoverage) {
      this.setGlazed(true);
      this.endGlazeStroke();
    }
  }

  endGlazeStroke() {
    this.glazeStroke = null;
    this.glazeStrokeProgress = 0;
    this.hideGlazeMeter();
  }

  showGlazeMeter() {
    if (this.glazeMeter) {
      return;
    }

    this.glazeMeter = this.scene.add.graphics();
    this.glazeMeter.excludeFromCompositionShadow = true;
    this.add(this.glazeMeter);
  }

  hideGlazeMeter() {
    if (!this.glazeMeter) {
      return;
    }

    this.glazeMeter.destroy();
    this.glazeMeter = null;
  }

  updateGlazeMeter() {
    if (!this.glazeMeter) {
      return;
    }

    const progress = Phaser.Math.Clamp(this.glazeStrokeProgress, 0, 1);
    const trackWidth = Math.max(40, this.hitbox.width - 12);
    const trackHeight = 8;
    const x = this.hitbox.x + (this.hitbox.width - trackWidth) / 2;
    const y = this.hitbox.y - trackHeight - 6;
    const fillWidth = trackWidth * progress;

    this.glazeMeter.clear();
    this.glazeMeter.fillStyle(0x2f2419, 0.22);
    this.glazeMeter.fillRoundedRect(x, y, trackWidth, trackHeight, 3);
    this.glazeMeter.lineStyle(2, 0x6b4a32, 0.45);
    this.glazeMeter.strokeRoundedRect(x, y, trackWidth, trackHeight, 3);

    if (fillWidth > 0) {
      this.glazeMeter.fillStyle(0xfff2a8, 0.9);
      this.glazeMeter.fillRoundedRect(x, y, fillWidth, trackHeight, 3);
    }

    const arrowY = y + trackHeight + 6;
    const arrowStartX = x + 2;
    const arrowEndX = x + trackWidth - 2;
    this.glazeMeter.lineStyle(2, 0xfff2a8, 0.9);
    this.glazeMeter.lineBetween(arrowStartX, arrowY, arrowEndX, arrowY);
    this.glazeMeter.lineBetween(arrowEndX, arrowY, arrowEndX - 5, arrowY - 3);
    this.glazeMeter.lineBetween(arrowEndX, arrowY, arrowEndX - 5, arrowY + 3);
  }

  getFishWorldRect() {
    const localX = (NIGIRI_FISH_REGION.x - NIGIRI_WIDTH / 2) * PIXEL;
    const localY = (NIGIRI_FISH_REGION.y - NIGIRI_HEIGHT / 2) * PIXEL;
    const width = NIGIRI_FISH_REGION.width * PIXEL;
    const height = NIGIRI_FISH_REGION.height * PIXEL;

    return new Phaser.Geom.Rectangle(this.x + localX, this.y + localY, width, height);
  }

  containsFishPoint(point) {
    if (!point) {
      return false;
    }

    return Phaser.Geom.Rectangle.Contains(this.getFishWorldRect(), point.x, point.y);
  }

  static ensureGlazeTexture(scene) {
    if (scene.textures.exists(NIGIRI_GLAZE_KEY)) {
      return;
    }

    const texture = scene.textures.createCanvas(NIGIRI_GLAZE_KEY, NIGIRI_WIDTH, NIGIRI_HEIGHT);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, NIGIRI_WIDTH, NIGIRI_HEIGHT);

    context.fillStyle = 'rgba(255, 235, 175, 0.22)';
    context.fillRect(5, 6, 22, 4);
    context.fillRect(4, 10, 24, 4);
    context.fillRect(6, 14, 20, 3);

    context.fillStyle = 'rgba(255, 250, 220, 0.55)';
    context.fillRect(8, 7, 4, 1);
    context.fillRect(18, 7, 5, 1);
    context.fillRect(6, 11, 6, 1);
    context.fillRect(19, 11, 5, 1);
    context.fillRect(9, 15, 4, 1);
    context.fillRect(18, 15, 6, 1);

    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.fillRect(10, 8, 2, 1);
    context.fillRect(20, 12, 2, 1);

    texture.refresh();
  }

  static paintTexture(context, rng, fishStyle) {
    if (fishStyle.kind === 'shrimp') {
      Nigiri.paintShrimpTexture(context, rng, fishStyle);
      return;
    }

    const baseColor = fishStyle.base ?? COLORS.salmon;
    const highlightColor = fishStyle.highlight ?? baseColor;
    const fatColor = fishStyle.fat ?? highlightColor;
    const glintColor = fishStyle.glint ?? fatColor;
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

    context.fillStyle = toHexColor(baseColor);
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

    context.fillStyle = toHexColor(highlightColor);
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

    context.fillStyle = toHexColor(fatColor);
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

    context.fillStyle = toHexColor(glintColor);
    for (let i = 0; i < 4; i += 1) {
      if (chance(0.62)) {
        context.fillRect(8 + Math.floor(rng() * 17), 7 + Math.floor(rng() * 9), 1, 1);
      }
    }
  }

  static paintShrimpTexture(context, rng, fishStyle) {
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

    // Butterflied body silhouette — mirrors the original peeled shrimp sprite
    const silhouette = [
      [7, 9, 21],
      [8, 7, 24],
      [9, 6, 25],
      [10, 5, 26],
      [11, 5, 26],
      [12, 5, 26],
      [13, 5, 26],
      [14, 5, 26],
      [15, 6, 25],
      [16, 7, 24],
      [17, 9, 21],
    ];
    context.fillStyle = toHexColor(fishStyle.base);
    silhouette.forEach(([y, x0, x1]) => context.fillRect(x0, y, x1 - x0 + 1, 1));

    // Inner body (one pixel inside the silhouette)
    const inner = [
      [8, 10, 20],
      [9, 8, 23],
      [10, 7, 24],
      [11, 6, 25],
      [12, 6, 25],
      [13, 6, 25],
      [14, 6, 25],
      [15, 7, 24],
      [16, 8, 23],
    ];
    context.fillStyle = toHexColor(fishStyle.base);
    inner.forEach(([y, x0, x1]) => context.fillRect(x0, y, x1 - x0 + 1, 1));

    // Segment dividers — alternating shell stripes
    const segments = [
      [10, 8, 15],
      [13, 7, 16],
      [16, 7, 16],
      [19, 8, 15],
      [22, 9, 14],
    ];
    context.fillStyle = toHexColor(fishStyle.shadow);
    segments.forEach(([x, y0, y1]) => context.fillRect(x, y0, 1, y1 - y0 + 1));

    // Splayed tail fan on the right
    context.fillStyle = toHexColor(fishStyle.tail);
    context.fillRect(26, 11, 2, 4);
    context.fillRect(27, 10, 2, 2);
    context.fillRect(27, 14, 2, 2);
    context.fillRect(28, 9, 2, 3);
    context.fillRect(28, 14, 2, 3);
    context.fillRect(28, 12, 3, 2);

    // Subtle highlights along the back
    context.fillStyle = toHexColor(fishStyle.highlight);
    if (chance(0.85)) context.fillRect(15 + jitter(1), 9, 3, 1);
    if (chance(0.8)) context.fillRect(18 + jitter(1), 10, 4, 1);
    if (chance(0.75)) context.fillRect(11 + jitter(1), 11, 3, 1);
  }
}
