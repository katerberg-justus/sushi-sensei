import * as Phaser from 'phaser/dist/phaser.esm.js';
import { UI_ANIMATION, UI_DEPTHS } from './constants.js';
import { BITMAP_FONT_MADOU, BITMAP_FONT_PIXEL } from '../game/constants.js';
import { Bowl } from '../objects/vessels/Bowl.js';
import { CuttableCucumber } from '../objects/ingredients/CuttableCucumber.js';
import { CUTTABLE_FISH_STYLES, CuttableFish } from '../objects/ingredients/CuttableFish.js';
import { DraggableObject } from '../objects/base/DraggableObject.js';
import { Nigiri } from '../objects/creations/Nigiri.js';
import { NoriSheet } from '../objects/ingredients/NoriSheet.js';
import { getCachedFullImageData } from '../objects/ProceduralTexture.js';
import { RiceBall } from '../objects/creations/RiceBall.js';
import { SHRIMP_STYLE, Shrimp } from '../objects/ingredients/Shrimp.js';
import { SushiRoll } from '../objects/creations/SushiRoll.js';
import { WasabiDab } from '../objects/ingredients/WasabiDab.js';
import { IngredientTraitOverlay } from './IngredientTraitOverlay.js';

const SLOT_COUNT = 11;
const EXPAND_SLOT_INDEX = SLOT_COUNT;
const DISPLAY_SLOT_COUNT = SLOT_COUNT + 1;
const MAX_SLOT_SIZE = 35;
const MIN_SLOT_SIZE = 21;
const SLOT_GAP = 4;
const BAR_MARGIN = 10;

const INVENTORY_PAGE_COUNT = 10;
const INVENTORY_COLUMNS = 12;
const INVENTORY_ROWS = 8;
const INVENTORY_SLOTS_PER_PAGE = INVENTORY_COLUMNS * INVENTORY_ROWS;
const UNLOCKED_PAGE_COUNT = 1;
const OVERLAY_MARGIN = 14;
const OVERLAY_PADDING = 14;
const OVERLAY_HEADER_HEIGHT = 0;
const OVERLAY_TAB_HEIGHT = 26;
const OVERLAY_TAB_GAP = 2;
const OVERLAY_PANEL_BORDER = 3;
const OVERLAY_TAB_PANEL_OVERLAP = OVERLAY_PANEL_BORDER;
const OVERLAY_TAB_LABEL_Y_OFFSET = 2;
const OVERLAY_TAB_BOTTOM_SHADOW = 1;
const OVERLAY_PAGE_BUTTON_HEIGHT = 18;
const OVERLAY_SECTION_LABEL_HEIGHT = 12;
const OVERLAY_SLOT_GAP = 3;
const OVERLAY_MAX_SLOT_SIZE = 35;
const OVERLAY_MIN_SLOT_SIZE = 13;
const OVERLAY_PREVIEW_GAP = 12;
const OVERLAY_PREVIEW_MIN_WIDTH = 148;
const OVERLAY_PREVIEW_MAX_WIDTH = 196;
const INVENTORY_DRAG_THRESHOLD = 4;
const RECIPE_COLUMNS = 3;
const RECIPE_CELL_GAP = 0;
const RECIPE_CELL_HEIGHT = 102;
const RECIPE_SCROLLBAR_WIDTH = 14;
const RECIPE_SCROLLBAR_GAP = 5;
const RECIPE_SCROLL_WHEEL_STEP = 24;
const RECIPE_GRID_ICON_SCALE = 0.75;
const RECIPE_GRID_LABEL_SIZE = 8;
const PREVIEW_JAPANESE_LABEL_SIZE = 16;
const PREVIEW_TRAIT_PLACEHOLDER_HEIGHT = 80;
const RECIPE_INGREDIENT_GROUP_GAP = 6;
const RECIPE_PAGE_LABELS = ['NIGIRI', 'HOSOMAKI', 'FUTOMAKI', 'URAMAKI', 'TEMAKI', 'ONIGIRI'];
const OVERLAY_TAB_CONFIG = [
  { label: 'INVENTORY', mode: 'inventory', side: 'left' },
  { label: 'RECIPES', mode: 'recipes', side: 'left' },
  { label: 'SETTINGS', mode: 'settings', side: 'right' },
];
const OVERLAY_TAB_LABELS = OVERLAY_TAB_CONFIG.map((tab) => tab.label);

const DEFAULT_ICON_COLOR = 0xc99a6b;
const ICON_PADDING = 5;

const iconVisibleBoundsCache = new Map();

const ICON_SHADOW_OFFSET_X = 0;
const ICON_SHADOW_OFFSET_Y = 1;
const ICON_SHADOW_COLOR = 0x10251e;
const ICON_SHADOW_ALPHA = 0.2625;

function attachPixelShadow(scene, iconObject) {
  if (!iconObject || iconObject.pixelShadow) {
    return iconObject;
  }

  const textureKey = iconObject.texture?.key;

  if (!textureKey || textureKey === '__DEFAULT' || textureKey === '__MISSING') {
    return iconObject;
  }

  const shadow = scene.add.image(iconObject.x, iconObject.y, textureKey);
  shadow.setTintFill(ICON_SHADOW_COLOR);
  shadow.setAlpha(ICON_SHADOW_ALPHA);
  shadow.setVisible(iconObject.visible);
  shadow.setOrigin(iconObject.originX, iconObject.originY);
  shadow.setScrollFactor(iconObject.scrollFactorX, iconObject.scrollFactorY);
  shadow.setDepth((iconObject.depth ?? 0) - 1);

  iconObject.pixelShadow = shadow;

  const wrap = (method, propagate) => {
    const original = iconObject[method]?.bind(iconObject);

    if (!original) {
      return;
    }

    iconObject[method] = (...args) => {
      const result = original(...args);

      if (shadow.scene) {
        propagate(shadow, ...args);
      }

      return result;
    };
  };

  wrap('setVisible', (s, value) => s.setVisible(value));
  wrap('setDepth', (s, depth) => s.setDepth((depth ?? 0) - 1));
  wrap('setScrollFactor', (s, ...args) => s.setScrollFactor(...args));
  wrap('setOrigin', (s, ...args) => s.setOrigin(...args));
  wrap('setMask', (s, mask) => s.setMask(mask));
  wrap('clearMask', (s, ...args) => s.clearMask(...args));
  wrap('setScale', (s, sx, sy) => s.setScale(sx, sy ?? sx));
  wrap('setPosition', (s, x, y, z, w) => s.setPosition(
    (x ?? 0) + ICON_SHADOW_OFFSET_X,
    (y ?? 0) + ICON_SHADOW_OFFSET_Y,
    z,
    w,
  ));
  wrap('setX', (s, x) => s.setX((x ?? 0) + ICON_SHADOW_OFFSET_X));
  wrap('setY', (s, y) => s.setY((y ?? 0) + ICON_SHADOW_OFFSET_Y));
  wrap('setAlpha', (s, alpha) => s.setAlpha(Math.min(1, (alpha ?? 1) * ICON_SHADOW_ALPHA)));
  wrap('setTint', () => {});
  wrap('setTintFill', () => {});
  wrap('clearTint', () => {});

  const originalDestroy = iconObject.destroy.bind(iconObject);
  iconObject.destroy = (...args) => {
    if (shadow.scene) {
      shadow.destroy();
    }
    return originalDestroy(...args);
  };

  return iconObject;
}

function snapDisplaySizeToCenter(idealSize, maxSize, center) {
  const rounded = Math.max(1, Math.round(idealSize));
  const centerIsHalf = Math.abs(center - Math.round(center)) > 0.25;
  const wantOdd = centerIsHalf;
  const isOdd = rounded % 2 === 1;

  if (wantOdd === isOdd) {
    return rounded;
  }

  if (rounded + 1 <= Math.floor(maxSize) && Math.abs(rounded + 1 - idealSize) <= Math.abs(rounded - 1 - idealSize)) {
    return rounded + 1;
  }

  return Math.max(1, rounded - 1);
}

const COLORS = {
  shadow: 0x10251e,
  outer: 0xa36d46,
  inner: 0xf1d3a4,
  innerAlt: 0xe9c28b,
  inset: 0xc8955e,
  highlight: 0xfff2a8,
  highlightOuter: 0xc98755,
  backdrop: 0x10251e,
  panelOuter: 0x7f5238,
  panelInner: 0xf1d3a4,
  panelInset: 0xd8a06b,
  pageButton: 0xefd0a2,
  pageButtonActive: 0xfff2a8,
  pageButtonLocked: 0xdfbc89,
  tabEdge: 0x8e5d3e,
  tabShadow: 0x6f452e,
  tabInactiveTop: 0xe6bd84,
  slotCold: 0xa36d46,
  slotColdInner: 0xf1d3a4,
  slotDry: 0xa36d46,
  slotDryInner: 0xe9c28b,
  slotLocked: 0x9d6a48,
  slotLockedInner: 0xd3aa79,
  text: 0xffffff,
  textDark: 0x5a3427,
  ice: 0xffffff,
  lock: 0x4b352b,
};

export class InventoryBar {
  constructor(scene) {
    this.scene = scene;
    this.slotItems = Array.from({ length: SLOT_COUNT }, () => null);
    this.largeSlotItems = Array.from(
      { length: INVENTORY_PAGE_COUNT * INVENTORY_SLOTS_PER_PAGE },
      () => null,
    );
    this.slotZones = [];
    this.overlaySlotZones = [];
    this.overlayPageZones = [];
    this.hoverIndex = null;
    this.dragHoverIndex = null;
    this.overlayHoverSlotIndex = null;
    this.overlayFocusSlotIndex = null;
    this.overlayDragHoverSlotIndex = null;
    this.hotbarDragHoverIndex = null;
    this.hotbarFocusIndex = null;
    this.currentOverlayMode = 'inventory';
    this.overlayTabZones = [];
    this.currentRecipePageIndex = 0;
    this.recipeHoverIndex = null;
    this.recipeFocusIndex = 0;
    this.recipeEntryZones = [];
    this.recipePageZones = [];
    this.recipePreviewEntry = null;
    this.recipePages = [];
    this.recipeScrollOffsets = Array.from({ length: RECIPE_PAGE_LABELS.length }, () => 0);
    this.recipeScrollbarDrag = null;
    this.inventoryDrag = null;
    this.pendingInventoryDrag = null;
    this.pendingInventoryDragMoveHandler = null;
    this.pendingInventoryDragUpHandler = null;
    this.previewEntry = null;
    this.overlayTween = null;
    this.overlayAnimation = {
      offsetY: 0,
      alpha: 1,
    };
    this.currentOverlayPage = 0;
    this.isOverlayOpen = false;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(UI_DEPTHS.inventory);
    this.createOverlayObjects();

    this.dragEndHandler = (pointer, gameObject) => this.handleSceneDragEnd(pointer, gameObject);
    this.dragHandler = (pointer, gameObject) => this.handleSceneDrag(pointer, gameObject);
    this.pointerDownHandler = (pointer) => this.handleScenePointerDown(pointer);
    this.wheelHandler = (pointer, gameObjects, deltaX, deltaY) => this.handleSceneWheel(pointer, gameObjects, deltaX, deltaY);
    this.escapeHandler = () => this.closeOverlay();
    scene.input.on('dragend', this.dragEndHandler);
    scene.input.on('drag', this.dragHandler);
    scene.input.on('pointerdown', this.pointerDownHandler);
    scene.input.on('wheel', this.wheelHandler);
    scene.input.keyboard?.on('keydown-ESC', this.escapeHandler);
  }

  createOverlayObjects() {
    this.overlayBackdropZone = this.scene.add.zone(0, 0, 1, 1);
    this.overlayBackdropZone.setOrigin(0, 0);
    this.overlayBackdropZone.setDepth(UI_DEPTHS.overlay);
    this.overlayBackdropZone.setInteractive({ cursor: 'default' });
    this.overlayBackdropZone.setVisible(false);

    this.overlayGraphics = this.scene.add.graphics();
    this.overlayGraphics.setDepth(UI_DEPTHS.overlay + 1);
    this.overlayGraphics.setVisible(false);

    this.inventoryDragGraphics = this.scene.add.graphics();
    this.inventoryDragGraphics.setDepth(UI_DEPTHS.overlay + 4);
    this.inventoryDragGraphics.setVisible(false);

    this.recipeMaskGraphics = this.scene.add.graphics();
    this.recipeMaskGraphics.setDepth(UI_DEPTHS.overlay + 2);
    this.recipeMaskGraphics.setVisible(true);
    this.recipeMaskGraphics.setAlpha(0);
    this.recipeMaskGraphics.restAlpha = 0;
    this.recipeGridMask = this.recipeMaskGraphics.createGeometryMask();

    this.recipePages = this.createRecipePages();

    this.previewTraits = new IngredientTraitOverlay(this.scene, {
      depth: UI_DEPTHS.overlay + 4,
      scale: 1,
      borderless: true,
      backgroundColor: COLORS.slotDryInner,
    });

    this.slotTraits = new IngredientTraitOverlay(this.scene, {
      depth: UI_DEPTHS.inventory + 50,
    });
    this.slotTraitsSlotIndex = null;

    this.previewEmptyLabelShadow = this.createOverlayText(0, 0, 8, COLORS.shadow, 0.18);
    this.previewEmptyLabel = this.createOverlayText(0, 0, 8, COLORS.textDark, 0.72);
    this.previewEmptyLabelShadow.setDepth(UI_DEPTHS.overlay + 5);
    this.previewEmptyLabel.setDepth(UI_DEPTHS.overlay + 5);
    this.previewEmptyLabelShadow.setOrigin(0, 0);
    this.previewEmptyLabel.setOrigin(0, 0);
    this.previewEmptyLabelShadow.setText('No item selected');
    this.previewEmptyLabel.setText('No item selected');
    this.previewJapaneseLabel = this.createOverlayText(
      0,
      0,
      PREVIEW_JAPANESE_LABEL_SIZE,
      COLORS.textDark,
      0.42,
      BITMAP_FONT_MADOU,
    );
    this.previewJapaneseLabel.setDepth(UI_DEPTHS.overlay + 5);
    this.previewJapaneseLabel.setOrigin(0.5, 0);
    this.previewJapaneseLabel.setCenterAlign?.();
    this.recipeIngredientGroupLabels = ['REQUIRED', 'OPTIONAL'].map((label) => {
      const text = this.createOverlayText(0, 0, 8, COLORS.textDark, 0.46);

      text.setDepth(UI_DEPTHS.overlay + 5);
      text.setOrigin(0, 0);
      text.setText(label);
      return text;
    });

    this.overlayTitleShadow = this.createOverlayText(0, 0, 8, 0x10251e, 0.25);
    this.overlayTitle = this.createOverlayText(0, 0, 8, COLORS.text, 1);
    this.overlayColdLabel = this.createOverlayText(0, 0, 8, 0x2e7180, 1);
    this.overlayDryLabel = this.createOverlayText(0, 0, 8, COLORS.textDark, 1);

    this.overlayTabTexts = OVERLAY_TAB_LABELS.map((label) => {
      const text = this.createOverlayText(0, 0, 8, COLORS.textDark, 1);

      text.setOrigin(0.5);
      text.setText(label);
      return text;
    });

    this.recipePageTexts = RECIPE_PAGE_LABELS.map((label) => {
      const text = this.createOverlayText(0, 0, 8, COLORS.textDark, 1);

      text.setOrigin(0.5);
      text.setText(label);
      return text;
    });

    this.overlayPageTexts = Array.from({ length: INVENTORY_PAGE_COUNT }, (_value, index) => {
      const text = this.createOverlayText(0, 0, 8, COLORS.textDark, 1);

      text.setOrigin(0.5);
      text.setText(`${index + 1}`);
      return text;
    });

    OVERLAY_TAB_CONFIG.forEach((tab, index) => {
      const zone = this.scene.add.zone(0, 0, 1, 1);

      zone.setOrigin(0, 0);
      zone.setDepth(UI_DEPTHS.overlay + 2);
      zone.setInteractive({ cursor: 'pointer' });
      zone.setVisible(false);
      zone.on('pointerdown', () => this.setOverlayMode(tab.mode));
      this.overlayTabZones.push(zone);
    });

    RECIPE_PAGE_LABELS.forEach((_label, index) => {
      const zone = this.scene.add.zone(0, 0, 1, 1);

      zone.setOrigin(0, 0);
      zone.setDepth(UI_DEPTHS.overlay + 2);
      zone.setInteractive({ cursor: 'pointer' });
      zone.setVisible(false);
      zone.on('pointerdown', () => this.setRecipePage(index));
      this.recipePageZones.push(zone);
    });

    this.recipeScrollbarZone = this.scene.add.zone(0, 0, 1, 1);
    this.recipeScrollbarZone.setOrigin(0, 0);
    this.recipeScrollbarZone.setDepth(UI_DEPTHS.overlay + 3);
    this.recipeScrollbarZone.setInteractive({ cursor: 'pointer' });
    this.recipeScrollbarZone.setVisible(false);
    this.recipeScrollbarZone.on('pointerdown', (pointer) => this.handleRecipeScrollbarPointerDown(pointer));

    for (let index = 0; index < INVENTORY_PAGE_COUNT; index += 1) {
      const zone = this.scene.add.zone(0, 0, 1, 1);

      zone.setOrigin(0, 0);
      zone.setDepth(UI_DEPTHS.overlay + 2);
      zone.setInteractive({ cursor: 'pointer' });
      zone.setVisible(false);
      zone.on('pointerdown', () => this.setOverlayPage(index));
      this.overlayPageZones.push(zone);
    }

    for (let index = 0; index < INVENTORY_SLOTS_PER_PAGE; index += 1) {
      const zone = this.scene.add.zone(0, 0, 1, 1);

      zone.setOrigin(0, 0);
      zone.setDepth(UI_DEPTHS.overlay + 2);
      zone.setInteractive({ cursor: 'default' });
      zone.setVisible(false);
      zone.on('pointerdown', (pointer) => this.handleOverlaySlotPointerDown(index, pointer));
      zone.on('pointerover', () => this.setOverlayHoverSlotIndex(index));
      zone.on('pointerout', () => this.setOverlayHoverSlotIndex(null, index));
      this.overlaySlotZones.push(zone);
    }

    this.setOverlayObjectsVisible(false);
  }

  createOverlayText(x, y, size, tint, alpha, fontKey = BITMAP_FONT_PIXEL) {
    const text = this.scene.add.bitmapText(x, y, fontKey, '', size);

    text.setDepth(UI_DEPTHS.overlay + 2);
    text.setTint(tint);
    text.setAlpha(alpha);
    text.restAlpha = alpha;
    text.setVisible(false);
    return text;
  }

  createRecipeGridLabel(size, alpha, fontKey = BITMAP_FONT_PIXEL) {
    const text = this.createOverlayText(0, 0, size, COLORS.textDark, alpha, fontKey);

    text.setDepth(UI_DEPTHS.overlay + 3);
    text.setOrigin(0.5, 0);
    text.setCenterAlign?.();
    return text;
  }

  createRecipePages() {
    return [
      {
        key: 'nigiri',
        label: RECIPE_PAGE_LABELS[0],
        entries: this.createNigiriRecipeEntries(),
      },
      {
        key: 'hosomaki',
        label: RECIPE_PAGE_LABELS[1],
        entries: [
          this.createRollRecipeEntry('hosomaki-salmon', 'Salmon Hosomaki', {
            rollStyle: 'hosomaki',
            cropWidth: 46,
            cropHeight: 12,
          }),
          this.createRollRecipeEntry('hosomaki-cucumber', 'Cucumber Hosomaki', {
            rollStyle: 'hosomaki',
            fillingType: 'cucumber',
            fillingIngredient: { type: 'cucumber', label: 'Cucumber' },
            cropWidth: 46,
            cropHeight: 12,
          }),
        ],
      },
      {
        key: 'futomaki',
        label: RECIPE_PAGE_LABELS[2],
        entries: [
          this.createRollRecipeEntry('futomaki-salmon', 'Salmon Futomaki', {
            rollStyle: 'futomaki',
            cropWidth: 64,
            cropHeight: 22,
          }),
        ],
      },
      {
        key: 'uramaki',
        label: RECIPE_PAGE_LABELS[3],
        entries: [
          this.createRollRecipeEntry('uramaki-salmon', 'Salmon Uramaki', {
            rollStyle: 'uramaki',
            cropWidth: 58,
            cropHeight: 16,
            isFlippedUpright: true,
          }),
        ],
      },
      {
        key: 'temaki',
        label: RECIPE_PAGE_LABELS[4],
        entries: [
          this.createRollRecipeEntry('temaki-salmon', 'Salmon Temaki', {
            rollStyle: 'temaki',
            cropWidth: 50,
            cropHeight: 18,
          }),
        ],
      },
      {
        key: 'onigiri',
        label: RECIPE_PAGE_LABELS[5],
        entries: [
          this.createOnigiriRecipeEntry('onigiri-plain', 'Plain Onigiri'),
        ],
      },
    ];
  }

  createOnigiriRecipeEntry(id, name) {
    const dishObject = new RiceBall(this.scene, 0, 0, {
      hasIngredientTraits: false,
      hasQuality: false,
    });

    dishObject.displayName = name;

    return this.prepareRecipeEntry({
      id,
      name,
      unlocked: false,
      dishObject,
      ingredients: [
        { type: 'rice', label: 'Rice' },
        { type: 'nori', label: 'Nori' },
      ],
    });
  }

  createNigiriRecipeEntries() {
    const fishEntries = Object.entries(CUTTABLE_FISH_STYLES).flatMap(([fishType, fishStyle]) => {
      const baseEntry = this.createNigiriRecipeEntry({
        fishType,
        fishStyle,
        id: `nigiri-${fishType}`,
        name: `${fishStyle.displayName} Nigiri`,
        unlocked: fishType === 'salmon',
      });
      const subtypeEntries = (fishStyle.subtypes ?? []).map((subtype) => this.createNigiriRecipeEntry({
        fishType,
        fishSubtype: subtype.key,
        fishStyle,
        id: `nigiri-${fishType}-${subtype.key}`,
        name: `${subtype.displayName} Nigiri`,
        unlocked: false,
      }));

      return [baseEntry, ...subtypeEntries];
    });

    return [
      ...fishEntries,
      ...this.createShrimpNigiriRecipeEntries(),
    ];
  }

  createShrimpNigiriRecipeEntries() {
    const fishType = 'shrimp';
    const fishStyle = SHRIMP_STYLE;
    const baseEntry = this.createNigiriRecipeEntry({
      fishType,
      fishStyle,
      id: 'nigiri-shrimp',
      name: 'Shrimp Nigiri',
      unlocked: true,
      ingredientType: 'shrimp',
      ingredientLabel: 'Peeled Shrimp',
    });

    const subtypeEntries = SHRIMP_STYLE.subtypes.map((subtype) => this.createNigiriRecipeEntry({
      fishType,
      fishSubtype: subtype.key,
      fishStyle,
      id: `nigiri-shrimp-${subtype.key}`,
      name: `${subtype.displayName} Nigiri`,
      unlocked: false,
      ingredientType: 'shrimp',
      ingredientLabel: `Peeled ${subtype.displayName}`,
    }));

    return [baseEntry, ...subtypeEntries];
  }

  createNigiriRecipeEntry({
    fishType,
    fishSubtype = null,
    fishStyle,
    id,
    name,
    unlocked,
    ingredientType = 'fish',
    ingredientLabel = fishStyle.displayName,
  }) {
    const dishObject = new Nigiri(this.scene, 0, 0, {
      fishType,
      fishSubtype,
      hasIngredientTraits: false,
      hasQuality: false,
    });

    return this.prepareRecipeEntry({
      id,
      name,
      unlocked,
      dishObject,
      ingredients: [
        { type: 'rice', label: 'Rice' },
        {
          type: ingredientType,
          label: ingredientLabel,
          fishType,
          fishSubtype,
          fishStyle,
        },
        { type: 'wasabi', label: 'Wasabi', optional: true },
        { type: 'nikiri', label: 'Nikiri Sauce', optional: true },
      ],
    });
  }

  createRollRecipeEntry(id, name, options = {}) {
    const fillingType = options.fillingType ?? 'salmon';
    const fillingIngredient = options.fillingIngredient ?? {
      type: 'fish',
      label: 'Salmon',
      fishType: 'salmon',
      fishStyle: CUTTABLE_FISH_STYLES.salmon,
    };
    const dishObject = new SushiRoll(this.scene, 0, 0, {
      fillingType,
      hasIngredientTraits: false,
      hasQuality: false,
      cropWidth: options.cropWidth,
      cropHeight: options.cropHeight,
      isFlippedUpright: options.isFlippedUpright ?? false,
    });

    dishObject.rollStyle = options.rollStyle ?? dishObject.rollStyle;
    dishObject.displayName = name;

    return this.prepareRecipeEntry({
      id,
      name,
      unlocked: false,
      dishObject,
      ingredients: [
        { type: 'rice', label: 'Rice' },
        { type: 'nori', label: 'Nori' },
        fillingIngredient,
      ],
    });
  }

  prepareRecipeEntry(entry) {
    const dishObject = entry.dishObject;
    const iconObject = attachPixelShadow(this.scene, dishObject?.createInventoryIcon?.(this.scene) ?? null);
    const previewIconObject = attachPixelShadow(this.scene, dishObject?.createInventoryIcon?.(this.scene) ?? null);
    const nameText = this.createRecipeGridLabel(RECIPE_GRID_LABEL_SIZE, 0.92);

    if (dishObject?.scene) {
      dishObject.setVisible(false);
      dishObject.disableInteractive?.();
      dishObject.setScrollFactor?.(0);
      dishObject.setDepth(UI_DEPTHS.overlay + 3);
    }

    if (iconObject) {
      iconObject.setOrigin(0.5);
      iconObject.setDepth(UI_DEPTHS.overlay + 3);
      iconObject.setScrollFactor?.(0);
      iconObject.setVisible(false);
    }

    if (previewIconObject) {
      previewIconObject.setOrigin(0.5);
      previewIconObject.setDepth(UI_DEPTHS.overlay + 3);
      previewIconObject.setScrollFactor?.(0);
      previewIconObject.setVisible(false);
    }

    return {
      ...entry,
      japaneseName: entry.japaneseName ?? dishObject?.japaneseName ?? null,
      ingredients: (entry.ingredients ?? []).map((ingredient) => this.prepareRecipeIngredient(ingredient)),
      iconObject,
      previewIconObject,
      nameText,
    };
  }

  prepareRecipeIngredient(ingredient) {
    const sourceObject = this.createRecipeIngredientSource(ingredient);
    const iconObject = attachPixelShadow(this.scene, sourceObject?.createInventoryIcon?.(this.scene) ?? null);

    if (sourceObject?.scene) {
      sourceObject.setVisible(false);
      sourceObject.disableInteractive?.();
      sourceObject.setScrollFactor?.(0);
    }

    if (iconObject) {
      iconObject.setOrigin(0.5);
      iconObject.setDepth(UI_DEPTHS.overlay + 4);
      iconObject.setScrollFactor?.(0);
      iconObject.setVisible(false);
    }

    return {
      ...ingredient,
      japaneseName: ingredient.japaneseName ?? sourceObject?.japaneseName ?? null,
      sourceObject,
      iconObject,
    };
  }

  createRecipeIngredientSource(ingredient) {
    const commonOptions = {
      hasIngredientTraits: false,
      hasQuality: false,
    };

    if (ingredient.type === 'rice') {
      return new RiceBall(this.scene, 0, 0, commonOptions);
    }

    if (ingredient.type === 'nori') {
      return new NoriSheet(this.scene, 0, 0, commonOptions);
    }

    if (ingredient.type === 'wasabi') {
      return new WasabiDab(this.scene, 0, 0, commonOptions);
    }

    if (ingredient.type === 'nikiri') {
      return new Bowl(this.scene, 0, 0, {
        ...commonOptions,
        preset: 'smallWideBowl',
        displayName: 'Nikiri Sauce',
        color: 'black',
        acceptedStackCategories: [],
        contents: { style: 'nikiri', fullness: 0.62 },
      });
    }

    if (ingredient.type === 'fish') {
      return new CuttableFish(this.scene, 0, 0, {
        ...commonOptions,
        fishType: ingredient.fishType ?? 'salmon',
        fishSubtype: ingredient.fishSubtype ?? null,
      });
    }

    if (ingredient.type === 'shrimp') {
      return new Shrimp(this.scene, 0, 0, {
        ...commonOptions,
        isPeeled: true,
        fishSubtype: ingredient.fishSubtype ?? null,
      });
    }

    if (ingredient.type === 'cucumber') {
      return new CuttableCucumber(this.scene, 0, 0, commonOptions);
    }

    return null;
  }

  position(visibleArea) {
    const maxWidth = Math.max(
      MIN_SLOT_SIZE * DISPLAY_SLOT_COUNT + SLOT_GAP * (DISPLAY_SLOT_COUNT - 1),
      visibleArea.width - BAR_MARGIN * 2,
    );
    const slotSize = Math.floor(Phaser.Math.Clamp(
      (maxWidth - SLOT_GAP * (DISPLAY_SLOT_COUNT - 1)) / DISPLAY_SLOT_COUNT,
      MIN_SLOT_SIZE,
      MAX_SLOT_SIZE,
    ));
    const width = slotSize * DISPLAY_SLOT_COUNT + SLOT_GAP * (DISPLAY_SLOT_COUNT - 1);
    const height = slotSize;
    const x = Math.round(visibleArea.left + (visibleArea.width - width) / 2);
    const y = Math.round(visibleArea.bottom - BAR_MARGIN - height);

    this.bounds = { x, y, width, height, slotSize };
    this.visibleArea = visibleArea;
    this.ensureSlotZones();
    this.draw();

    if (this.isOverlayOpen) {
      this.drawOverlay();
    }
  }

  ensureSlotZones() {
    if (!this.bounds) {
      return;
    }

    for (let index = this.slotZones.length; index < DISPLAY_SLOT_COUNT; index += 1) {
      const zone = this.scene.add.zone(0, 0, this.bounds.slotSize, this.bounds.slotSize);

      zone.setOrigin(0, 0);
      zone.setDepth(UI_DEPTHS.inventory + 1);
      zone.setInteractive({ cursor: 'pointer' });
      zone.on('pointerdown', (pointer) => {
        if (index === EXPAND_SLOT_INDEX) {
          this.handleExpandSlotPointerDown(pointer);
          return;
        }

        if (this.isOverlayOpen) {
          if (this.currentOverlayMode !== 'inventory') {
            return;
          }
          this.handleHotbarInventoryPointerDown(index, pointer);
          return;
        }

        this.handleSlotPointerDown(index, pointer);
      });
      zone.on('pointerover', () => {
        if (this.isOverlayOpen && this.currentOverlayMode !== 'inventory' && index !== EXPAND_SLOT_INDEX) {
          return;
        }
        this.setHoverIndex(index);
      });
      zone.on('pointerout', () => this.setHoverIndex(null, index));
      this.slotZones.push(zone);
    }
  }

  draw() {
    if (!this.bounds) {
      return;
    }

    const { x, y, slotSize } = this.bounds;

    this.graphics.clear();
    for (let index = 0; index < SLOT_COUNT; index += 1) {
      const slotX = x + index * (slotSize + SLOT_GAP);
      const slotY = y;
      const item = this.slotItems[index];
      const isEmpty = !item || item === this.inventoryDrag?.entry;
      const isHighlighted = this.isSlotHighlighted(index);
      const innerColor = index % 2 === 0 ? COLORS.inner : COLORS.innerAlt;

      this.graphics.fillStyle(COLORS.shadow, 0.14);
      this.graphics.fillRect(slotX + 1, slotY + 2, slotSize, slotSize);
      this.graphics.fillStyle(isHighlighted ? COLORS.highlight : COLORS.outer, 1);
      this.graphics.fillRect(slotX, slotY, slotSize, slotSize);
      this.graphics.fillStyle(innerColor, 1);
      this.graphics.fillRect(slotX + 2, slotY + 2, slotSize - 4, slotSize - 4);

      if (isEmpty) {
        this.drawEmptyPlus(slotX, slotY, slotSize);
      }

      this.drawSlotItem(slotX, slotY, slotSize, item);

      this.positionSlotZone(index, slotX, slotY, slotSize);
    }

    this.drawExpandSlot(x + EXPAND_SLOT_INDEX * (slotSize + SLOT_GAP), y, slotSize);
  }

  setOverlayObjectsVisible(isVisible) {
    this.overlayBackdropZone.setVisible(isVisible);
    this.overlayGraphics.setVisible(isVisible);
    this.overlayTitleShadow.setVisible(isVisible);
    this.overlayTitle.setVisible(isVisible);
    this.overlayColdLabel.setVisible(isVisible);
    this.overlayDryLabel.setVisible(isVisible);
    this.overlayTabTexts.forEach((text) => text.setVisible(isVisible));
    this.overlayTabZones.forEach((zone) => zone.setVisible(isVisible));
    this.previewEmptyLabelShadow.setVisible(false);
    this.previewEmptyLabel.setVisible(false);
    this.hidePreviewJapaneseName();
    this.hideRecipeIngredientGroupLabels();
    this.overlayPageTexts.forEach((text) => text.setVisible(isVisible && this.currentOverlayMode === 'inventory'));
    this.overlayPageZones.forEach((zone) => zone.setVisible(isVisible && this.currentOverlayMode === 'inventory'));
    this.overlaySlotZones.forEach((zone) => zone.setVisible(isVisible && this.currentOverlayMode === 'inventory'));
    this.recipePageTexts.forEach((text) => text.setVisible(isVisible && this.currentOverlayMode === 'recipes'));
    this.recipePageZones.forEach((zone) => zone.setVisible(isVisible && this.currentOverlayMode === 'recipes'));
    this.recipeEntryZones.forEach((zone) => zone.setVisible(isVisible && this.currentOverlayMode === 'recipes'));
    this.recipeScrollbarZone.setVisible(isVisible && this.currentOverlayMode === 'recipes');

    if (!isVisible) {
      this.overlayBackdropZone.setVisible(false);
      this.hidePreviewEntry();
      this.hideRecipePreviewEntry();
      this.hidePreviewJapaneseName();
      this.syncRecipeIconVisibility();
      this.endRecipeScrollbarDrag();
      this.recipeMaskGraphics.clear();
      this.previewTraits.hideImmediate();
    }
  }

  getOverlayAnimatedObjects() {
    return [
      this.overlayBackdropZone,
      this.overlayGraphics,
      this.overlayTitleShadow,
      this.overlayTitle,
      this.overlayColdLabel,
      this.overlayDryLabel,
      ...this.overlayTabTexts,
      ...this.overlayTabZones,
      this.previewEmptyLabelShadow,
      this.previewEmptyLabel,
      this.previewJapaneseLabel,
      ...this.recipeIngredientGroupLabels,
      this.recipeScrollbarZone,
      this.recipeMaskGraphics,
      ...this.overlayPageTexts,
      ...this.overlayPageZones,
      ...this.overlaySlotZones,
      ...this.recipePageTexts,
      ...this.recipePageZones,
      ...this.recipeEntryZones,
      this.previewTraits.container,
      ...(this.previewEntry?.object ? [this.previewEntry.object] : []),
      ...(this.recipePreviewEntry?.dishObject ? [this.recipePreviewEntry.dishObject] : []),
      ...(this.recipePreviewEntry?.previewIconObject ? [this.recipePreviewEntry.previewIconObject] : []),
      ...this.getOverlayVisibleIconObjects(),
      ...this.getOverlayVisibleRecipeObjects(),
      ...this.getVisibleRecipeIngredientIconObjects(),
    ];
  }

  getOverlayVisibleIconObjects() {
    if (this.currentOverlayMode !== 'inventory' || !this.isInventoryPageUnlocked(this.currentOverlayPage)) {
      return [];
    }

    const iconObjects = [];
    const draggedEntry = this.inventoryDrag?.entry;

    for (let index = 0; index < INVENTORY_SLOTS_PER_PAGE; index += 1) {
      const entry = this.getLargeSlotItem(this.currentOverlayPage, index);
      const iconObject = entry?.iconObject;

      if (entry !== draggedEntry && iconObject?.scene) {
        iconObjects.push(iconObject);
      }
    }

    return iconObjects;
  }

  getOverlayVisibleRecipeObjects() {
    if (this.currentOverlayMode !== 'recipes') {
      return [];
    }

    const page = this.getCurrentRecipePage();
    const objects = [];

    this.getRecipeEntriesForPage(page).forEach((entry) => {
      if (entry.iconObject?.scene) {
        objects.push(entry.iconObject);
      }
      if (entry.nameText?.scene) {
        objects.push(entry.nameText);
      }
    });

    return objects;
  }

  getVisibleRecipeIngredientIconObjects() {
    const entry = this.recipePreviewEntry;

    if (this.currentOverlayMode !== 'recipes' || !entry) {
      return [];
    }

    return (entry.ingredients ?? [])
      .map((ingredient) => ingredient.iconObject)
      .filter((iconObject) => iconObject?.scene && iconObject.visible);
  }

  applyOverlayAnimationTransform() {
    const { offsetY, alpha } = this.overlayAnimation;

    this.getOverlayAnimatedObjects().forEach((object) => {
      object.setY((object.restY ?? object.y) + offsetY);
      object.setAlpha?.((object.restAlpha ?? 1) * alpha);
    });
  }

  stopOverlayTween() {
    if (this.overlayTween) {
      this.overlayTween.stop();
      this.overlayTween = null;
    }
  }

  setOverlayRestPosition(object, x, y) {
    object.restY = y;
    object.setPosition(x, y);
  }

  setOverlayRestAlpha(object, alpha) {
    object.restAlpha = alpha;
    object.setAlpha(alpha);
  }

  setOverlayZoneRestPosition(zone, x, y) {
    zone.restY = y;
    zone.setPosition(x, y);
  }

  openOverlay() {
    if (this.isOverlayOpen) {
      return;
    }

    this.hideSlotTraits();
    this.stopOverlayTween();
    this.isOverlayOpen = true;
    this.overlayAnimation.offsetY = UI_ANIMATION.slideOffset;
    this.overlayAnimation.alpha = 0;
    this.setOverlayObjectsVisible(true);
    this.syncInventoryIconVisibility();
    this.syncRecipeIconVisibility();
    this.drawOverlay();
    this.draw();

    this.overlayTween = this.scene.tweens.add({
      targets: this.overlayAnimation,
      offsetY: 0,
      alpha: 1,
      duration: UI_ANIMATION.showDuration,
      ease: 'Cubic.Out',
      onUpdate: () => this.applyOverlayAnimationTransform(),
      onComplete: () => {
        this.overlayTween = null;
        this.applyOverlayAnimationTransform();
      },
    });
  }

  closeOverlay() {
    if (!this.isOverlayOpen) {
      return;
    }

    this.stopOverlayTween();
    this.isOverlayOpen = false;
    this.overlayHoverSlotIndex = null;
    this.overlayFocusSlotIndex = null;
    this.overlayDragHoverSlotIndex = null;
    this.hotbarDragHoverIndex = null;
    this.hotbarFocusIndex = null;
    this.clearPendingInventoryDrag();
    this.endInventoryDrag(false);
    this.draw();

    this.overlayTween = this.scene.tweens.add({
      targets: this.overlayAnimation,
      offsetY: UI_ANIMATION.slideOffset,
      alpha: 0,
      duration: UI_ANIMATION.hideDuration,
      ease: 'Cubic.In',
      onUpdate: () => this.applyOverlayAnimationTransform(),
      onComplete: () => {
        this.overlayTween = null;
        this.overlayGraphics.clear();
        this.overlayAnimation.offsetY = 0;
        this.overlayAnimation.alpha = 1;
        this.applyOverlayAnimationTransform();
        this.setOverlayObjectsVisible(false);
        this.syncInventoryIconVisibility();
        this.syncRecipeIconVisibility();
        this.draw();
      },
    });
  }

  toggleOverlay() {
    if (this.isOverlayOpen) {
      this.closeOverlay();
      return;
    }

    this.openOverlay();
  }

  setOverlayPage(pageIndex) {
    if (this.currentOverlayMode !== 'inventory') {
      return;
    }

    const nextPage = Phaser.Math.Clamp(pageIndex, 0, INVENTORY_PAGE_COUNT - 1);

    if (this.currentOverlayPage === nextPage) {
      return;
    }

    this.currentOverlayPage = nextPage;
    this.overlayHoverSlotIndex = null;
    this.overlayFocusSlotIndex = null;
    this.syncInventoryIconVisibility();
    this.drawOverlay();
  }

  setOverlayMode(mode) {
    const nextMode = OVERLAY_TAB_CONFIG.some((tab) => tab.mode === mode) ? mode : 'inventory';

    if (this.currentOverlayMode === nextMode) {
      return;
    }

    this.currentOverlayMode = nextMode;
    this.overlayHoverSlotIndex = null;
    this.overlayFocusSlotIndex = null;
    this.overlayDragHoverSlotIndex = null;
    this.hotbarFocusIndex = null;
    this.recipeHoverIndex = null;
    this.clampCurrentRecipeScrollOffset();
    this.endRecipeScrollbarDrag();
    this.clearPendingInventoryDrag();
    this.endInventoryDrag(false);
    this.hidePreviewEntry();
    this.hideRecipePreviewEntry();
    this.previewTraits.hideImmediate();
    this.syncInventoryIconVisibility();
    this.syncRecipeIconVisibility();
    this.setOverlayObjectsVisible(this.isOverlayOpen);
    this.draw();
    this.drawOverlay();
  }

  setRecipePage(pageIndex) {
    const nextPage = Phaser.Math.Clamp(pageIndex, 0, RECIPE_PAGE_LABELS.length - 1);

    if (this.currentRecipePageIndex === nextPage) {
      return;
    }

    this.currentRecipePageIndex = nextPage;
    this.recipeHoverIndex = null;
    this.recipeFocusIndex = 0;
    this.clampCurrentRecipeScrollOffset();
    this.hideRecipePreviewEntry();
    this.syncRecipeIconVisibility();
    this.drawOverlay();
  }

  drawOverlay() {
    if (!this.isOverlayOpen || !this.visibleArea) {
      return;
    }

    const visibleArea = this.visibleArea;
    const isRecipeMode = this.currentOverlayMode === 'recipes';
    const isSettingsMode = this.currentOverlayMode === 'settings';
    const recipeEntries = this.getRecipeEntriesForPage();
    const barTop = this.bounds?.y ?? visibleArea.bottom - BAR_MARGIN - MAX_SLOT_SIZE;
    const spaceAboveBar = Math.max(120, barTop - visibleArea.top - OVERLAY_MARGIN * 2);
    const maxPanelWidth = Math.min(visibleArea.width - OVERLAY_MARGIN * 2, 724);
    const maxPanelHeight = Math.min(spaceAboveBar, 458);
    const previewWidth = Math.floor(Phaser.Math.Clamp(
      maxPanelWidth * 0.27,
      OVERLAY_PREVIEW_MIN_WIDTH,
      OVERLAY_PREVIEW_MAX_WIDTH,
    ));
    const availableGridWidth = maxPanelWidth
      - OVERLAY_PADDING * 2
      - OVERLAY_PREVIEW_GAP
      - previewWidth;
    const availableGridHeight = maxPanelHeight
      - OVERLAY_PADDING * 2
      - OVERLAY_HEADER_HEIGHT
      - OVERLAY_PAGE_BUTTON_HEIGHT
      - OVERLAY_SECTION_LABEL_HEIGHT
      - 18;
    const slotSize = Math.floor(Phaser.Math.Clamp(
      Math.min(
        (availableGridWidth - OVERLAY_SLOT_GAP * (INVENTORY_COLUMNS - 1)) / INVENTORY_COLUMNS,
        (availableGridHeight - OVERLAY_SLOT_GAP * (INVENTORY_ROWS - 1)) / INVENTORY_ROWS,
      ),
      OVERLAY_MIN_SLOT_SIZE,
      OVERLAY_MAX_SLOT_SIZE,
    ));
    const gridWidth = slotSize * INVENTORY_COLUMNS + OVERLAY_SLOT_GAP * (INVENTORY_COLUMNS - 1);
    const gridHeight = slotSize * INVENTORY_ROWS + OVERLAY_SLOT_GAP * (INVENTORY_ROWS - 1);
    const recipeViewportWidth = isRecipeMode
      ? Math.max(1, gridWidth - RECIPE_SCROLLBAR_WIDTH - RECIPE_SCROLLBAR_GAP)
      : 0;
    const recipeCellWidth = isRecipeMode
      ? Math.floor(recipeViewportWidth / RECIPE_COLUMNS)
      : 0;
    const recipeCellHeight = isRecipeMode ? RECIPE_CELL_HEIGHT : 0;
    const recipeRowCount = isRecipeMode
      ? Math.max(1, Math.ceil(recipeEntries.length / RECIPE_COLUMNS))
      : 0;
    const panelWidth = gridWidth
      + OVERLAY_PADDING * 2
      + OVERLAY_PREVIEW_GAP
      + previewWidth;
    const panelHeight = OVERLAY_PADDING * 2
      + OVERLAY_HEADER_HEIGHT
      + OVERLAY_PAGE_BUTTON_HEIGHT
      + OVERLAY_SECTION_LABEL_HEIGHT
      + 18
      + gridHeight;
    const tabOverhang = OVERLAY_TAB_HEIGHT - OVERLAY_TAB_PANEL_OVERLAP;
    const panelX = Math.round(visibleArea.left + (visibleArea.width - panelWidth) / 2);
    const balancedGap = (barTop - visibleArea.top - panelHeight - tabOverhang) / 2;
    const panelY = Math.round(visibleArea.top + Math.max(OVERLAY_MARGIN + tabOverhang, balancedGap + tabOverhang));
    const tabTop = panelY - tabOverhang;
    const labelY = panelY + OVERLAY_PADDING + OVERLAY_HEADER_HEIGHT;
    const gridX = panelX + OVERLAY_PADDING;
    const gridY = labelY + OVERLAY_SECTION_LABEL_HEIGHT + 7;
    const previewX = gridX + gridWidth + OVERLAY_PREVIEW_GAP;
    const previewY = gridY - 4;
    const previewHeight = gridHeight + 8;
    const pageButtonX = panelX + OVERLAY_PANEL_BORDER;
    const pageButtonY = panelY + panelHeight - OVERLAY_PANEL_BORDER - OVERLAY_PAGE_BUTTON_HEIGHT;
    const pageButtonWidth = panelWidth - OVERLAY_PANEL_BORDER * 2;
    const isPageUnlocked = this.isInventoryPageUnlocked(this.currentOverlayPage);

    this.overlayBounds = {
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      tabTop,
      gridX,
      gridY,
      gridWidth,
      gridHeight,
      previewX,
      previewY,
      previewWidth,
      previewHeight,
      slotSize,
      rowCount: INVENTORY_ROWS,
      recipeCellWidth,
      recipeCellHeight,
      recipeViewportWidth,
      recipeViewportHeight: gridHeight,
      recipeRowCount,
    };

    this.setOverlayZoneRestPosition(this.overlayBackdropZone, panelX, tabTop);
    this.overlayBackdropZone.setSize(panelWidth, panelHeight + tabOverhang);
    this.overlayBackdropZone.input.hitArea.setTo(0, 0, panelWidth, panelHeight + tabOverhang);

    this.overlayGraphics.clear();
    this.hideRecipeIngredientGroupLabels();
    this.overlayGraphics.fillStyle(COLORS.shadow, 0.24);
    this.overlayGraphics.fillRect(panelX + 3, panelY + 4, panelWidth, panelHeight);
    this.overlayGraphics.fillStyle(COLORS.panelOuter, 1);
    this.overlayGraphics.fillRect(panelX, panelY, panelWidth, panelHeight);
    this.overlayGraphics.fillStyle(COLORS.panelInner, 1);
    this.overlayGraphics.fillRect(
      panelX + OVERLAY_PANEL_BORDER,
      panelY + OVERLAY_PANEL_BORDER,
      panelWidth - OVERLAY_PANEL_BORDER * 2,
      panelHeight - OVERLAY_PANEL_BORDER * 2,
    );
    this.overlayGraphics.fillStyle(COLORS.slotDryInner, 1);
    this.overlayGraphics.fillRect(gridX - 4, gridY - 4, gridWidth + 8, gridHeight + 8);
    this.drawOverlayPreviewColumn(previewX, previewY, previewWidth, previewHeight);

    this.positionOverlayHeader(panelX, panelY, panelWidth, isPageUnlocked);

    if (isRecipeMode) {
      this.positionRecipeSectionLabels(gridX, labelY);
      this.drawRecipeGrid(gridX, gridY, recipeViewportWidth, gridHeight, recipeCellWidth, recipeCellHeight, recipeRowCount);
      this.drawRecipePreviewContent(previewX, previewY, previewWidth, previewHeight);
      this.drawRecipePageButtons(pageButtonX, pageButtonY, pageButtonWidth);
    } else if (isSettingsMode) {
      this.positionSettingsSectionLabels(gridX, labelY);
      this.drawSettingsContent(gridX, gridY, gridWidth, gridHeight, previewX, previewY, previewWidth, previewHeight);
    } else {
      this.positionOverlaySectionLabels(gridX, labelY, gridWidth);
      this.drawOverlaySlots(gridX, gridY, slotSize, INVENTORY_ROWS, isPageUnlocked);
      this.drawOverlayPreviewContent(previewX, previewY, previewWidth, previewHeight);
      if (!isPageUnlocked) {
        this.drawLockedPageOverlay(gridX, gridY, gridWidth, gridHeight);
      }
      this.drawOverlayPageButtons(pageButtonX, pageButtonY, pageButtonWidth);
    }

    this.overlayGraphics.restY = 0;
    this.overlayGraphics.restAlpha = 1;
    this.applyOverlayAnimationTransform();
  }

  drawOverlayPreviewColumn(previewX, previewY, previewWidth, previewHeight) {
    this.drawOverlayPreviewSpotlight(previewX, previewY, previewWidth, previewHeight);
  }

  getOverlayPreviewSpotlightMetrics(previewX, previewY, previewWidth, previewHeight) {
    const centerX = Math.round(previewX + previewWidth / 2);
    const spotlightY = Math.round(previewY + previewHeight * 0.34);
    const spotlightWidth = Math.round(previewWidth * 0.66);
    const spotlightHeight = Math.max(10, Math.round(previewHeight * 0.12));

    return {
      centerX,
      centerY: spotlightY + Math.round(spotlightHeight / 2),
      width: spotlightWidth,
      height: spotlightHeight,
    };
  }

  drawOverlayPreviewSpotlight(previewX, previewY, previewWidth, previewHeight) {
    const {
      centerX: ellipseX,
      centerY: ellipseY,
      width: spotlightWidth,
      height: spotlightHeight,
    } = this.getOverlayPreviewSpotlightMetrics(previewX, previewY, previewWidth, previewHeight);

    this.overlayGraphics.fillStyle(COLORS.highlight, 0.1);
    this.overlayGraphics.fillEllipse(
      ellipseX,
      ellipseY,
      Math.round(spotlightWidth * 1.4),
      Math.max(spotlightHeight + 8, Math.round(spotlightHeight * 1.85)),
    );
    this.overlayGraphics.fillStyle(COLORS.highlight, 0.18);
    this.overlayGraphics.fillEllipse(
      ellipseX,
      ellipseY,
      Math.round(spotlightWidth * 1.18),
      Math.max(spotlightHeight + 4, Math.round(spotlightHeight * 1.4)),
    );
    this.overlayGraphics.fillStyle(COLORS.highlight, 0.36);
    this.overlayGraphics.fillEllipse(
      ellipseX,
      ellipseY,
      spotlightWidth,
      spotlightHeight,
    );
    this.overlayGraphics.fillStyle(COLORS.text, 0.18);
    this.overlayGraphics.fillEllipse(
      ellipseX,
      ellipseY,
      Math.floor(spotlightWidth * 0.76),
      Math.max(3, spotlightHeight - 4),
    );
  }

  drawOverlayPreviewContent(previewX, previewY, previewWidth, previewHeight) {
    const entry = this.getOverlayPreviewEntry();

    if (!entry) {
      this.hidePreviewEntry();
      this.hidePreviewJapaneseName();
      this.showEmptyPreviewMessage(previewX, previewY, previewWidth, previewHeight);
      return;
    }

    this.hideEmptyPreviewMessage();

    const { centerX, centerY: objectCenterY } = this.getOverlayPreviewSpotlightMetrics(
      previewX,
      previewY,
      previewWidth,
      previewHeight,
    );

    this.showPreviewEntry(entry, centerX, objectCenterY);

    if (entry.object?.hasIngredientTraits || entry.object?.hasQuality) {
      this.previewTraits.refreshContent(entry.object);
      this.previewTraits.draw();

      const traitX = Math.round(previewX + (previewWidth - this.previewTraits.displayWidth) / 2);
      const gridBottom = this.overlayBounds?.gridY + this.overlayBounds?.gridHeight + 4;
      const fallbackBottom = previewY + previewHeight - 4;
      const traitBottom = Number.isFinite(gridBottom) ? gridBottom : fallbackBottom;
      const traitY = Math.round(traitBottom - this.previewTraits.displayHeight);

      this.previewTraits.showAt(entry.object, traitX, traitY, 1);
      this.showPreviewJapaneseName(entry.object, previewX, previewY, previewWidth, previewHeight, traitY);
    } else {
      this.previewTraits.hideImmediate();
      this.hidePreviewJapaneseName();
    }
  }

  showEmptyPreviewMessage(previewX, previewY, previewWidth, previewHeight) {
    const panelLayout = this.getPreviewTraitPanelLayout(previewX, previewY, previewWidth, previewHeight);

    this.hidePreviewJapaneseName();
    this.previewTraits.showPlaceholderAt(panelLayout.x, panelLayout.y, panelLayout.rawHeight, 1);

    this.previewEmptyLabel.setText('No item selected');
    this.previewEmptyLabelShadow.setVisible(false);
    this.previewEmptyLabel.setVisible(true);
    this.setOverlayRestAlpha(this.previewEmptyLabel, 0.4);

    const labelWidth = this.previewEmptyLabel.width ?? 0;
    const labelHeight = this.previewEmptyLabel.height ?? 0;
    const labelX = Math.round(panelLayout.x + (panelLayout.width - labelWidth) / 2);
    const labelY = Math.round(panelLayout.y + (panelLayout.height - labelHeight) / 2);

    this.setOverlayRestPosition(this.previewEmptyLabel, labelX, labelY);
  }

  getPreviewTraitPanelLayout(previewX, previewY, previewWidth, previewHeight, rawHeight = PREVIEW_TRAIT_PLACEHOLDER_HEIGHT) {
    const scale = this.previewTraits.overlayScale ?? 1;
    const width = this.previewTraits.displayWidth || 0;
    const height = rawHeight * scale;
    const x = Math.round(previewX + (previewWidth - width) / 2);
    const gridBottom = this.overlayBounds?.gridY + this.overlayBounds?.gridHeight + 4;
    const fallbackBottom = previewY + previewHeight - 4;
    const bottom = Number.isFinite(gridBottom) ? gridBottom : fallbackBottom;
    const y = Math.round(bottom - height);

    return {
      x,
      y,
      width,
      height,
      rawHeight,
    };
  }

  hideEmptyPreviewMessage() {
    this.previewEmptyLabelShadow.setVisible(false);
    this.previewEmptyLabel.setVisible(false);
  }

  getJapaneseNameText(source) {
    const japaneseName = source?.japaneseName;

    if (!japaneseName) {
      return '';
    }

    if (typeof japaneseName === 'string') {
      return japaneseName;
    }

    return japaneseName.kanji || japaneseName.kana || '';
  }

  showPreviewJapaneseName(source, previewX, previewY, previewWidth, previewHeight, panelY = null) {
    const label = this.previewJapaneseLabel;
    const japaneseName = this.getJapaneseNameText(source);

    if (!label?.scene || !japaneseName) {
      this.hidePreviewJapaneseName();
      return;
    }

    const maxWidth = Math.max(20, previewWidth - 12);
    const textFits = this.fitRecipeGridText(label, japaneseName, maxWidth);

    if (!textFits) {
      this.hidePreviewJapaneseName();
      return;
    }

    const {
      centerX,
      centerY,
      height: spotlightHeight,
    } = this.getOverlayPreviewSpotlightMetrics(previewX, previewY, previewWidth, previewHeight);
    const fallbackPanelY = this.getPreviewTraitPanelLayout(previewX, previewY, previewWidth, previewHeight).y;
    const topLimit = Math.round(centerY + spotlightHeight / 2 + 8);
    const bottomLimit = Math.round((Number.isFinite(panelY) ? panelY : fallbackPanelY) - PREVIEW_JAPANESE_LABEL_SIZE - 6);
    const labelY = bottomLimit >= topLimit
      ? Math.round(topLimit + (bottomLimit - topLimit) / 2)
      : Math.round(bottomLimit);

    label.setTint(COLORS.textDark);
    label.setVisible(true);
    this.setOverlayRestAlpha(label, 0.42);
    this.setOverlayRestPosition(label, centerX, labelY);
  }

  hidePreviewJapaneseName() {
    if (this.previewJapaneseLabel?.scene) {
      this.previewJapaneseLabel.setVisible(false);
    }
  }

  hideRecipeIngredientGroupLabels() {
    this.recipeIngredientGroupLabels?.forEach((text) => text.setVisible(false));
  }

  getOverlayPreviewEntry() {
    if (!this.isInventoryPageUnlocked(this.currentOverlayPage)) {
      return null;
    }

    if (
      this.isOverlayOpen
      && this.currentOverlayMode === 'inventory'
      && this.hoverIndex !== null
      && this.hoverIndex !== EXPAND_SLOT_INDEX
    ) {
      const hotbarEntry = this.slotItems[this.hoverIndex];

      if (hotbarEntry && hotbarEntry !== this.inventoryDrag?.entry) {
        return hotbarEntry;
      }
    }

    const slotIndex = this.overlayHoverSlotIndex ?? this.overlayFocusSlotIndex;

    if (slotIndex !== null) {
      const entry = this.getLargeSlotItem(this.currentOverlayPage, slotIndex);

      if (!entry || entry === this.inventoryDrag?.entry) {
        return null;
      }

      return entry;
    }

    if (this.hotbarFocusIndex !== null) {
      const hotbarEntry = this.slotItems[this.hotbarFocusIndex];

      if (hotbarEntry && hotbarEntry !== this.inventoryDrag?.entry) {
        return hotbarEntry;
      }
    }

    return null;
  }

  showPreviewEntry(entry, centerX, centerY) {
    if (this.previewEntry && this.previewEntry !== entry) {
      this.hidePreviewEntry();
    }

    const object = entry.object;

    if (!object?.scene) {
      this.previewEntry = null;
      return;
    }

    this.previewEntry = entry;
    object.setVisible(true);
    object.setAlpha?.(1);
    object.restAlpha = 1;
    object.disableInteractive();
    object.setDepth(UI_DEPTHS.overlay + 3);
    object.setPosition(centerX, centerY);
    object.restY = centerY;
  }

  hidePreviewEntry() {
    const object = this.previewEntry?.object;

    if (object?.scene) {
      object.setVisible(false);
    }

    this.hidePreviewJapaneseName();
    this.previewEntry = null;
  }

  positionOverlayHeader(panelX, panelY, panelWidth, isPageUnlocked) {
    const titleX = panelX + OVERLAY_PADDING;
    const titleY = panelY - OVERLAY_TAB_HEIGHT + OVERLAY_TAB_PANEL_OVERLAP;
    const tabWidth = 92;
    const tabBottomY = panelY + OVERLAY_TAB_PANEL_OVERLAP;
    let leftTabIndex = 0;

    this.overlayTitleShadow.setText('');
    this.setOverlayRestPosition(this.overlayTitleShadow, titleX + 1, titleY + 1);
    this.overlayTitle.setText('');
    this.setOverlayRestPosition(this.overlayTitle, titleX, titleY);

    OVERLAY_TAB_CONFIG.forEach((tab, index) => {
      const x = tab.side === 'right'
        ? panelX + panelWidth - OVERLAY_PADDING - tabWidth
        : titleX + leftTabIndex * (tabWidth + OVERLAY_TAB_GAP);
      const isActive = this.currentOverlayMode === tab.mode;
      const tabHeight = OVERLAY_TAB_HEIGHT - (isActive ? 0 : 4);
      const tabY = tabBottomY - tabHeight;

      this.drawBinderTab(x, tabY, tabWidth, tabHeight, isActive);

      const text = this.overlayTabTexts[index];

      text.setTint(COLORS.textDark);
      this.setOverlayRestAlpha(text, isActive ? 0.95 : 0.62);
      this.setOverlayRestPosition(text, x + tabWidth / 2, tabY + tabHeight / 2 + OVERLAY_TAB_LABEL_Y_OFFSET);

      const zone = this.overlayTabZones[index];

      this.setOverlayZoneRestPosition(zone, x, titleY);
      zone.setSize(tabWidth, OVERLAY_TAB_HEIGHT + OVERLAY_TAB_PANEL_OVERLAP);
      zone.input.hitArea.setTo(0, 0, tabWidth, OVERLAY_TAB_HEIGHT + OVERLAY_TAB_PANEL_OVERLAP);

      if (tab.side !== 'right') {
        leftTabIndex += 1;
      }
    });

  }

  drawBinderTab(x, y, width, height, isActive) {
    const outerColor = isActive ? COLORS.tabEdge : COLORS.tabShadow;
    const fillColor = isActive ? COLORS.pageButtonActive : COLORS.pageButton;
    const highlightColor = isActive ? COLORS.highlight : COLORS.tabInactiveTop;
    const chamfer = 3;

    this.overlayGraphics.fillStyle(COLORS.shadow, isActive ? 0.1 : 0.16);
    this.fillChamferedTab(x + 2, y + 2, width, height, chamfer);

    this.overlayGraphics.fillStyle(outerColor, 1);
    this.fillChamferedTab(x, y, width, height, chamfer);

    this.overlayGraphics.fillStyle(fillColor, 1);
    this.fillChamferedTab(
      x + OVERLAY_PANEL_BORDER,
      y + OVERLAY_PANEL_BORDER,
      width - OVERLAY_PANEL_BORDER * 2,
      height - OVERLAY_PANEL_BORDER,
      1,
    );

    this.overlayGraphics.fillStyle(highlightColor, isActive ? 0.32 : 0.2);
    this.overlayGraphics.fillRect(x + 7, y + 5, width - 14, 2);

    if (!isActive) {
      this.overlayGraphics.fillStyle(COLORS.shadow, 0.11);
      this.overlayGraphics.fillRect(
        x + OVERLAY_PANEL_BORDER,
        y + height - OVERLAY_TAB_BOTTOM_SHADOW,
        width - OVERLAY_PANEL_BORDER * 2,
        OVERLAY_TAB_BOTTOM_SHADOW,
      );
    }

    if (isActive) {
      this.overlayGraphics.fillStyle(COLORS.pageButtonActive, 1);
      this.overlayGraphics.fillRect(
        x,
        y + height - OVERLAY_TAB_PANEL_OVERLAP,
        width,
        OVERLAY_TAB_PANEL_OVERLAP + 1,
      );
    }
  }

  fillChamferedTab(x, y, width, height, chamfer) {
    const left = Math.round(x);
    const top = Math.round(y);
    const tabWidth = Math.round(width);
    const tabHeight = Math.round(height);
    const edge = Math.max(1, Math.min(Math.round(chamfer), Math.floor(tabWidth / 2)));

    this.overlayGraphics.fillRect(left + edge, top, tabWidth - edge * 2, edge);
    this.overlayGraphics.fillRect(left, top + edge, tabWidth, tabHeight - edge);
    this.overlayGraphics.fillTriangle(
      left + edge,
      top,
      left + edge,
      top + edge,
      left,
      top + edge,
    );
    this.overlayGraphics.fillTriangle(
      left + tabWidth - edge,
      top,
      left + tabWidth,
      top + edge,
      left + tabWidth - edge,
      top + edge,
    );
  }

  drawOverlayPageButtons(pageButtonX, pageButtonY, pageButtonWidth) {
    const tabWidth = pageButtonWidth / INVENTORY_PAGE_COUNT;

    this.recipePageTexts.forEach((text) => text.setVisible(false));
    this.recipePageZones.forEach((zone) => zone.setVisible(false));
    this.recipeEntryZones.forEach((zone) => zone.setVisible(false));

    for (let index = 0; index < INVENTORY_PAGE_COUNT; index += 1) {
      const x = pageButtonX + index * tabWidth;
      const width = tabWidth;
      const isActive = index === this.currentOverlayPage;
      const isUnlocked = this.isInventoryPageUnlocked(index);
      const fillColor = isActive
        ? COLORS.pageButtonActive
        : (isUnlocked ? COLORS.pageButton : COLORS.pageButtonLocked);

      this.overlayGraphics.fillStyle(fillColor, 1);
      this.overlayGraphics.fillRect(x, pageButtonY, width, OVERLAY_PAGE_BUTTON_HEIGHT);
      this.overlayGraphics.fillStyle(COLORS.shadow, isActive ? 0.08 : 0.04);
      this.overlayGraphics.fillRect(x, pageButtonY + OVERLAY_PAGE_BUTTON_HEIGHT - 2, width, 2);

      const text = this.overlayPageTexts[index];

      text.setTint(COLORS.textDark);
      this.setOverlayRestAlpha(text, isUnlocked || isActive ? 0.9 : 0.34);
      this.setOverlayRestPosition(
        text,
        x + width / 2,
        pageButtonY + OVERLAY_PAGE_BUTTON_HEIGHT / 2,
      );

      const zone = this.overlayPageZones[index];

      this.setOverlayZoneRestPosition(zone, x, pageButtonY);
      zone.setSize(width, OVERLAY_PAGE_BUTTON_HEIGHT);
      zone.input.hitArea.setTo(0, 0, width, OVERLAY_PAGE_BUTTON_HEIGHT);
    }
  }

  drawRecipePageButtons(pageButtonX, pageButtonY, pageButtonWidth) {
    const tabWidth = pageButtonWidth / RECIPE_PAGE_LABELS.length;

    this.overlayPageTexts.forEach((text) => text.setVisible(false));
    this.overlayPageZones.forEach((zone) => zone.setVisible(false));

    for (let index = 0; index < RECIPE_PAGE_LABELS.length; index += 1) {
      const x = pageButtonX + index * tabWidth;
      const width = tabWidth;
      const isActive = index === this.currentRecipePageIndex;
      const fillColor = isActive ? COLORS.pageButtonActive : COLORS.pageButton;

      this.overlayGraphics.fillStyle(fillColor, 1);
      this.overlayGraphics.fillRect(x, pageButtonY, width, OVERLAY_PAGE_BUTTON_HEIGHT);
      this.overlayGraphics.fillStyle(COLORS.shadow, isActive ? 0.08 : 0.04);
      this.overlayGraphics.fillRect(x, pageButtonY + OVERLAY_PAGE_BUTTON_HEIGHT - 2, width, 2);

      const text = this.recipePageTexts[index];

      text.setVisible(true);
      text.setTint(COLORS.textDark);
      this.setOverlayRestAlpha(text, isActive ? 0.9 : 0.58);
      this.setOverlayRestPosition(
        text,
        x + width / 2,
        pageButtonY + OVERLAY_PAGE_BUTTON_HEIGHT / 2,
      );

      const zone = this.recipePageZones[index];

      zone.setVisible(true);
      this.setOverlayZoneRestPosition(zone, x, pageButtonY);
      zone.setSize(width, OVERLAY_PAGE_BUTTON_HEIGHT);
      zone.input.hitArea.setTo(0, 0, width, OVERLAY_PAGE_BUTTON_HEIGHT);
    }
  }

  positionOverlaySectionLabels(gridX, labelY, gridWidth) {
    const coldWidth = Math.floor(gridWidth * 0.5);

    this.overlayColdLabel.setText('REFRIGERATED');
    this.overlayColdLabel.setTint(COLORS.textDark);
    this.setOverlayRestAlpha(this.overlayColdLabel, 0.68);
    this.setOverlayRestPosition(this.overlayColdLabel, gridX, labelY);
    this.overlayDryLabel.setText('PANTRY');
    this.overlayDryLabel.setTint(COLORS.textDark);
    this.setOverlayRestAlpha(this.overlayDryLabel, 0.68);
    this.setOverlayRestPosition(this.overlayDryLabel, gridX + coldWidth + OVERLAY_SLOT_GAP, labelY);
  }

  positionRecipeSectionLabels(gridX, labelY) {
    const page = this.getCurrentRecipePage();

    this.overlayColdLabel.setText(page?.label ?? '');
    this.overlayColdLabel.setTint(COLORS.textDark);
    this.setOverlayRestAlpha(this.overlayColdLabel, 0.68);
    this.setOverlayRestPosition(this.overlayColdLabel, gridX, labelY);

    this.overlayDryLabel.setText('');
    this.setOverlayRestAlpha(this.overlayDryLabel, 0);
    this.setOverlayRestPosition(this.overlayDryLabel, gridX, labelY);
  }

  positionSettingsSectionLabels(gridX, labelY) {
    this.overlayColdLabel.setText('SETTINGS');
    this.overlayColdLabel.setTint(COLORS.textDark);
    this.setOverlayRestAlpha(this.overlayColdLabel, 0.68);
    this.setOverlayRestPosition(this.overlayColdLabel, gridX, labelY);

    this.overlayDryLabel.setText('');
    this.setOverlayRestAlpha(this.overlayDryLabel, 0);
    this.setOverlayRestPosition(this.overlayDryLabel, gridX, labelY);
  }

  drawSettingsContent(gridX, gridY, gridWidth, gridHeight, previewX, previewY, previewWidth, previewHeight) {
    this.overlayPageTexts.forEach((text) => text.setVisible(false));
    this.overlayPageZones.forEach((zone) => zone.setVisible(false));
    this.overlaySlotZones.forEach((zone) => zone.setVisible(false));
    this.recipePageTexts.forEach((text) => text.setVisible(false));
    this.recipePageZones.forEach((zone) => zone.setVisible(false));
    this.recipeEntryZones.forEach((zone) => zone.setVisible(false));
    this.recipeScrollbarZone.setVisible(false);
    this.hidePreviewEntry();
    this.hideRecipePreviewEntry();
    this.hidePreviewJapaneseName();
    this.previewTraits.hideImmediate();
    this.hideEmptyPreviewMessage();

    const contentX = gridX;
    const contentY = gridY;
    const contentWidth = previewX + previewWidth - gridX;
    const contentHeight = Math.max(gridHeight, previewY + previewHeight - gridY);

    this.overlayGraphics.fillStyle(COLORS.slotDryInner, 1);
    this.overlayGraphics.fillRect(contentX - 4, contentY - 4, contentWidth + 8, contentHeight + 8);
  }

  drawRecipeGrid(gridX, gridY, viewportWidth, viewportHeight, cellWidth, cellHeight, rowCount) {
    const page = this.getCurrentRecipePage();
    const entries = this.getRecipeEntriesForPage(page);
    const contentHeight = rowCount * cellHeight + Math.max(0, rowCount - 1) * RECIPE_CELL_GAP;
    const maxScroll = this.getRecipeMaxScrollOffset();
    const scrollOffset = this.clampCurrentRecipeScrollOffset();
    const viewportBottom = gridY + viewportHeight;
    const scrollBarX = gridX + viewportWidth + RECIPE_SCROLLBAR_GAP;

    this.ensureRecipeEntryZones(entries.length);
    this.updateRecipeGridMask(gridX, gridY, viewportWidth, viewportHeight);

    entries.forEach((entry, index) => {
      const column = index % RECIPE_COLUMNS;
      const row = Math.floor(index / RECIPE_COLUMNS);
      const cellX = gridX + column * (cellWidth + RECIPE_CELL_GAP);
      const cellY = gridY + row * (cellHeight + RECIPE_CELL_GAP) - scrollOffset;
      const isActive = this.recipeHoverIndex === index || this.recipeFocusIndex === index;
      const availableIconHeight = entry.unlocked ? cellHeight - 48 : cellHeight - 12;
      const iconSize = Math.max(18, Math.min(cellWidth - 18, availableIconHeight) * RECIPE_GRID_ICON_SCALE);
      const centerX = Math.round(cellX + cellWidth / 2);
      const centerY = entry.unlocked
        ? Math.round(cellY + 32)
        : Math.round(cellY + cellHeight / 2);
      const isVisible = cellY < viewportBottom && cellY + cellHeight > gridY;

      if (!isVisible) {
        if (entry.iconObject?.scene) {
          entry.iconObject.clearMask?.();
          entry.iconObject.setVisible(false);
        }
        this.hideRecipeGridLabels(entry);
        this.recipeEntryZones[index]?.setVisible(false);
        return;
      }

      if (isActive) {
        const highlightY = Math.max(cellY, gridY);
        const highlightBottom = Math.min(cellY + cellHeight, viewportBottom);

        this.overlayGraphics.fillStyle(COLORS.highlight, entry.unlocked ? 0.32 : 0.18);
        this.overlayGraphics.fillRect(cellX, highlightY, cellWidth, Math.max(0, highlightBottom - highlightY));
      }

      if (entry.iconObject?.scene) {
        entry.iconObject.setVisible(true);
        entry.iconObject.setDepth(UI_DEPTHS.overlay + 3);
        entry.iconObject.restAlpha = 1;
        entry.iconObject.setMask(this.recipeGridMask);
        this.setRecipeObjectSilhouette(entry.iconObject, !entry.unlocked);
        this.drawRecipeGridIconShade(entry.iconObject, centerX, centerY, iconSize, !entry.unlocked, gridY, viewportBottom);
        this.positionIcon(entry.iconObject, centerX, centerY, iconSize);
        entry.iconObject.restY = Math.round(centerY);
      }

      this.positionRecipeGridLabels(entry, centerX, cellY, cellWidth, gridY, viewportBottom);
      this.positionRecipeEntryZone(index, cellX, cellY, cellWidth, cellHeight, gridY, viewportBottom);
    });

    for (let index = entries.length; index < this.recipeEntryZones.length; index += 1) {
      this.recipeEntryZones[index].setVisible(false);
    }

    this.drawRecipeScrollbar(scrollBarX, gridY, viewportHeight, contentHeight, scrollOffset, maxScroll);
    this.overlayBounds.recipeRowCount = rowCount;
    this.overlayBounds.recipeContentHeight = contentHeight;
    this.overlayBounds.recipeViewportHeight = viewportHeight;
  }

  fitRecipeGridText(text, value, maxWidth) {
    const fullValue = (value ?? '').toString();

    text.setText(fullValue);

    if ((text.width ?? 0) <= maxWidth) {
      return Boolean(fullValue);
    }

    let clippedValue = fullValue;

    while (clippedValue.length > 1) {
      clippedValue = clippedValue.slice(0, -1);
      text.setText(`${clippedValue}...`);

      if ((text.width ?? 0) <= maxWidth) {
        return true;
      }
    }

    text.setText('');
    return false;
  }

  positionRecipeGridLabels(entry, centerX, cellY, cellWidth, viewportTop, viewportBottom) {
    if (!entry.unlocked) {
      this.hideRecipeGridLabels(entry);
      return;
    }

    const nameText = entry.nameText;

    if (!nameText?.scene) {
      return;
    }

    const maxWidth = Math.max(20, cellWidth - 8);
    const nameY = Math.round(cellY + 66);
    const isVisible = nameY >= viewportTop && nameY + RECIPE_GRID_LABEL_SIZE <= viewportBottom;
    const hasName = this.fitRecipeGridText(nameText, entry.name, maxWidth);

    nameText.setTint(COLORS.textDark);
    nameText.setMask(this.recipeGridMask);

    nameText.setVisible(isVisible && hasName);
    this.setOverlayRestAlpha(nameText, 0.92);
    this.setOverlayRestPosition(nameText, centerX, nameY);
  }

  hideRecipeGridLabels(entry) {
    [entry?.nameText].forEach((text) => {
      if (text?.scene) {
        text.clearMask?.();
        text.setVisible(false);
      }
    });
  }

  updateRecipeGridMask(x, y, width, height) {
    this.recipeMaskGraphics.clear();
    this.recipeMaskGraphics.fillStyle(0xffffff, 1);
    this.recipeMaskGraphics.fillRect(x, y, width, height);
    this.recipeMaskGraphics.restY = 0;
    this.recipeMaskGraphics.restAlpha = 0;
    this.recipeMaskGraphics.setAlpha(0);
  }

  drawRecipeGridIconShade(iconObject, centerX, centerY, iconSize, isMuted, viewportTop, viewportBottom) {
    if (isMuted) {
      return;
    }

    const naturalWidth = iconObject.width ?? iconObject.displayWidth ?? iconSize;
    const naturalHeight = iconObject.height ?? iconObject.displayHeight ?? iconSize;
    const visibleBounds = this.getIconVisibleBounds(iconObject, naturalWidth, naturalHeight);
    const fitWidth = visibleBounds ? visibleBounds.right - visibleBounds.left : naturalWidth;
    const fitHeight = visibleBounds ? visibleBounds.bottom - visibleBounds.top : naturalHeight;
    const scale = Math.min(iconSize / fitWidth, iconSize / fitHeight);
    const shadeWidth = Math.max(12, Math.round(fitWidth * scale * 0.72));
    const shadeHeight = Math.max(4, Math.round(fitHeight * scale * 0.16));
    const shadeY = Math.round(centerY + fitHeight * scale * 0.36);

    if (shadeY - shadeHeight / 2 < viewportTop || shadeY + shadeHeight / 2 > viewportBottom) {
      return;
    }

    this.overlayGraphics.fillStyle(COLORS.shadow, 0.14);
    this.overlayGraphics.fillEllipse(centerX, shadeY, shadeWidth, shadeHeight);
  }

  drawRecipeScrollbar(x, y, height, contentHeight, scrollOffset, maxScroll) {
    this.overlayGraphics.fillStyle(COLORS.shadow, 0.16);
    this.overlayGraphics.fillRect(x, y, RECIPE_SCROLLBAR_WIDTH, height);
    this.overlayGraphics.fillStyle(COLORS.panelInset, 0.72);
    this.overlayGraphics.fillRect(x + 2, y + 2, RECIPE_SCROLLBAR_WIDTH - 4, height - 4);

    const thumbHeight = maxScroll > 0
      ? Math.max(28, Math.floor((height / contentHeight) * height))
      : height - 4;
    const thumbTravel = Math.max(0, height - 4 - thumbHeight);
    const thumbY = y + 2 + (maxScroll > 0 ? Math.round((scrollOffset / maxScroll) * thumbTravel) : 0);

    this.overlayGraphics.fillStyle(COLORS.outer, 1);
    this.overlayGraphics.fillRect(x + 2, thumbY, RECIPE_SCROLLBAR_WIDTH - 4, thumbHeight);
    this.overlayGraphics.fillStyle(COLORS.highlight, 0.28);
    this.overlayGraphics.fillRect(x + 4, thumbY + 3, RECIPE_SCROLLBAR_WIDTH - 8, Math.max(2, thumbHeight - 6));

    this.overlayBounds.recipeScrollbar = {
      x,
      y,
      height,
      contentHeight,
      maxScroll,
      thumbY,
      thumbHeight,
      thumbTravel,
    };
    this.setOverlayZoneRestPosition(this.recipeScrollbarZone, x, y);
    this.recipeScrollbarZone.setSize(RECIPE_SCROLLBAR_WIDTH, height);
    this.recipeScrollbarZone.input.hitArea.setTo(0, 0, RECIPE_SCROLLBAR_WIDTH, height);
    this.recipeScrollbarZone.setVisible(this.currentOverlayMode === 'recipes' && this.isOverlayOpen);
  }

  ensureRecipeEntryZones(count) {
    for (let index = this.recipeEntryZones.length; index < count; index += 1) {
      const zone = this.scene.add.zone(0, 0, 1, 1);

      zone.setOrigin(0, 0);
      zone.setDepth(UI_DEPTHS.overlay + 2);
      zone.setInteractive({ cursor: 'pointer' });
      zone.setVisible(false);
      zone.on('pointerdown', () => this.handleRecipeEntryPointerDown(index));
      zone.on('pointerover', () => this.setRecipeHoverIndex(index));
      zone.on('pointerout', () => this.setRecipeHoverIndex(null, index));
      this.recipeEntryZones.push(zone);
    }
  }

  positionRecipeEntryZone(index, x, y, width, height, viewportTop = y, viewportBottom = y + height) {
    const zone = this.recipeEntryZones[index];

    if (!zone) {
      return;
    }

    const clippedY = Math.max(y, viewportTop);
    const clippedBottom = Math.min(y + height, viewportBottom);
    const clippedHeight = Math.max(0, clippedBottom - clippedY);

    if (clippedHeight <= 0) {
      zone.setVisible(false);
      return;
    }

    this.setOverlayZoneRestPosition(zone, x, clippedY);
    zone.setSize(width, clippedHeight);
    zone.input.hitArea.setTo(0, 0, width, clippedHeight);
    zone.input.cursor = 'pointer';
    zone.setVisible(this.currentOverlayMode === 'recipes' && this.isOverlayOpen);
  }

  setRecipeHoverIndex(index, leavingIndex = null) {
    if (!this.isOverlayOpen || this.currentOverlayMode !== 'recipes') {
      return;
    }

    if (index === null && leavingIndex !== null && this.recipeHoverIndex !== leavingIndex) {
      return;
    }

    if (this.recipeHoverIndex === index) {
      return;
    }

    this.recipeHoverIndex = index;
    this.drawOverlay();
  }

  handleSceneWheel(pointer, _gameObjects, _deltaX, deltaY) {
    if (
      !this.isOverlayOpen
      || this.currentOverlayMode !== 'recipes'
      || !this.isPointInsideRecipeGrid(pointer.x, pointer.y)
    ) {
      return;
    }

    const scrollDelta = Phaser.Math.Clamp(
      deltaY * 0.35,
      -RECIPE_SCROLL_WHEEL_STEP,
      RECIPE_SCROLL_WHEEL_STEP,
    );

    if (scrollDelta === 0) {
      return;
    }

    this.setCurrentRecipeScrollOffset(
      this.getCurrentRecipeScrollOffset() + scrollDelta,
    );
  }

  handleRecipeScrollbarPointerDown(pointer) {
    if (!this.isOverlayOpen || this.currentOverlayMode !== 'recipes') {
      return;
    }

    const scrollbar = this.overlayBounds?.recipeScrollbar;

    if (!scrollbar || scrollbar.maxScroll <= 0) {
      return;
    }

    const pointerY = pointer.y;
    const isInsideThumb = pointerY >= scrollbar.thumbY
      && pointerY <= scrollbar.thumbY + scrollbar.thumbHeight;

    if (!isInsideThumb) {
      const targetThumbY = pointerY - scrollbar.thumbHeight / 2;
      const ratio = scrollbar.thumbTravel > 0
        ? Phaser.Math.Clamp((targetThumbY - scrollbar.y - 2) / scrollbar.thumbTravel, 0, 1)
        : 0;

      this.setCurrentRecipeScrollOffset(ratio * scrollbar.maxScroll);
    }

    this.beginRecipeScrollbarDrag(pointer);
  }

  beginRecipeScrollbarDrag(pointer) {
    const scrollbar = this.overlayBounds?.recipeScrollbar;

    if (!scrollbar || scrollbar.maxScroll <= 0) {
      return;
    }

    this.endRecipeScrollbarDrag();
    this.recipeScrollbarDrag = {
      pointerId: pointer.id,
      startY: pointer.y,
      startOffset: this.getCurrentRecipeScrollOffset(),
      thumbTravel: scrollbar.thumbTravel,
      maxScroll: scrollbar.maxScroll,
    };

    this.recipeScrollbarMoveHandler = (movePointer) => this.handleRecipeScrollbarDragMove(movePointer);
    this.recipeScrollbarUpHandler = () => this.endRecipeScrollbarDrag();
    this.scene.input.on('pointermove', this.recipeScrollbarMoveHandler);
    this.scene.input.once('pointerup', this.recipeScrollbarUpHandler);
    this.scene.input.once('pointerupoutside', this.recipeScrollbarUpHandler);
  }

  handleRecipeScrollbarDragMove(pointer) {
    if (!this.recipeScrollbarDrag || pointer.id !== this.recipeScrollbarDrag.pointerId) {
      return;
    }

    const {
      startY,
      startOffset,
      thumbTravel,
      maxScroll,
    } = this.recipeScrollbarDrag;
    const offsetDelta = thumbTravel > 0
      ? ((pointer.y - startY) / thumbTravel) * maxScroll
      : 0;

    this.setCurrentRecipeScrollOffset(startOffset + offsetDelta);
  }

  endRecipeScrollbarDrag() {
    if (this.recipeScrollbarMoveHandler) {
      this.scene.input.off('pointermove', this.recipeScrollbarMoveHandler);
      this.recipeScrollbarMoveHandler = null;
    }

    if (this.recipeScrollbarUpHandler) {
      this.scene.input.off('pointerup', this.recipeScrollbarUpHandler);
      this.scene.input.off('pointerupoutside', this.recipeScrollbarUpHandler);
      this.recipeScrollbarUpHandler = null;
    }

    this.recipeScrollbarDrag = null;
  }

  isPointInsideRecipeGrid(x, y) {
    if (!this.overlayBounds) {
      return false;
    }

    const {
      gridX,
      gridY,
      gridWidth,
      gridHeight,
    } = this.overlayBounds;

    return x >= gridX
      && x <= gridX + gridWidth
      && y >= gridY
      && y <= gridY + gridHeight;
  }

  getCurrentRecipeScrollOffset() {
    return this.recipeScrollOffsets[this.currentRecipePageIndex] ?? 0;
  }

  setCurrentRecipeScrollOffset(offset) {
    const clampedOffset = Phaser.Math.Clamp(offset, 0, this.getRecipeMaxScrollOffset());

    if (this.getCurrentRecipeScrollOffset() === clampedOffset) {
      return;
    }

    this.recipeScrollOffsets[this.currentRecipePageIndex] = clampedOffset;
    this.recipeHoverIndex = null;
    this.drawOverlay();
  }

  clampCurrentRecipeScrollOffset() {
    const clampedOffset = Phaser.Math.Clamp(
      this.getCurrentRecipeScrollOffset(),
      0,
      this.getRecipeMaxScrollOffset(),
    );

    this.recipeScrollOffsets[this.currentRecipePageIndex] = clampedOffset;
    return clampedOffset;
  }

  getRecipeMaxScrollOffset() {
    const rowCount = this.overlayBounds?.recipeRowCount
      ?? Math.max(1, Math.ceil(this.getRecipeEntriesForPage().length / RECIPE_COLUMNS));
    const viewportHeight = this.overlayBounds?.recipeViewportHeight ?? this.overlayBounds?.gridHeight ?? 0;
    const contentHeight = rowCount * RECIPE_CELL_HEIGHT + Math.max(0, rowCount - 1) * RECIPE_CELL_GAP;

    return Math.max(0, contentHeight - viewportHeight);
  }

  handleRecipeEntryPointerDown(index) {
    const entries = this.getRecipeEntriesForPage();

    if (!entries[index]) {
      return;
    }

    this.recipeFocusIndex = index;
    this.drawOverlay();
  }

  getCurrentRecipePage() {
    return this.recipePages[this.currentRecipePageIndex] ?? this.recipePages[0] ?? null;
  }

  getRecipeEntriesForPage(page = this.getCurrentRecipePage()) {
    return (page?.entries ?? [])
      .map((entry, index) => ({ entry, index }))
      .sort((a, b) => {
        const unlockedOrder = Number(Boolean(b.entry.unlocked)) - Number(Boolean(a.entry.unlocked));

        return unlockedOrder || a.index - b.index;
      })
      .map(({ entry }) => entry);
  }

  getRecipePreviewEntry() {
    const entries = this.getRecipeEntriesForPage();
    const index = this.recipeHoverIndex ?? this.recipeFocusIndex;

    return entries[index] ?? entries[0] ?? null;
  }

  drawRecipePreviewContent(previewX, previewY, previewWidth, previewHeight) {
    const entry = this.getRecipePreviewEntry();

    this.previewTraits.hideImmediate();
    this.hidePreviewEntry();

    if (!entry) {
      this.hideRecipePreviewEntry();
      this.hidePreviewJapaneseName();
      this.showEmptyPreviewMessage(previewX, previewY, previewWidth, previewHeight);
      return;
    }

    this.hideEmptyPreviewMessage();

    const centerX = Math.round(previewX + previewWidth / 2);
    const objectCenterY = Math.round(previewY + previewHeight * 0.34);
    const panelLayout = this.getPreviewTraitPanelLayout(previewX, previewY, previewWidth, previewHeight);

    this.showRecipePreviewEntry(entry, centerX, objectCenterY, previewWidth, previewHeight);
    this.drawRecipeIngredientStrip(entry, previewX, previewY, previewWidth, previewHeight);
    if (entry.unlocked) {
      this.showPreviewJapaneseName(entry.dishObject, previewX, previewY, previewWidth, previewHeight, panelLayout.y);
    } else {
      this.hidePreviewJapaneseName();
    }
  }

  showRecipePreviewEntry(entry, centerX, centerY, previewWidth, previewHeight) {
    if (this.recipePreviewEntry && this.recipePreviewEntry !== entry) {
      this.hideRecipePreviewEntry();
    }

    const object = entry.dishObject;

    if (!object?.scene && !entry.previewIconObject?.scene) {
      this.recipePreviewEntry = null;
      return;
    }

    this.recipePreviewEntry = entry;

    if (entry.unlocked) {
      entry.previewIconObject?.setVisible(false);
      object.setVisible(true);
      object.disableInteractive?.();
      object.setDepth(UI_DEPTHS.overlay + 3);
      object.setPosition(centerX, centerY);
      object.restY = centerY;
      object.restAlpha = 1;
      this.setRecipeObjectSilhouette(object, false);
      return;
    }

    if (object?.scene) {
      this.setRecipeObjectSilhouette(object, false);
      object.setVisible(false);
    }

    const previewIconObject = entry.previewIconObject;

    if (!previewIconObject?.scene) {
      return;
    }

    const objectWidth = object?.displayWidth ?? previewIconObject.width ?? 48;
    const objectHeight = object?.displayHeight ?? previewIconObject.height ?? 48;
    const maxSize = Math.max(
      28,
      Math.min(Math.max(objectWidth, objectHeight), previewWidth * 0.72, previewHeight * 0.34),
    );

    previewIconObject.setVisible(true);
    previewIconObject.setDepth(UI_DEPTHS.overlay + 3);
    previewIconObject.restAlpha = 1;
    previewIconObject.clearMask?.();
    this.setRecipeObjectSilhouette(previewIconObject, true);
    this.positionIcon(previewIconObject, centerX, centerY, maxSize);
    previewIconObject.restY = Math.round(centerY);
  }

  hideRecipePreviewEntry() {
    const entry = this.recipePreviewEntry;
    const object = entry?.dishObject;

    if (object?.scene) {
      this.setRecipeObjectSilhouette(object, false);
      object.clearMask?.();
      object.setVisible(false);
    }

    if (entry?.previewIconObject?.scene) {
      this.setRecipeObjectSilhouette(entry.previewIconObject, false);
      entry.previewIconObject.clearMask?.();
      entry.previewIconObject.setVisible(false);
    }

    (entry?.ingredients ?? []).forEach((ingredient) => {
      if (ingredient.iconObject?.scene) {
        this.setRecipeObjectSilhouette(ingredient.iconObject, false);
        ingredient.iconObject.clearMask?.();
        ingredient.iconObject.setVisible(false);
      }
    });

    this.hidePreviewJapaneseName();
    this.recipePreviewEntry = null;
  }

  drawRecipeIngredientStrip(entry, previewX, previewY, previewWidth, previewHeight) {
    const ingredients = entry.ingredients ?? [];
    const panelLayout = this.getPreviewTraitPanelLayout(previewX, previewY, previewWidth, previewHeight);
    const iconSize = 26;
    const iconGap = 8;
    const requiredIngredients = ingredients.filter((ingredient) => !ingredient.optional);
    const optionalIngredients = ingredients.filter((ingredient) => ingredient.optional);
    const groupWidth = (group) => group.length * iconSize + Math.max(0, group.length - 1) * iconGap;
    const requiredWidth = groupWidth(requiredIngredients);
    const optionalWidth = groupWidth(optionalIngredients);
    const hasOptionalGroup = optionalIngredients.length > 0;
    const groupBlockWidth = hasOptionalGroup ? Math.max(requiredWidth, optionalWidth) + 18 : 0;
    const groupBlockHeight = 50;
    const groupBlockY = Math.round(panelLayout.y + 22);
    const totalWidth = hasOptionalGroup
      ? groupBlockWidth * 2 + RECIPE_INGREDIENT_GROUP_GAP
      : groupWidth(ingredients);
    const startX = Math.round(panelLayout.x + (panelLayout.width - totalWidth) / 2);
    const requiredBlockX = startX;
    const optionalBlockX = startX + groupBlockWidth + RECIPE_INGREDIENT_GROUP_GAP;
    const requiredStartX = hasOptionalGroup
      ? Math.round(requiredBlockX + (groupBlockWidth - requiredWidth) / 2)
      : startX;
    const optionalStartX = Math.round(optionalBlockX + (groupBlockWidth - optionalWidth) / 2);
    const iconY = hasOptionalGroup
      ? Math.round(groupBlockY + 19)
      : Math.round(panelLayout.y + panelLayout.height - 44);
    const nameY = hasOptionalGroup ? Math.round(panelLayout.y + 8) : iconY - 17;
    const name = entry.unlocked ? entry.name : 'LOCKED RECIPE';

    this.overlayGraphics.fillStyle(COLORS.slotDryInner, 1);
    this.overlayGraphics.fillRect(panelLayout.x, panelLayout.y, panelLayout.width, panelLayout.height);

    this.previewEmptyLabel.setText(name);
    this.previewEmptyLabel.setTint(entry.unlocked ? COLORS.textDark : COLORS.lock);
    this.previewEmptyLabel.setVisible(true);
    this.setOverlayRestAlpha(this.previewEmptyLabel, entry.unlocked ? 0.72 : 0.46);
    this.setOverlayRestPosition(
      this.previewEmptyLabel,
      Math.round(panelLayout.x + (panelLayout.width - (this.previewEmptyLabel.width ?? 0)) / 2),
      nameY,
    );

    if (hasOptionalGroup) {
      this.overlayGraphics.fillStyle(COLORS.panelInset, entry.unlocked ? 0.78 : 0.5);
      this.overlayGraphics.fillRect(requiredBlockX, groupBlockY, groupBlockWidth, groupBlockHeight);
      this.overlayGraphics.fillRect(optionalBlockX, groupBlockY, groupBlockWidth, groupBlockHeight);

      this.positionRecipeIngredientGroupLabel(0, 'REQUIRED', requiredBlockX, groupBlockWidth, groupBlockY + 4, entry.unlocked);
      this.positionRecipeIngredientGroupLabel(
        1,
        'OPTIONAL',
        optionalBlockX,
        groupBlockWidth,
        groupBlockY + 4,
        entry.unlocked,
      );
    }

    const positionedIngredients = hasOptionalGroup
      ? [
        ...requiredIngredients.map((ingredient, index) => ({
          ingredient,
          index,
          startX: requiredStartX,
          isOptional: false,
        })),
        ...optionalIngredients.map((ingredient, index) => ({
          ingredient,
          index,
          startX: optionalStartX,
          isOptional: true,
        })),
      ]
      : ingredients.map((ingredient, index) => ({ ingredient, index, startX, isOptional: false }));

    positionedIngredients.forEach(({ ingredient, index, startX: groupStartX, isOptional }) => {
      const iconObject = ingredient.iconObject;

      if (!iconObject?.scene) {
        return;
      }

      const centerX = Math.round(groupStartX + index * (iconSize + iconGap) + iconSize / 2);
      const centerY = Math.round(iconY + iconSize / 2);

      iconObject.setVisible(true);
      iconObject.setDepth(UI_DEPTHS.overlay + 4);
      iconObject.restAlpha = isOptional && entry.unlocked ? 0.62 : 1;
      this.setRecipeObjectSilhouette(iconObject, !entry.unlocked);
      this.positionIcon(iconObject, centerX, centerY, iconSize);
      iconObject.restY = centerY;
    });
  }

  positionRecipeIngredientGroupLabel(index, label, groupX, groupWidth, y, isUnlocked) {
    const text = this.recipeIngredientGroupLabels[index];

    if (!text) {
      return;
    }

    text.setText(label);
    text.setTint(COLORS.textDark);
    text.setVisible(true);
    this.setOverlayRestAlpha(text, isUnlocked ? 0.46 : 0.28);
    this.setOverlayRestPosition(
      text,
      Math.round(groupX + (groupWidth - (text.width ?? 0)) / 2),
      Math.round(y),
    );
  }

  setRecipeObjectSilhouette(object, isSilhouette) {
    const applyToObject = (target) => {
      if (!target) {
        return;
      }

      if (isSilhouette) {
        if (target.setTintFill) {
          target.setTintFill(COLORS.outer);
        } else {
          target.setTint?.(COLORS.outer);
        }
      } else {
        target.clearTint?.();
      }
    };

    applyToObject(object);

    if (Array.isArray(object?.list)) {
      object.list.forEach((child) => applyToObject(child));
    }
  }

  drawOverlaySlots(gridX, gridY, slotSize, rowCount, isPageUnlocked) {
    for (let index = 0; index < INVENTORY_SLOTS_PER_PAGE; index += 1) {
      const column = index % INVENTORY_COLUMNS;
      const row = Math.floor(index / INVENTORY_COLUMNS);
      const slotX = gridX + column * (slotSize + OVERLAY_SLOT_GAP);
      const slotY = gridY + row * (slotSize + OVERLAY_SLOT_GAP);
      const isRefrigerated = this.isInventorySlotRefrigerated(index);
      const item = this.getLargeSlotItem(this.currentOverlayPage, index);
      const isHovered = this.overlayHoverSlotIndex === index
        || this.overlayDragHoverSlotIndex === index
        || this.overlayFocusSlotIndex === index;

      this.drawOverlaySlot(slotX, slotY, slotSize, {
        item,
        isHovered,
        isPageUnlocked,
        isRefrigerated,
      });
      this.positionOverlaySlotZone(index, slotX, slotY, slotSize, isPageUnlocked);
    }
  }

  drawOverlaySlot(slotX, slotY, slotSize, options) {
    const { item, isHovered, isPageUnlocked, isRefrigerated } = options;
    const isEmpty = !item || item === this.inventoryDrag?.entry;
    const outerColor = isPageUnlocked
      ? (isRefrigerated ? COLORS.slotCold : COLORS.slotDry)
      : COLORS.slotLocked;
    const innerColor = isPageUnlocked
      ? (isRefrigerated ? COLORS.slotColdInner : COLORS.slotDryInner)
      : COLORS.slotLockedInner;

    const showHoverBorder = isHovered && isPageUnlocked;

    this.overlayGraphics.fillStyle(showHoverBorder ? COLORS.highlight : outerColor, 1);
    this.overlayGraphics.fillRect(slotX, slotY, slotSize, slotSize);
    this.overlayGraphics.fillStyle(innerColor, isPageUnlocked ? 1 : 0.75);
    this.overlayGraphics.fillRect(slotX + 2, slotY + 2, slotSize - 4, slotSize - 4);

    if (isPageUnlocked && isEmpty) {
      this.drawEmptyPlus(slotX, slotY, slotSize, this.overlayGraphics);
    }

    if (isPageUnlocked && item) {
      this.drawLargeSlotItem(slotX, slotY, slotSize, item);
    }
  }

  drawSmallLock(x, y, size, color, alpha) {
    const shackleWidth = Math.max(4, size - 2);
    const shackleHeight = Math.max(3, Math.floor(size * 0.45));
    const bodyHeight = Math.max(4, Math.floor(size * 0.55));

    this.overlayGraphics.fillStyle(color, alpha);
    this.overlayGraphics.fillRect(x + 1, y + shackleHeight, size, bodyHeight);
    this.overlayGraphics.fillRect(x + 2, y + 1, 2, shackleHeight);
    this.overlayGraphics.fillRect(x + shackleWidth - 1, y + 1, 2, shackleHeight);
    this.overlayGraphics.fillRect(x + 3, y, Math.max(1, shackleWidth - 3), 2);
  }

  drawLockedPageOverlay(gridX, gridY, gridWidth, gridHeight) {
    const pixel = 4;
    const lockWidth = pixel * 9;
    const lockHeight = pixel * 9;
    const x = Math.round(gridX + (gridWidth - lockWidth) / 2);
    const y = Math.round(gridY + (gridHeight - lockHeight) / 2);

    this.overlayGraphics.fillStyle(COLORS.text, 0.88);
    this.overlayGraphics.fillRect(x + pixel * 2, y, pixel * 5, pixel);
    this.overlayGraphics.fillRect(x + pixel, y + pixel, pixel, pixel * 3);
    this.overlayGraphics.fillRect(x + pixel * 7, y + pixel, pixel, pixel * 3);
    this.overlayGraphics.fillRect(x + pixel * 2, y + pixel * 3, pixel * 5, pixel);
    this.overlayGraphics.fillRect(x, y + pixel * 4, lockWidth, pixel * 5);
    this.overlayGraphics.fillStyle(COLORS.shadow, 0.16);
    this.overlayGraphics.fillRect(x + pixel * 4, y + pixel * 6, pixel, pixel * 2);
  }

  drawLargeSlotItem(slotX, slotY, slotSize, item) {
    if (item === this.inventoryDrag?.entry) {
      return;
    }

    const centerX = slotX + slotSize / 2;
    const centerY = slotY + slotSize / 2;
    const maxSize = Math.max(4, slotSize - ICON_PADDING * 2);

    if (item.iconObject?.scene) {
      item.iconObject.setVisible(true);
      item.iconObject.setDepth(UI_DEPTHS.overlay + 3);
      item.iconObject.restAlpha = 1;
      this.positionIcon(item.iconObject, centerX, centerY, maxSize);
      item.iconObject.restY = Math.round(centerY);
      return;
    }

    const size = Math.max(4, Math.floor(slotSize * 0.48));
    const itemX = Math.round(centerX - size / 2);
    const itemY = Math.round(centerY - size / 2);

    this.overlayGraphics.fillStyle(COLORS.shadow, 0.2);
    this.overlayGraphics.fillRect(itemX + 1, itemY + 2, size, size);
    this.overlayGraphics.fillStyle(item.color ?? DEFAULT_ICON_COLOR, 1);
    this.overlayGraphics.fillRect(itemX, itemY, size, size);
    this.overlayGraphics.fillStyle(COLORS.text, 0.25);
    this.overlayGraphics.fillRect(itemX + 2, itemY + 2, Math.max(2, size - 4), 2);
  }

  positionOverlaySlotZone(index, slotX, slotY, slotSize, isPageUnlocked) {
    const zone = this.overlaySlotZones[index];

    if (!zone) {
      return;
    }

    const item = this.getLargeSlotItem(this.currentOverlayPage, index);

    this.setOverlayZoneRestPosition(zone, slotX, slotY);
    zone.setSize(slotSize, slotSize);
    zone.input.hitArea.setTo(0, 0, slotSize, slotSize);
    zone.input.cursor = isPageUnlocked && item
      ? 'grab'
      : 'default';
  }

  setOverlayHoverSlotIndex(index, leavingIndex = null) {
    if (!this.isOverlayOpen) {
      return;
    }

    if (
      index !== null
      && !this.inventoryDrag
      && !this.getLargeSlotItem(this.currentOverlayPage, index)
    ) {
      return;
    }

    if (index === null && leavingIndex !== null && this.overlayHoverSlotIndex !== leavingIndex) {
      return;
    }

    if (this.overlayHoverSlotIndex === index) {
      return;
    }

    this.overlayHoverSlotIndex = index;
    this.drawOverlay();
  }

  handleOverlaySlotPointerDown(slotIndex, pointer) {
    if (!this.isInventoryPageUnlocked(this.currentOverlayPage)) {
      return;
    }

    if (!this.getLargeSlotItem(this.currentOverlayPage, slotIndex)) {
      return;
    }

    this.armInventoryDrag({
      type: 'large',
      pageIndex: this.currentOverlayPage,
      slotIndex,
    }, pointer);
  }

  handleHotbarInventoryPointerDown(slotIndex, pointer) {
    if (!this.slotItems[slotIndex]) {
      return;
    }

    this.armInventoryDrag({
      type: 'hotbar',
      slotIndex,
    }, pointer);
  }

  armInventoryDrag(source, pointer) {
    const entry = this.getInventoryEntryAt(source);

    if (!entry || this.inventoryDrag || this.pendingInventoryDrag) {
      return;
    }

    const startX = pointer.x;
    const startY = pointer.y;

    this.pendingInventoryDrag = { source, entry, startX, startY };

    this.pendingInventoryDragMoveHandler = (movePointer) => {
      if (!this.pendingInventoryDrag) {
        return;
      }

      const dx = movePointer.x - startX;
      const dy = movePointer.y - startY;

      if (Math.hypot(dx, dy) < INVENTORY_DRAG_THRESHOLD) {
        return;
      }

      const armed = this.pendingInventoryDrag;

      this.clearPendingInventoryDrag();
      this.beginInventoryDrag(armed.source, armed.entry, movePointer);
    };

    this.pendingInventoryDragUpHandler = () => {
      const armed = this.pendingInventoryDrag;

      this.clearPendingInventoryDrag();

      if (!armed) {
        return;
      }

      this.handleInventoryClick(armed.source);
    };

    this.scene.input.on('pointermove', this.pendingInventoryDragMoveHandler);
    this.scene.input.once('pointerup', this.pendingInventoryDragUpHandler);
    this.scene.input.once('pointerupoutside', this.pendingInventoryDragUpHandler);
  }

  clearPendingInventoryDrag() {
    if (this.pendingInventoryDragMoveHandler) {
      this.scene.input.off('pointermove', this.pendingInventoryDragMoveHandler);
      this.pendingInventoryDragMoveHandler = null;
    }

    if (this.pendingInventoryDragUpHandler) {
      this.scene.input.off('pointerup', this.pendingInventoryDragUpHandler);
      this.scene.input.off('pointerupoutside', this.pendingInventoryDragUpHandler);
      this.pendingInventoryDragUpHandler = null;
    }

    this.pendingInventoryDrag = null;
  }

  handleInventoryClick(source) {
    if (source.type === 'hotbar') {
      if (!this.isOverlayOpen || this.currentOverlayMode !== 'inventory') {
        const entry = this.slotItems[source.slotIndex];

        if (!entry?.object) {
          return;
        }

        this.handleSlotClick(source.slotIndex, entry);
        return;
      }

      const entry = this.slotItems[source.slotIndex];

      if (!entry?.object) {
        return;
      }

      if (this.hotbarFocusIndex !== source.slotIndex || this.overlayFocusSlotIndex !== null) {
        this.hotbarFocusIndex = source.slotIndex;
        this.overlayFocusSlotIndex = null;
        this.draw();
        this.drawOverlay();
      }
      return;
    }

    if (source.type !== 'large' || source.pageIndex !== this.currentOverlayPage) {
      return;
    }

    if (this.overlayFocusSlotIndex !== source.slotIndex || this.hotbarFocusIndex !== null) {
      this.overlayFocusSlotIndex = source.slotIndex;
      this.hotbarFocusIndex = null;
      this.draw();
      this.drawOverlay();
    }
  }

  beginInventoryDrag(source, entry, pointer) {
    if (this.inventoryDrag) {
      return;
    }

    this.hidePreviewEntry();
    this.previewTraits.hideImmediate();

    const startX = pointer.x;
    const startY = pointer.y;

    this.inventoryDrag = {
      source,
      entry,
      startX,
      startY,
    };
    this.drawInventoryDragPreview(pointer.x, pointer.y, entry);
    this.setInventoryDragTarget(this.getInventoryDropTargetAt(pointer.x, pointer.y));

    this.inventoryDragMoveHandler = (movePointer) => this.handleInventoryDragMove(movePointer);
    this.inventoryDragUpHandler = (upPointer) => this.handleInventoryDragEnd(upPointer);
    this.scene.input.on('pointermove', this.inventoryDragMoveHandler);
    this.scene.input.once('pointerup', this.inventoryDragUpHandler);
    this.scene.input.once('pointerupoutside', this.inventoryDragUpHandler);
  }

  handleInventoryDragMove(pointer) {
    if (!this.inventoryDrag) {
      return;
    }

    this.drawInventoryDragPreview(pointer.x, pointer.y, this.inventoryDrag.entry);
    this.setInventoryDragTarget(this.getInventoryDropTargetAt(pointer.x, pointer.y));
  }

  handleInventoryDragEnd(pointer) {
    if (!this.inventoryDrag) {
      return;
    }

    const drag = this.inventoryDrag;
    const target = this.getInventoryDropTargetAt(pointer.x, pointer.y);

    if (target) {
      this.moveInventoryEntry(drag.source, target);
    } else if (this.shouldSpawnInventoryDragInScene(pointer.x, pointer.y)) {
      this.spawnInventoryEntryInScene(drag.source, drag.entry, pointer.x, pointer.y);
    }

    this.endInventoryDrag(true);
  }

  endInventoryDrag(shouldRedraw = true) {
    if (this.inventoryDragMoveHandler) {
      this.scene.input.off('pointermove', this.inventoryDragMoveHandler);
      this.inventoryDragMoveHandler = null;
    }

    if (this.inventoryDragUpHandler) {
      this.scene.input.off('pointerup', this.inventoryDragUpHandler);
      this.scene.input.off('pointerupoutside', this.inventoryDragUpHandler);
      this.inventoryDragUpHandler = null;
    }

    const draggedIcon = this.inventoryDrag?.entry?.iconObject;

    if (draggedIcon?.scene) {
      draggedIcon.setDepth(UI_DEPTHS.inventoryIcon);
    }

    this.inventoryDrag = null;
    this.overlayDragHoverSlotIndex = null;
    this.hotbarDragHoverIndex = null;
    this.inventoryDragGraphics.clear();
    this.inventoryDragGraphics.setVisible(false);

    if (shouldRedraw) {
      this.syncInventoryIconVisibility();
      this.draw();
      this.drawOverlay();
    }
  }

  drawInventoryDragPreview(x, y, entry) {
    const size = Math.max(16, Math.floor((this.bounds?.slotSize ?? MAX_SLOT_SIZE) * 0.88));
    const drawX = Math.round(x - size / 2);
    const drawY = Math.round(y - size / 2);

    this.inventoryDragGraphics.clear();

    if (entry.iconObject?.scene) {
      this.inventoryDragGraphics.setVisible(false);
      entry.iconObject.setVisible(true);
      entry.iconObject.setDepth(UI_DEPTHS.overlay + 5);
      this.positionIcon(entry.iconObject, x, y, Math.max(4, Math.round((size - ICON_PADDING * 2) * 1.25)));
      return;
    }

    this.inventoryDragGraphics.setVisible(true);
    this.drawInventoryEntryGlyph(this.inventoryDragGraphics, drawX, drawY, size, entry);
  }

  drawInventoryEntryGlyph(graphics, x, y, slotSize, entry) {
    const size = Math.max(4, Math.floor(slotSize * 0.48));
    const itemX = Math.round(x + (slotSize - size) / 2);
    const itemY = Math.round(y + (slotSize - size) / 2);

    graphics.fillStyle(COLORS.shadow, 0.2);
    graphics.fillRect(itemX + 1, itemY + 2, size, size);
    graphics.fillStyle(entry.color ?? DEFAULT_ICON_COLOR, 1);
    graphics.fillRect(itemX, itemY, size, size);
    graphics.fillStyle(COLORS.text, 0.25);
    graphics.fillRect(itemX + 2, itemY + 2, Math.max(2, size - 4), 2);
  }

  setInventoryDragTarget(target) {
    const overlaySlot = target?.type === 'large' ? target.slotIndex : null;
    const hotbarSlot = target?.type === 'hotbar' ? target.slotIndex : null;

    if (this.overlayDragHoverSlotIndex !== overlaySlot) {
      this.overlayDragHoverSlotIndex = overlaySlot;
      this.drawOverlay();
    }

    if (this.hotbarDragHoverIndex !== hotbarSlot) {
      this.hotbarDragHoverIndex = hotbarSlot;
      this.draw();
    }
  }

  getInventoryDropTargetAt(x, y) {
    const overlaySlotIndex = this.getOverlaySlotIndexAt(x, y);

    if (
      this.currentOverlayMode === 'inventory'
      && overlaySlotIndex !== null
      && this.isInventoryPageUnlocked(this.currentOverlayPage)
    ) {
      return {
        type: 'large',
        pageIndex: this.currentOverlayPage,
        slotIndex: overlaySlotIndex,
      };
    }

    const hotbarSlotIndex = this.getSlotIndexAt(x, y);

    if (hotbarSlotIndex !== null) {
      return {
        type: 'hotbar',
        slotIndex: hotbarSlotIndex,
      };
    }

    return null;
  }

  getOverlaySlotIndexAt(x, y) {
    if (!this.overlayBounds) {
      return null;
    }

    const {
      gridX,
      gridY,
      slotSize,
      rowCount,
    } = this.overlayBounds;
    const gridRight = gridX + INVENTORY_COLUMNS * slotSize + (INVENTORY_COLUMNS - 1) * OVERLAY_SLOT_GAP;
    const gridBottom = gridY + rowCount * slotSize + (rowCount - 1) * OVERLAY_SLOT_GAP;

    if (x < gridX || x >= gridRight || y < gridY || y >= gridBottom) {
      return null;
    }

    const columnStride = slotSize + OVERLAY_SLOT_GAP;
    const rowStride = slotSize + OVERLAY_SLOT_GAP;
    const column = Math.floor((x - gridX) / columnStride);
    const row = Math.floor((y - gridY) / rowStride);
    const slotX = gridX + column * columnStride;
    const slotY = gridY + row * rowStride;

    if (
      column < 0
      || column >= INVENTORY_COLUMNS
      || row < 0
      || row >= rowCount
      || x >= slotX + slotSize
      || y >= slotY + slotSize
    ) {
      return null;
    }

    return row * INVENTORY_COLUMNS + column;
  }

  moveInventoryEntry(source, target) {
    if (this.areInventoryLocationsEqual(source, target)) {
      return;
    }

    const sourceEntry = this.getInventoryEntryAt(source);

    if (!sourceEntry) {
      return;
    }

    const targetEntry = this.getInventoryEntryAt(target);

    this.setInventoryEntryAt(source, targetEntry);
    this.setInventoryEntryAt(target, sourceEntry);
    this.syncInventoryIconVisibility();
  }

  shouldSpawnInventoryDragInScene(x, y) {
    return this.isPointInsideVisibleArea(x, y)
      && !this.isPointInsideOverlay(x, y)
      && !this.isPointInsideInventoryBar(x, y);
  }

  isPointInsideVisibleArea(x, y) {
    if (!this.visibleArea) {
      return false;
    }

    return x >= this.visibleArea.left
      && x <= this.visibleArea.right
      && y >= this.visibleArea.top
      && y <= this.visibleArea.bottom;
  }

  spawnInventoryEntryInScene(source, entry, x, y) {
    const object = entry?.object;

    if (!(object instanceof DraggableObject) || !object.scene) {
      return false;
    }

    const spawnPosition = this.findInventorySceneSpawnPosition(object, x, y);

    if (!spawnPosition) {
      return false;
    }

    this.hideSlotTraits();
    this.setInventoryEntryAt(source, null);
    this.destroyIcon(entry.iconObject);
    entry.iconObject = null;

    object.detachFromStackParent?.();
    object.stopSnapBack?.();
    object.stopDropImpact?.();

    if (object.dragLiftTween) {
      object.dragLiftTween.stop();
      object.dragLiftTween = null;
    }

    object.currentLift = 0;
    object.setDragLift?.(0);
    object.setVisible(true);
    object.setInteractive(object.hitbox, Phaser.Geom.Rectangle.Contains);

    if (object.input) {
      object.input.cursor = 'grab';
    }

    this.scene.input.setDraggable(object);
    object.setPosition(spawnPosition.x, spawnPosition.y);
    object.lastValidX = spawnPosition.x;
    object.lastValidY = spawnPosition.y;

    const stackTarget = object.findStackTargetAt?.(spawnPosition.x, spawnPosition.y);

    if (stackTarget && object.attachToStackTarget) {
      object.attachToStackTarget(stackTarget);
    } else {
      object.applyRestingDepth?.();
    }

    object.refreshOtherRestingDepths?.();
    object.playDropImpact?.();
    return true;
  }

  findInventorySceneSpawnPosition(object, x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }

    const firstPosition = object.clampDragPositionToScreen?.(x, y) ?? { x, y };

    if (object.canOccupyPosition?.(firstPosition.x, firstPosition.y)) {
      return firstPosition;
    }

    const placementRect = object.getPlacementRectAt?.(firstPosition.x, firstPosition.y)
      ?? object.getWorldHitboxRect?.(firstPosition.x, firstPosition.y);
    const rectWidth = Number.isFinite(placementRect?.width) ? placementRect.width : 32;
    const rectHeight = Number.isFinite(placementRect?.height) ? placementRect.height : 32;
    const step = Math.max(8, Math.min(24, Math.floor(Math.min(rectWidth, rectHeight) / 2) || 12));
    const maxRadius = Math.max(96, Math.ceil(Math.max(rectWidth, rectHeight) * 3));
    const checked = new Set([`${Math.round(firstPosition.x)},${Math.round(firstPosition.y)}`]);

    for (let radius = step; radius <= maxRadius; radius += step) {
      const sampleCount = Math.max(8, Math.ceil((Math.PI * 2 * radius) / step));

      for (let sample = 0; sample < sampleCount; sample += 1) {
        const angle = (sample / sampleCount) * Math.PI * 2;
        const candidate = object.clampDragPositionToScreen?.(
          x + Math.cos(angle) * radius,
          y + Math.sin(angle) * radius,
        ) ?? {
          x: x + Math.cos(angle) * radius,
          y: y + Math.sin(angle) * radius,
        };
        const key = `${Math.round(candidate.x)},${Math.round(candidate.y)}`;

        if (checked.has(key)) {
          continue;
        }

        checked.add(key);

        if (object.canOccupyPosition?.(candidate.x, candidate.y)) {
          return candidate;
        }
      }
    }

    return null;
  }

  getInventoryEntryAt(location) {
    if (location.type === 'hotbar') {
      return this.slotItems[location.slotIndex] ?? null;
    }

    return this.getLargeSlotItem(location.pageIndex, location.slotIndex);
  }

  setInventoryEntryAt(location, entry) {
    if (location.type === 'hotbar') {
      this.slotItems[location.slotIndex] = entry;
      return;
    }

    this.setLargeSlotItem(location.pageIndex, location.slotIndex, entry);
  }

  areInventoryLocationsEqual(a, b) {
    if (a.type !== b.type) {
      return false;
    }

    if (a.type === 'hotbar') {
      return a.slotIndex === b.slotIndex;
    }

    return a.pageIndex === b.pageIndex && a.slotIndex === b.slotIndex;
  }

  isInventoryPageUnlocked(pageIndex) {
    return pageIndex < UNLOCKED_PAGE_COUNT;
  }

  isInventorySlotRefrigerated(slotIndex) {
    return slotIndex % INVENTORY_COLUMNS < INVENTORY_COLUMNS / 2;
  }

  getLargeInventoryIndex(pageIndex, slotIndex) {
    return pageIndex * INVENTORY_SLOTS_PER_PAGE + slotIndex;
  }

  getLargeSlotItem(pageIndex, slotIndex) {
    return this.largeSlotItems[this.getLargeInventoryIndex(pageIndex, slotIndex)] ?? null;
  }

  setLargeSlotItem(pageIndex, slotIndex, item) {
    this.largeSlotItems[this.getLargeInventoryIndex(pageIndex, slotIndex)] = item;
  }

  syncInventoryIconVisibility() {
    const hotbarEntries = new Set(this.slotItems.filter(Boolean));
    const overlayVisibleEntries = new Set();

    if (
      this.isOverlayOpen
      && this.currentOverlayMode === 'inventory'
      && this.isInventoryPageUnlocked(this.currentOverlayPage)
    ) {
      for (let index = 0; index < INVENTORY_SLOTS_PER_PAGE; index += 1) {
        const entry = this.getLargeSlotItem(this.currentOverlayPage, index);

        if (entry) {
          overlayVisibleEntries.add(entry);
        }
      }
    }

    const allEntries = new Set([
      ...this.slotItems.filter(Boolean),
      ...this.largeSlotItems.filter(Boolean),
    ]);

    allEntries.forEach((entry) => {
      if (entry?.iconObject?.scene) {
        entry.iconObject.setVisible(hotbarEntries.has(entry) || overlayVisibleEntries.has(entry));
      }
    });
  }

  syncRecipeIconVisibility() {
    const visibleEntries = new Set();

    if (this.isOverlayOpen && this.currentOverlayMode === 'recipes') {
      this.getRecipeEntriesForPage().forEach((entry) => visibleEntries.add(entry));
    }

    this.recipePages.forEach((page) => {
      page.entries.forEach((entry) => {
        if (entry.iconObject?.scene) {
          if (!visibleEntries.has(entry)) {
            entry.iconObject.clearMask?.();
          }
          entry.iconObject.setVisible(visibleEntries.has(entry));
        }

        if (!visibleEntries.has(entry)) {
          this.hideRecipeGridLabels(entry);
        }

        if (entry.dishObject?.scene && entry !== this.recipePreviewEntry) {
          entry.dishObject.setVisible(false);
        }

        if (entry.previewIconObject?.scene && entry !== this.recipePreviewEntry) {
          this.setRecipeObjectSilhouette(entry.previewIconObject, false);
          entry.previewIconObject.clearMask?.();
          entry.previewIconObject.setVisible(false);
        }

        (entry.ingredients ?? []).forEach((ingredient) => {
          if (ingredient.iconObject?.scene && entry !== this.recipePreviewEntry) {
            this.setRecipeObjectSilhouette(ingredient.iconObject, false);
            ingredient.iconObject.clearMask?.();
            ingredient.iconObject.setVisible(false);
          }
        });
      });
    });
  }

  drawExpandSlot(slotX, slotY, slotSize) {
    const isHighlighted = this.isSlotHighlighted(EXPAND_SLOT_INDEX);

    this.graphics.fillStyle(COLORS.shadow, 0.14);
    this.graphics.fillRect(slotX + 1, slotY + 2, slotSize, slotSize);
    this.graphics.fillStyle(isHighlighted ? COLORS.highlight : COLORS.outer, 1);
    this.graphics.fillRect(slotX, slotY, slotSize, slotSize);
    this.graphics.fillStyle(COLORS.inset, 1);
    this.graphics.fillRect(slotX + 2, slotY + 2, slotSize - 4, slotSize - 4);

    this.drawExpandDots(slotX, slotY, slotSize);

    this.positionSlotZone(EXPAND_SLOT_INDEX, slotX, slotY, slotSize);
  }

  drawExpandDots(slotX, slotY, slotSize) {
    const dotSize = Math.max(2, Math.floor(slotSize * 0.13));
    const dotGap = Math.max(2, Math.floor(slotSize * 0.12));
    const dotsWidth = dotSize * 3 + dotGap * 2;
    const startX = Math.round(slotX + (slotSize - dotsWidth) / 2);
    const dotY = Math.round(slotY + (slotSize - dotSize) / 2);

    this.graphics.fillStyle(0xffffff, 0.5);

    for (let dotIndex = 0; dotIndex < 3; dotIndex += 1) {
      this.graphics.fillRect(startX + dotIndex * (dotSize + dotGap), dotY, dotSize, dotSize);
    }
  }

  drawEmptyPlus(slotX, slotY, slotSize, graphics = this.graphics) {
    const armLength = Math.max(6, Math.floor(slotSize * 0.32));
    const thickness = Math.max(3, Math.floor(slotSize * 0.16));
    const centerX = slotX + slotSize / 2;
    const centerY = slotY + slotSize / 2;
    const halfArm = armLength / 2;
    const halfThickness = thickness / 2;
    const armReach = halfArm - halfThickness;
    const left = Math.round(centerX - halfArm);
    const top = Math.round(centerY - halfArm);
    const innerLeft = Math.round(centerX - halfThickness);
    const innerTop = Math.round(centerY - halfThickness);

    graphics.fillStyle(COLORS.inset, 0.34);
    graphics.fillRect(left, innerTop, armReach, thickness);
    graphics.fillRect(innerLeft + thickness, innerTop, armReach, thickness);
    graphics.fillRect(innerLeft, top, thickness, armReach);
    graphics.fillRect(innerLeft, innerTop + thickness, thickness, armReach);
    graphics.fillRect(innerLeft, innerTop, thickness, thickness);
  }

  drawSlotItem(slotX, slotY, slotSize, item) {
    if (!item || item === this.inventoryDrag?.entry) {
      return;
    }

    const centerX = slotX + slotSize / 2;
    const centerY = slotY + slotSize / 2;
    const maxSize = Math.max(4, slotSize - ICON_PADDING * 2);

    if (item.iconObject?.scene) {
      item.iconObject.setVisible(true);
      item.iconObject.setDepth(UI_DEPTHS.inventoryIcon);
      this.positionIcon(item.iconObject, centerX, centerY, maxSize);
      return;
    }

    const size = Math.max(4, Math.floor(slotSize * 0.5));
    const itemX = Math.round(centerX - size / 2);
    const itemY = Math.round(centerY - size / 2) - 1;

    this.graphics.fillStyle(COLORS.shadow, 0.18);
    this.graphics.fillRect(itemX + 1, itemY + 2, size, size);
    this.graphics.fillStyle(item.color, 1);
    this.graphics.fillRect(itemX, itemY, size, size);
    this.graphics.fillStyle(0xffffff, 0.3);
    this.graphics.fillRect(itemX + 2, itemY + 2, Math.max(2, size - 4), 2);
  }

  positionIcon(iconObject, centerX, centerY, maxSize) {
    const naturalWidth = iconObject.width ?? iconObject.displayWidth ?? maxSize;
    const naturalHeight = iconObject.height ?? iconObject.displayHeight ?? maxSize;
    const visibleBounds = this.getIconVisibleBounds(iconObject, naturalWidth, naturalHeight);
    const fitWidth = visibleBounds ? visibleBounds.right - visibleBounds.left : naturalWidth;
    const fitHeight = visibleBounds ? visibleBounds.bottom - visibleBounds.top : naturalHeight;
    const idealScale = Math.min(maxSize / fitWidth, maxSize / fitHeight);
    const displayWidth = snapDisplaySizeToCenter(fitWidth * idealScale, maxSize, centerX);
    const displayHeight = snapDisplaySizeToCenter(fitHeight * idealScale, maxSize, centerY);
    const baseScaleX = displayWidth / fitWidth;
    const baseScaleY = displayHeight / fitHeight;

    if (visibleBounds) {
      iconObject.setOrigin(
        ((visibleBounds.left + visibleBounds.right) / 2) / naturalWidth,
        ((visibleBounds.top + visibleBounds.bottom) / 2) / naturalHeight,
      );
    } else {
      iconObject.setOrigin(0.5);
    }

    const leftEdgeX = Math.round(centerX - displayWidth / 2);
    const topEdgeY = Math.round(centerY - displayHeight / 2);

    iconObject.baseScaleX = baseScaleX;
    iconObject.baseScaleY = baseScaleY;
    iconObject.baseScale = baseScaleX;
    iconObject.setPosition(leftEdgeX + displayWidth / 2, topEdgeY + displayHeight / 2);
    this.applyIconScale(iconObject);
  }

  getIconVisibleBounds(iconObject, fallbackWidth, fallbackHeight) {
    const textureKey = iconObject?.texture?.key;

    if (!textureKey || textureKey === '__DEFAULT' || textureKey === '__MISSING') {
      return null;
    }

    if (iconVisibleBoundsCache.has(textureKey)) {
      return iconVisibleBoundsCache.get(textureKey);
    }

    const source = iconObject.texture.getSourceImage?.();
    const canvas = source?.getContext ? source : source?.canvas;
    let imageData = getCachedFullImageData(canvas);

    if (!imageData) {
      const context = canvas?.getContext?.('2d', { willReadFrequently: true });

      if (!context) {
        iconVisibleBoundsCache.set(textureKey, null);
        return null;
      }

      try {
        imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      } catch (error) {
        iconVisibleBoundsCache.set(textureKey, null);
        return null;
      }
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
        if (px < left) left = px;
        if (px + 1 > right) right = px + 1;
        if (py < top) top = py;
        if (py + 1 > bottom) bottom = py + 1;
      }
    }

    const bounds = right > left && bottom > top
      ? { left, right, top, bottom }
      : null;

    iconVisibleBoundsCache.set(textureKey, bounds);
    return bounds;
  }

  applyIconScale(iconObject) {
    const baseScaleX = iconObject.baseScaleX ?? iconObject.baseScale ?? 1;
    const baseScaleY = iconObject.baseScaleY ?? iconObject.baseScale ?? 1;
    const impactX = iconObject.impactScaleX ?? 1;
    const impactY = iconObject.impactScaleY ?? 1;

    iconObject.setScale(baseScaleX * impactX, baseScaleY * impactY);
  }

  destroyIcon(iconObject) {
    if (!iconObject) {
      return;
    }

    if (iconObject.impactTween) {
      iconObject.impactTween.stop();
      iconObject.impactTween = null;
    }

    if (iconObject.scene) {
      iconObject.destroy();
    }
  }

  playSlotImpact(iconObject) {
    if (!iconObject?.scene) {
      return;
    }

    if (iconObject.impactTween) {
      iconObject.impactTween.stop();
    }

    const softness = 1;
    const squashX = softness * 0.32;
    const squashY = softness * 0.42;
    const stretchX = softness * 0.12;
    const stretchY = softness * 0.18;
    const duration = 240;

    iconObject.impactProgress = 0;
    iconObject.impactTween = this.scene.tweens.add({
      targets: iconObject,
      impactProgress: { from: 0, to: 1 },
      duration,
      ease: 'Linear',
      onUpdate: () => {
        const progress = Phaser.Math.Clamp(iconObject.impactProgress, 0, 1);
        const damping = Math.pow(1 - progress, 2.2);
        const compression = Math.cos(progress * Math.PI * 3.5) * damping;

        if (compression >= 0) {
          iconObject.impactScaleX = 1 + squashX * compression;
          iconObject.impactScaleY = 1 - squashY * compression;
        } else {
          const stretch = -compression;
          iconObject.impactScaleX = 1 - stretchX * stretch;
          iconObject.impactScaleY = 1 + stretchY * stretch;
        }

        this.applyIconScale(iconObject);
      },
      onComplete: () => {
        iconObject.impactTween = null;
        iconObject.impactScaleX = 1;
        iconObject.impactScaleY = 1;
        this.applyIconScale(iconObject);
      },
    });
  }

  positionSlotZone(index, slotX, slotY, slotSize) {
    const zone = this.slotZones[index];

    if (!zone) {
      return;
    }

    zone.setPosition(slotX, slotY);
    zone.setSize(slotSize, slotSize);
    zone.input.hitArea.setTo(0, 0, slotSize, slotSize);
    if (index === EXPAND_SLOT_INDEX) {
      zone.input.cursor = 'pointer';
      return;
    }

    zone.input.cursor = this.slotItems[index] ? 'grab' : 'default';
  }

  isSlotHighlighted(index) {
    if (index === EXPAND_SLOT_INDEX) {
      return this.dragHoverIndex === null && this.hoverIndex === index;
    }

    if (this.hotbarDragHoverIndex === index) {
      return true;
    }

    if (this.dragHoverIndex === index) {
      return true;
    }

    if (
      this.isOverlayOpen
      && this.currentOverlayMode === 'inventory'
      && this.hotbarFocusIndex === index
      && Boolean(this.slotItems[index])
    ) {
      return true;
    }

    return this.dragHoverIndex === null
      && this.hoverIndex === index
      && Boolean(this.slotItems[index]);
  }

  setHoverIndex(index, leavingIndex = null) {
    if (index === null && leavingIndex !== null && this.hoverIndex !== leavingIndex) {
      return;
    }

    if (this.hoverIndex === index) {
      return;
    }

    this.hoverIndex = index;
    this.draw();

    if (this.isOverlayOpen && this.currentOverlayMode === 'inventory') {
      this.drawOverlay();
    }
  }

  setDragHoverIndex(index) {
    if (this.dragHoverIndex === index) {
      return;
    }

    this.dragHoverIndex = index;
    this.draw();
  }

  handleSceneDrag(pointer, gameObject) {
    if (!(gameObject instanceof DraggableObject) || !gameObject.scene) {
      return;
    }

    const index = this.getSlotIndexAt(pointer.x, pointer.y);

    if (index === null || this.slotItems[index]) {
      this.setDragHoverIndex(null);
      return;
    }

    this.setDragHoverIndex(index);
  }

  handleExpandSlotPointerDown(pointer) {
    this.toggleOverlay();
    this.scene.events.emit('inventory-expand-requested', { pointer });
  }

  handleScenePointerDown(pointer) {
    const insideBar = this.isPointInsideInventoryBar(pointer.x, pointer.y);

    if (this.slotTraitsSlotIndex !== null && !insideBar) {
      this.hideSlotTraits();
    }

    if (!this.isOverlayOpen || this.inventoryDrag) {
      return;
    }

    if (this.isPointInsideOverlay(pointer.x, pointer.y) || insideBar) {
      return;
    }

    this.closeOverlay();
  }

  isPointInsideOverlay(x, y) {
    if (!this.overlayBounds) {
      return false;
    }

    const {
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      tabTop,
    } = this.overlayBounds;
    const overlayTop = tabTop ?? panelY;

    return x >= panelX
      && x <= panelX + panelWidth
      && y >= overlayTop
      && y <= panelY + panelHeight;
  }

  isPointInsideInventoryBar(x, y) {
    if (!this.bounds) {
      return false;
    }

    return x >= this.bounds.x
      && x <= this.bounds.x + this.bounds.width
      && y >= this.bounds.y
      && y <= this.bounds.y + this.bounds.height;
  }

  getSlotIndexAt(x, y) {
    if (!this.bounds) {
      return null;
    }

    const { x: bx, y: by, slotSize } = this.bounds;

    if (y < by || y > by + slotSize) {
      return null;
    }

    for (let index = 0; index < SLOT_COUNT; index += 1) {
      const slotX = bx + index * (slotSize + SLOT_GAP);

      if (x >= slotX && x < slotX + slotSize) {
        return index;
      }
    }

    return null;
  }

  handleSceneDragEnd(pointer, gameObject) {
    this.setDragHoverIndex(null);

    if (!(gameObject instanceof DraggableObject) || !gameObject.scene) {
      return;
    }

    const index = this.getSlotIndexAt(pointer.x, pointer.y);

    if (index === null || this.slotItems[index]) {
      return;
    }

    this.storeObjectInSlot(index, gameObject);
  }

  storeObjectInSlot(index, object) {
    this.hideSlotTraits();
    object.detachFromStackParent?.();
    object.stopSnapBack?.();
    object.stopDropImpact?.();

    if (object.dragLiftTween) {
      object.dragLiftTween.stop();
      object.dragLiftTween = null;
    }

    object.currentLift = 0;
    object.setDragLift?.(0);
    object.setVisible(false);
    object.disableInteractive();

    const iconObject = attachPixelShadow(this.scene, object.createInventoryIcon?.(this.scene) ?? null);

    if (iconObject) {
      iconObject.setOrigin(0.5);
      iconObject.setDepth(UI_DEPTHS.inventoryIcon);
      iconObject.setScrollFactor?.(0);
    }

    this.slotItems[index] = {
      object,
      iconObject,
      color: object.inventoryIconColor ?? DEFAULT_ICON_COLOR,
    };
    this.draw();
    this.drawOverlay();

    if (iconObject) {
      this.playSlotImpact(iconObject);
    }
  }

  storeObjectInLargeSlot(pageIndex, slotIndex, object) {
    this.hideSlotTraits();
    object.detachFromStackParent?.();
    object.stopSnapBack?.();
    object.stopDropImpact?.();

    if (object.dragLiftTween) {
      object.dragLiftTween.stop();
      object.dragLiftTween = null;
    }

    object.currentLift = 0;
    object.setDragLift?.(0);
    object.setVisible(false);
    object.disableInteractive();

    const iconObject = attachPixelShadow(this.scene, object.createInventoryIcon?.(this.scene) ?? null);

    if (iconObject) {
      iconObject.setOrigin(0.5);
      iconObject.setDepth(UI_DEPTHS.inventoryIcon);
      iconObject.setScrollFactor?.(0);
    }

    this.setLargeSlotItem(pageIndex, slotIndex, {
      object,
      iconObject,
      color: object.inventoryIconColor ?? DEFAULT_ICON_COLOR,
    });
    this.syncInventoryIconVisibility();
    this.draw();
    this.drawOverlay();
  }

  handleSlotPointerDown(index, pointer) {
    const entry = this.slotItems[index];

    if (!entry || this.pendingSlotClick) {
      return;
    }

    const startX = pointer.x;
    const startY = pointer.y;
    const cleanup = () => {
      this.scene.input.off('pointermove', moveHandler);
      this.scene.input.off('pointerup', upHandler);
      this.scene.input.off('pointerupoutside', upHandler);
      this.pendingSlotClick = null;
    };
    const moveHandler = (movePointer) => {
      if (Math.hypot(movePointer.x - startX, movePointer.y - startY) < INVENTORY_DRAG_THRESHOLD) {
        return;
      }

      cleanup();

      if (this.slotItems[index] === entry) {
        this.beginSlotDrag(index, entry, movePointer);
      }
    };
    const upHandler = () => {
      cleanup();

      if (this.slotItems[index] === entry) {
        this.handleSlotClick(index, entry);
      }
    };

    this.pendingSlotClick = { index, cleanup };
    this.scene.input.on('pointermove', moveHandler);
    this.scene.input.once('pointerup', upHandler);
    this.scene.input.once('pointerupoutside', upHandler);
  }

  beginSlotDrag(index, entry, pointer) {
    this.hideSlotTraits();

    const { object, iconObject } = entry;

    this.destroyIcon(iconObject);
    this.slotItems[index] = null;

    if (!object.scene) {
      this.draw();
      this.drawOverlay();
      return;
    }

    object.setVisible(true);
    object.setInteractive(object.hitbox, Phaser.Geom.Rectangle.Contains);

    if (object.input) {
      object.input.cursor = 'grab';
    }

    this.scene.input.setDraggable(object);

    const worldX = Number.isFinite(pointer.worldX) ? pointer.worldX : pointer.x;
    const worldY = Number.isFinite(pointer.worldY) ? pointer.worldY : pointer.y;

    object.setPosition(worldX, worldY);
    object.lastValidX = worldX;
    object.lastValidY = worldY;
    object.applyRestingDepth?.();

    this.draw();
    this.drawOverlay();

    object.beginManualDrag?.(pointer);
    this.trackManualDrag(object);
  }

  handleSlotClick(index, entry) {
    if (!entry?.object) {
      return;
    }

    if (this.slotTraitsSlotIndex === index) {
      this.hideSlotTraits();
      return;
    }

    this.showSlotTraits(index, entry.object);
  }

  showSlotTraits(index, object) {
    if (!this.bounds) {
      return;
    }

    this.scene.ui?.hideIngredientTraits?.();
    this.slotTraits.refreshContent(object);
    this.slotTraits.draw();

    const { slotSize, x: barX, y: barY } = this.bounds;
    const slotX = barX + index * (slotSize + SLOT_GAP);
    const targetX = Math.round(slotX + slotSize / 2 - this.slotTraits.displayWidth / 2);
    const targetY = Math.round(barY - this.slotTraits.displayHeight - 6);

    this.slotTraits.showAt(object, targetX, targetY);
    this.slotTraitsSlotIndex = index;
  }

  hideSlotTraits() {
    if (this.slotTraitsSlotIndex === null) {
      return;
    }

    this.slotTraits.hideImmediate();
    this.slotTraitsSlotIndex = null;
  }

  trackManualDrag(object) {
    const moveHandler = (movePointer) => this.handleSceneDrag(movePointer, object);
    const upHandler = (upPointer) => {
      this.scene.input.off('pointermove', moveHandler);
      this.scene.input.off('pointerup', upHandler);
      this.scene.input.off('pointerupoutside', upHandler);
      this.handleSceneDragEnd(upPointer, object);
    };

    this.scene.input.on('pointermove', moveHandler);
    this.scene.input.once('pointerup', upHandler);
    this.scene.input.once('pointerupoutside', upHandler);
  }

  setSlotItems(items = []) {
    this.slotItems.forEach((entry) => {
      this.destroyIcon(entry?.iconObject);
    });
    this.slotItems = Array.from({ length: SLOT_COUNT }, (_value, index) => items[index] ?? null);
    this.syncInventoryIconVisibility();
    this.draw();
    this.drawOverlay();
  }

  destroy() {
    this.stopOverlayTween();
    this.endRecipeScrollbarDrag();
    this.scene.input.off('dragend', this.dragEndHandler);
    this.scene.input.off('drag', this.dragHandler);
    this.scene.input.off('pointerdown', this.pointerDownHandler);
    this.scene.input.off('wheel', this.wheelHandler);
    this.scene.input.keyboard?.off('keydown-ESC', this.escapeHandler);
    this.slotItems.forEach((entry) => {
      this.destroyIcon(entry?.iconObject);
    });
    this.largeSlotItems.forEach((entry) => {
      this.destroyIcon(entry?.iconObject);
    });
    this.slotItems = [];
    this.largeSlotItems = [];
    this.slotZones.forEach((zone) => zone.destroy());
    this.slotZones = [];
    this.overlaySlotZones.forEach((zone) => zone.destroy());
    this.overlaySlotZones = [];
    this.overlayPageZones.forEach((zone) => zone.destroy());
    this.overlayPageZones = [];
    this.overlayTabZones.forEach((zone) => zone.destroy());
    this.overlayTabZones = [];
    this.recipePageZones.forEach((zone) => zone.destroy());
    this.recipePageZones = [];
    this.recipeEntryZones.forEach((zone) => zone.destroy());
    this.recipeEntryZones = [];
    this.recipeScrollbarZone.destroy();
    this.overlayPageTexts.forEach((text) => text.destroy());
    this.overlayPageTexts = [];
    this.overlayTabTexts.forEach((text) => text.destroy());
    this.overlayTabTexts = [];
    this.recipePageTexts.forEach((text) => text.destroy());
    this.recipePageTexts = [];
    this.recipePages.forEach((page) => {
      page.entries.forEach((entry) => {
        this.destroyIcon(entry?.iconObject);
        this.destroyIcon(entry?.previewIconObject);
        entry?.nameText?.destroy?.();
        (entry?.ingredients ?? []).forEach((ingredient) => {
          this.destroyIcon(ingredient?.iconObject);
          ingredient?.sourceObject?.destroy?.();
        });
        entry?.dishObject?.destroy?.();
      });
    });
    this.recipePages = [];
    this.overlayBackdropZone.destroy();
    this.overlayGraphics.destroy();
    this.recipeMaskGraphics.destroy();
    this.inventoryDragGraphics.destroy();
    this.previewTraits.destroy();
    this.slotTraits.destroy();
    this.previewEmptyLabelShadow.destroy();
    this.previewEmptyLabel.destroy();
    this.previewJapaneseLabel.destroy();
    this.recipeIngredientGroupLabels.forEach((text) => text.destroy());
    this.recipeIngredientGroupLabels = [];
    this.overlayTitleShadow.destroy();
    this.overlayTitle.destroy();
    this.overlayColdLabel.destroy();
    this.overlayDryLabel.destroy();
    this.graphics.destroy();
  }
}
