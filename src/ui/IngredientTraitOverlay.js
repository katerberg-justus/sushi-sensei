import { BITMAP_FONT_PIXEL } from '../game/constants.js';
import { UI_ANIMATION, UI_DEPTHS } from './constants.js';

const PANEL_WIDTH = 174;
const PANEL_PADDING_X = 11;
const PANEL_PADDING_Y = 10;
const PANEL_GAP = 16;
const TEXT_SIZE = 8;
const TITLE_PADDING_X = 6;
const TITLE_PADDING_TOP = 4;
const TITLE_PADDING_BOTTOM = 2;
const TITLE_TOP_OFFSET = -2;
const TITLE_LINE_HEIGHT = 9;
const TITLE_BOTTOM_MARGIN = 8;
const STAT_LINE_HEIGHT = 9;
const QUALITY_BOTTOM_MARGIN = 5;
const TAG_HEIGHT = 13;
const TAG_GAP = 3;
const TAG_ROW_GAP = 3;
const STAR_SIZE = 9;
const STAR_GAP = 2;
const STAT_VALUE_GAP = 10;
const STAR_TEXTURE_KEY = 'ingredient-trait-star-icon';

const NOOP_TEXT = {
  setVisible() {},
  setText() {},
  setPosition() {},
  setMaxWidth() {},
  setTint() {},
  setAlpha() {},
};

const COLORS = {
  shadow: 0x10251e,
  outer: 0xa36d46,
  inner: 0xf1d3a4,
  titleBackground: 0xe9c28b,
  highlight: 0xfff2a8,
  text: 0x5a3427,
  tagTextDark: 0x4b352b,
  tagTextLight: 0xffffff,
  titleText: 0xffffff,
};

const FLAVOR_TAG_COLORS = {
  Umami: 0x8a4f3d,
  Briny: 0x4d93a6,
  Smoky: 0x6b6670,
  Buttery: 0xf2ca5d,
  Clean: 0x9edfd0,
  Citrusy: 0xf4d34d,
  Cooling: 0x7fc8ee,
  Fatty: 0xf0b58f,
  Creamy: 0xf4dfb4,
  Spicy: 0xd44a35,
  Tangy: 0xe98245,
  Sweet: 0xe69bc6,
  Caramelized: 0xb56e3d,
  Toasty: 0xc18a4a,
  Nutty: 0x9c7544,
  Oceanic: 0x2f7faa,
  Delicate: 0xd7c8e8,
  Vinegary: 0xc8d96e,
  Fermented: 0x8e7653,
  Peppery: 0x3f3b36,
};

function isDarkColor(color) {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;

  return r * 0.299 + g * 0.587 + b * 0.114 < 138;
}

function toTitleCase(value) {
  if (!value) {
    return '';
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export class IngredientTraitOverlay {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.gameObject = null;
    this.visibleArea = null;
    this.tween = null;
    this.isShowing = false;
    this.tagLayouts = [];
    this.overlayScale = options.scale ?? 1;
    this.depth = options.depth ?? UI_DEPTHS.overlay + 3;
    this.isBorderless = options.borderless ?? false;
    this.backgroundColor = options.backgroundColor ?? COLORS.inner;
    this.titleBackgroundColor = options.titleBackgroundColor ?? COLORS.titleBackground;

    this.createStarTexture();

    this.container = scene.add.container(0, 0);
    this.container.setDepth(this.depth);
    this.container.setScale(this.overlayScale);
    this.container.setVisible(false);
    this.container.setAlpha(0);

    this.graphics = scene.add.graphics();
    this.container.add(this.graphics);

    this.ingredientNameLabel = this.createTextPair('');
    this.qualityLabel = this.createTextPair('Quality');
    this.freshnessLabel = this.createTextPair('Freshness');
    this.freshnessValue = this.createTextPair('');
    this.showFreshness = false;
    this.starIcons = Array.from({ length: 3 }, () => {
      const image = scene.add.image(0, 0, STAR_TEXTURE_KEY);

      image.setOrigin(0, 0);
      this.container.add(image);
      return image;
    });
    this.tagTexts = Array.from({ length: 20 }, () => this.createTextPair(''));
  }

  createTextPair(value) {
    const text = this.scene.add.bitmapText(0, 0, BITMAP_FONT_PIXEL, value, TEXT_SIZE);

    text.setTint(COLORS.text);
    this.container.add(text);

    return { shadow: NOOP_TEXT, text };
  }

  createStarTexture() {
    if (this.scene.textures.exists(STAR_TEXTURE_KEY)) {
      return;
    }

    const graphics = this.scene.add.graphics();
    const drawStar = (offsetX, offsetY, color, alpha) => {
      graphics.fillStyle(color, alpha);
      graphics.fillRect(offsetX + 4, offsetY, 1, 1);
      graphics.fillRect(offsetX + 4, offsetY + 1, 1, 1);
      graphics.fillRect(offsetX + 3, offsetY + 2, 3, 1);
      graphics.fillRect(offsetX, offsetY + 3, 9, 1);
      graphics.fillRect(offsetX + 1, offsetY + 4, 7, 1);
      graphics.fillRect(offsetX + 2, offsetY + 5, 5, 1);
      graphics.fillRect(offsetX + 2, offsetY + 6, 2, 1);
      graphics.fillRect(offsetX + 5, offsetY + 6, 2, 1);
      graphics.fillRect(offsetX + 1, offsetY + 7, 2, 1);
      graphics.fillRect(offsetX + 6, offsetY + 7, 2, 1);
      graphics.fillRect(offsetX, offsetY + 8, 2, 1);
      graphics.fillRect(offsetX + 7, offsetY + 8, 2, 1);
    };

    drawStar(1, 1, COLORS.shadow, 0.2);
    drawStar(0, 0, COLORS.highlight, 1);
    graphics.generateTexture(STAR_TEXTURE_KEY, STAR_SIZE + 1, STAR_SIZE + 1);
    graphics.destroy();
  }

  position(visibleArea) {
    this.visibleArea = visibleArea;
    this.updatePosition();
  }

  show(gameObject) {
    if (!gameObject) {
      this.hide();
      return;
    }

    this.gameObject = gameObject;
    this.refreshContent(gameObject);
    this.draw();
    this.updatePosition();

    if (this.isShowing) {
      return;
    }

    this.stopTween();
    this.isShowing = true;
    this.container.setVisible(true);
    this.container.setAlpha(0);
    this.container.setY((this.container.restY ?? this.container.y) + UI_ANIMATION.slideOffset);

    this.tween = this.scene.tweens.add({
      targets: this.container,
      y: this.container.restY ?? this.container.y,
      alpha: 1,
      duration: UI_ANIMATION.showDuration,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.tween = null;
        this.container.setY(this.container.restY ?? this.container.y);
      },
    });
  }

  hide() {
    if (!this.isShowing) {
      this.gameObject = null;
      return;
    }

    this.stopTween();
    this.isShowing = false;
    this.gameObject = null;

    const restY = this.container.restY ?? this.container.y;

    this.tween = this.scene.tweens.add({
      targets: this.container,
      y: restY + UI_ANIMATION.slideOffset,
      alpha: 0,
      duration: UI_ANIMATION.hideDuration,
      ease: 'Cubic.In',
      onComplete: () => {
        this.tween = null;
        this.container.setVisible(false);
        this.container.setY(restY);
      },
    });
  }

  showAt(gameObject, x, y, alpha = 1) {
    if (!gameObject) {
      this.hideImmediate();
      return;
    }

    this.stopTween();
    this.isShowing = false;
    this.gameObject = gameObject;
    this.refreshContent(gameObject);
    this.draw();
    this.container.restX = x;
    this.container.restY = y;
    this.container.restAlpha = alpha;
    this.container.setPosition(x, y);
    this.container.setAlpha(alpha);
    this.container.setVisible(true);
  }

  hideImmediate() {
    this.stopTween();
    this.isShowing = false;
    this.gameObject = null;
    this.container.setVisible(false);
    this.container.setAlpha(0);
  }

  showPlaceholderAt(x, y, height, alpha = 1) {
    this.stopTween();
    this.isShowing = false;
    this.gameObject = null;
    this.tagLayouts = [];

    this.ingredientNameLabel.text.setVisible(false);
    this.ingredientNameLabel.shadow.setVisible(false);
    this.qualityLabel.text.setVisible(false);
    this.qualityLabel.shadow.setVisible(false);
    this.freshnessLabel.text.setVisible(false);
    this.freshnessLabel.shadow.setVisible(false);
    this.freshnessValue.text.setVisible(false);
    this.freshnessValue.shadow.setVisible(false);
    this.starIcons.forEach((star) => star.setVisible(false));
    this.tagTexts.forEach(({ shadow, text }) => {
      shadow.setVisible(false);
      text.setVisible(false);
    });

    this.width = PANEL_WIDTH;
    this.height = Math.max(1, Math.round(height));

    this.graphics.clear();

    if (this.isBorderless) {
      this.graphics.fillStyle(this.backgroundColor, 1);
      this.graphics.fillRect(0, 0, this.width, this.height);
    } else {
      this.graphics.fillStyle(COLORS.shadow, 0.16);
      this.graphics.fillRect(2, 3, this.width, this.height);
      this.graphics.fillStyle(COLORS.outer, 1);
      this.graphics.fillRect(0, 0, this.width, this.height);
      this.graphics.fillStyle(COLORS.inner, 1);
      this.graphics.fillRect(2, 2, this.width - 4, this.height - 4);
    }

    this.container.restX = x;
    this.container.restY = y;
    this.container.restAlpha = alpha;
    this.container.setPosition(x, y);
    this.container.setAlpha(alpha);
    this.container.setVisible(true);
  }

  get displayWidth() {
    return (this.width ?? PANEL_WIDTH) * this.overlayScale;
  }

  get displayHeight() {
    return (this.height ?? 0) * this.overlayScale;
  }

  updatePosition() {
    if (!this.gameObject || !this.visibleArea) {
      return;
    }

    const rect = this.gameObject.getWorldHitboxRect?.()
      ?? { x: this.gameObject.x, y: this.gameObject.y, width: 0, height: 0 };
    const targetX = rect.x + rect.width / 2;
    const targetY = rect.y - PANEL_GAP - this.height;
    const belowY = rect.y + rect.height + TAG_GAP;
    const unclampedX = Math.round(targetX - this.width / 2);
    const maxX = this.visibleArea.right - this.width - 4;
    const x = Math.round(Math.max(this.visibleArea.left + 4, Math.min(maxX, unclampedX)));
    const y = Math.round(
      targetY < this.visibleArea.top + 4
        ? Math.min(this.visibleArea.bottom - this.height - 4, belowY)
        : targetY,
    );

    this.container.restX = x;
    this.container.restY = y;
    this.container.setX(x);

    if (!this.tween) {
      this.container.setY(y);
    }
  }

  refreshContent(gameObject) {
    const ingredientName = (gameObject.displayName ?? '').toString().trim().toUpperCase();
    const quality = Math.max(1, Math.min(3, Math.round(Number(gameObject.quality) || 1)));
    const freshness = gameObject.hasIngredientTraits ? toTitleCase(gameObject.freshness) : '';

    this.ingredientNameLabel.text.setText(ingredientName);
    this.ingredientNameLabel.shadow.setText(ingredientName);
    this.ingredientNameLabel.text.setTint(COLORS.titleText);
    this.ingredientNameLabel.shadow.setTint(COLORS.shadow);
    this.ingredientNameLabel.text.setVisible(Boolean(ingredientName));
    this.ingredientNameLabel.shadow.setVisible(Boolean(ingredientName));
    this.qualityLabel.text.setVisible(true);
    this.qualityLabel.shadow.setVisible(true);

    this.showFreshness = Boolean(freshness);
    this.freshnessLabel.text.setVisible(this.showFreshness);
    this.freshnessLabel.shadow.setVisible(this.showFreshness);
    this.freshnessValue.text.setVisible(this.showFreshness);
    this.freshnessValue.shadow.setVisible(this.showFreshness);
    this.freshnessValue.text.setText(freshness);
    this.freshnessValue.shadow.setText(freshness);
    this.starIcons.forEach((star, index) => star.setVisible(index < quality));
    this.layoutTags(gameObject.hasIngredientTraits ? gameObject.flavorTags : []);
  }

  layoutTags(tags = []) {
    const tagValues = tags;
    const maxRowWidth = PANEL_WIDTH - PANEL_PADDING_X * 2;
    const titleY = PANEL_PADDING_Y + TITLE_TOP_OFFSET;
    const titleBlockHeight = TITLE_LINE_HEIGHT + TITLE_PADDING_TOP + TITLE_PADDING_BOTTOM;
    const statStartY = titleY + titleBlockHeight + TITLE_BOTTOM_MARGIN;
    let x = PANEL_PADDING_X;
    let y = statStartY + STAT_LINE_HEIGHT
      + (this.showFreshness ? STAT_LINE_HEIGHT + QUALITY_BOTTOM_MARGIN : 0)
      + 8;

    this.tagLayouts = [];
    this.tagTexts.forEach(({ shadow, text }) => {
      shadow.setVisible(false);
      text.setVisible(false);
    });

    tagValues.forEach((tag, index) => {
      const textPair = this.tagTexts[index];

      if (!textPair) {
        return;
      }

      const color = FLAVOR_TAG_COLORS[tag] ?? 0xc9a674;
      const label = tag.toUpperCase();

      textPair.text.setText(label);
      textPair.shadow.setText(label);

      const width = Math.ceil((textPair.text.width ?? 0) + 8);

      if (x > PANEL_PADDING_X && x + width > PANEL_PADDING_X + maxRowWidth) {
        x = PANEL_PADDING_X;
        y += TAG_HEIGHT + TAG_ROW_GAP;
      }

      this.tagLayouts.push({ color, textPair, x, y, width });
      x += width + TAG_GAP;
    });

    this.height = tagValues.length
      ? y + TAG_HEIGHT + PANEL_PADDING_Y
      : y - 8 + PANEL_PADDING_Y;
    this.width = PANEL_WIDTH;
  }

  draw() {
    this.graphics.clear();

    if (this.isBorderless) {
      this.graphics.fillStyle(this.backgroundColor, 1);
      this.graphics.fillRect(0, 0, this.width, this.height);
    } else {
      this.graphics.fillStyle(COLORS.shadow, 0.16);
      this.graphics.fillRect(2, 3, this.width, this.height);
      this.graphics.fillStyle(COLORS.outer, 1);
      this.graphics.fillRect(0, 0, this.width, this.height);
      this.graphics.fillStyle(COLORS.inner, 1);
      this.graphics.fillRect(2, 2, this.width - 4, this.height - 4);
    }

    const titleY = PANEL_PADDING_Y + TITLE_TOP_OFFSET;
    const titleBlockHeight = TITLE_LINE_HEIGHT + TITLE_PADDING_TOP + TITLE_PADDING_BOTTOM;
    const titleBackgroundColor = this.isBorderless ? this.backgroundColor : this.titleBackgroundColor;

    if (this.ingredientNameLabel.text.visible) {
      const titleMaxWidth = this.width - PANEL_PADDING_X * 2 - TITLE_PADDING_X * 2;
      this.ingredientNameLabel.text.setMaxWidth?.(titleMaxWidth);
      this.ingredientNameLabel.shadow.setMaxWidth?.(titleMaxWidth);

      const titleWidth = Math.min(this.ingredientNameLabel.text.width ?? 0, titleMaxWidth);
      const titleX = Math.round((this.width - titleWidth) / 2);
      const titleBackgroundX = titleX - TITLE_PADDING_X;
      const titleBackgroundY = titleY;
      const titleBackgroundWidth = titleWidth + TITLE_PADDING_X * 2;
      const titleBackgroundHeight = titleBlockHeight;

      this.graphics.fillStyle(titleBackgroundColor, 1);
      this.graphics.fillRect(
        titleBackgroundX,
        titleBackgroundY,
        titleBackgroundWidth,
        titleBackgroundHeight,
      );

      this.positionTextPair(this.ingredientNameLabel, titleX, titleY + TITLE_PADDING_TOP);
    }

    const statStartY = titleY + titleBlockHeight + TITLE_BOTTOM_MARGIN;

    this.positionTextPair(this.qualityLabel, PANEL_PADDING_X, statStartY);
    if (this.showFreshness) {
      this.positionTextPair(
        this.freshnessLabel,
        PANEL_PADDING_X,
        statStartY + STAT_LINE_HEIGHT + QUALITY_BOTTOM_MARGIN,
      );
      const freshnessValueX = this.width - PANEL_PADDING_X - this.freshnessValue.text.width;
      const freshnessLabelMaxWidth = Math.max(
        0,
        freshnessValueX - PANEL_PADDING_X - STAT_VALUE_GAP,
      );

      this.freshnessLabel.text.setMaxWidth?.(freshnessLabelMaxWidth);
      this.freshnessLabel.shadow.setMaxWidth?.(freshnessLabelMaxWidth);
      this.positionTextPair(
        this.freshnessValue,
        freshnessValueX,
        statStartY + STAT_LINE_HEIGHT + QUALITY_BOTTOM_MARGIN,
      );
    }

    const visibleStars = this.starIcons.filter((star) => star.visible);
    const starRowWidth = visibleStars.length * STAR_SIZE + Math.max(0, visibleStars.length - 1) * STAR_GAP;
    const starX = this.width - PANEL_PADDING_X - starRowWidth;

    visibleStars.forEach((star, index) => {
      star.setPosition(starX + index * (STAR_SIZE + STAR_GAP), statStartY);
    });

    this.drawTags();
  }

  drawTags() {
    this.tagLayouts.forEach(({ color, textPair, x, y, width }) => {
      const textTint = isDarkColor(color) ? COLORS.tagTextLight : COLORS.tagTextDark;

      this.graphics.fillStyle(color, 1);
      this.graphics.fillRect(x + 1, y, width - 2, TAG_HEIGHT);
      this.graphics.fillRect(x, y + 1, width, TAG_HEIGHT - 2);

      textPair.text.setTint(textTint);
      textPair.shadow.setTint(COLORS.shadow);
      textPair.shadow.setAlpha(0.16);
      this.positionTextPair(textPair, x + 4, y + 3);
      textPair.shadow.setVisible(true);
      textPair.text.setVisible(true);
    });
  }

  positionTextPair(textPair, x, y) {
    textPair.shadow.setPosition(Math.round(x + 1), Math.round(y + 1));
    textPair.text.setPosition(Math.round(x), Math.round(y));
  }

  stopTween() {
    if (this.tween) {
      this.tween.stop();
      this.tween = null;
    }
  }

  destroy() {
    this.stopTween();
    this.container.destroy();
  }
}
