import * as Phaser from 'phaser/dist/phaser.esm.js';
import { UI_ANIMATION, UI_DEPTHS } from './constants.js';
import { BITMAP_FONT_PIXEL } from '../game/constants.js';
import { DraggableObject } from '../objects/DraggableObject.js';
import { IngredientTraitOverlay } from './IngredientTraitOverlay.js';

const SLOT_COUNT = 10;
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
const OVERLAY_HEADER_HEIGHT = 14;
const OVERLAY_PAGE_BUTTON_HEIGHT = 18;
const OVERLAY_SECTION_LABEL_HEIGHT = 12;
const OVERLAY_SLOT_GAP = 3;
const OVERLAY_MAX_SLOT_SIZE = 35;
const OVERLAY_MIN_SLOT_SIZE = 13;
const OVERLAY_PREVIEW_GAP = 12;
const OVERLAY_PREVIEW_MIN_WIDTH = 148;
const OVERLAY_PREVIEW_MAX_WIDTH = 196;
const INVENTORY_DRAG_THRESHOLD = 4;

const DEFAULT_ICON_COLOR = 0xc99a6b;
const ICON_PADDING = 4;

const COLORS = {
  shadow: 0x10251e,
  outer: 0xa36d46,
  inner: 0xf1d3a4,
  innerAlt: 0xe9c28b,
  inset: 0xc8955e,
  occupiedTint: 0xead0a4,
  highlight: 0xfff2a8,
  highlightOuter: 0xc98755,
  backdrop: 0x10251e,
  panelOuter: 0x7f5238,
  panelInner: 0xf1d3a4,
  panelInset: 0xd8a06b,
  pageButton: 0xefd0a2,
  pageButtonActive: 0xfff2a8,
  pageButtonLocked: 0xdfbc89,
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
    this.escapeHandler = () => this.closeOverlay();
    scene.input.on('dragend', this.dragEndHandler);
    scene.input.on('drag', this.dragHandler);
    scene.input.on('pointerdown', this.pointerDownHandler);
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

    this.overlayTitleShadow = this.createOverlayText(0, 0, 8, 0x10251e, 0.25);
    this.overlayTitle = this.createOverlayText(0, 0, 8, COLORS.text, 1);
    this.overlayColdLabel = this.createOverlayText(0, 0, 8, 0x2e7180, 1);
    this.overlayDryLabel = this.createOverlayText(0, 0, 8, COLORS.textDark, 1);
    this.overlayCloseText = this.createOverlayText(0, 0, 12, COLORS.text, 1);
    this.overlayCloseText.setOrigin(0.5);
    this.overlayCloseText.setText('X');

    this.overlayPageTexts = Array.from({ length: INVENTORY_PAGE_COUNT }, (_value, index) => {
      const text = this.createOverlayText(0, 0, 8, COLORS.textDark, 1);

      text.setOrigin(0.5);
      text.setText(`${index + 1}`);
      return text;
    });

    this.overlayCloseZone = this.scene.add.zone(0, 0, 24, 24);
    this.overlayCloseZone.setOrigin(0.5);
    this.overlayCloseZone.setDepth(UI_DEPTHS.overlay + 2);
    this.overlayCloseZone.setInteractive({ cursor: 'pointer' });
    this.overlayCloseZone.setVisible(false);
    this.overlayCloseZone.on('pointerdown', () => this.closeOverlay());

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

  createOverlayText(x, y, size, tint, alpha) {
    const text = this.scene.add.bitmapText(x, y, BITMAP_FONT_PIXEL, '', size);

    text.setDepth(UI_DEPTHS.overlay + 2);
    text.setTint(tint);
    text.setAlpha(alpha);
    text.restAlpha = alpha;
    text.setVisible(false);
    return text;
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
          this.handleHotbarInventoryPointerDown(index, pointer);
          return;
        }

        this.handleSlotPointerDown(index, pointer);
      });
      zone.on('pointerover', () => this.setHoverIndex(index));
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
      const isOccupied = Boolean(this.slotItems[index]);
      const isHighlighted = this.isSlotHighlighted(index);
      const innerColor = index % 2 === 0 ? COLORS.inner : COLORS.innerAlt;

      this.graphics.fillStyle(COLORS.shadow, 0.14);
      this.graphics.fillRect(slotX + 1, slotY + 2, slotSize, slotSize);
      this.graphics.fillStyle(isHighlighted ? COLORS.highlight : COLORS.outer, 1);
      this.graphics.fillRect(slotX, slotY, slotSize, slotSize);
      this.graphics.fillStyle(isOccupied ? COLORS.occupiedTint : innerColor, 1);
      this.graphics.fillRect(slotX + 2, slotY + 2, slotSize - 4, slotSize - 4);

      if (!isOccupied) {
        this.drawEmptyPlus(slotX, slotY, slotSize);
      }

      this.drawSlotItem(slotX, slotY, slotSize, this.slotItems[index]);

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
    this.overlayCloseText.setVisible(isVisible);
    this.previewEmptyLabelShadow.setVisible(false);
    this.previewEmptyLabel.setVisible(false);
    this.overlayCloseZone.setVisible(isVisible);
    this.overlayPageTexts.forEach((text) => text.setVisible(isVisible));
    this.overlayPageZones.forEach((zone) => zone.setVisible(isVisible));
    this.overlaySlotZones.forEach((zone) => zone.setVisible(isVisible));

    if (!isVisible) {
      this.overlayBackdropZone.setVisible(false);
      this.hidePreviewEntry();
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
      this.overlayCloseText,
      this.previewEmptyLabelShadow,
      this.previewEmptyLabel,
      this.overlayCloseZone,
      ...this.overlayPageTexts,
      ...this.overlayPageZones,
      ...this.overlaySlotZones,
      this.previewTraits.container,
      ...(this.previewEntry?.object ? [this.previewEntry.object] : []),
      ...this.getOverlayVisibleIconObjects(),
    ];
  }

  getOverlayVisibleIconObjects() {
    if (!this.isInventoryPageUnlocked(this.currentOverlayPage)) {
      return [];
    }

    const iconObjects = [];

    for (let index = 0; index < INVENTORY_SLOTS_PER_PAGE; index += 1) {
      const iconObject = this.getLargeSlotItem(this.currentOverlayPage, index)?.iconObject;

      if (iconObject?.scene) {
        iconObjects.push(iconObject);
      }
    }

    return iconObjects;
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

  drawOverlay() {
    if (!this.isOverlayOpen || !this.visibleArea) {
      return;
    }

    const visibleArea = this.visibleArea;
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
    const rowCount = INVENTORY_ROWS;
    const slotSize = Math.floor(Phaser.Math.Clamp(
      Math.min(
        (availableGridWidth - OVERLAY_SLOT_GAP * (INVENTORY_COLUMNS - 1)) / INVENTORY_COLUMNS,
        (availableGridHeight - OVERLAY_SLOT_GAP * (rowCount - 1)) / rowCount,
      ),
      OVERLAY_MIN_SLOT_SIZE,
      OVERLAY_MAX_SLOT_SIZE,
    ));
    const gridWidth = slotSize * INVENTORY_COLUMNS + OVERLAY_SLOT_GAP * (INVENTORY_COLUMNS - 1);
    const gridHeight = slotSize * rowCount + OVERLAY_SLOT_GAP * (rowCount - 1);
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
    const panelX = Math.round(visibleArea.left + (visibleArea.width - panelWidth) / 2);
    const balancedGap = (barTop - visibleArea.top - panelHeight) / 2;
    const panelY = Math.round(visibleArea.top + Math.max(OVERLAY_MARGIN, balancedGap));
    const labelY = panelY + OVERLAY_PADDING + OVERLAY_HEADER_HEIGHT;
    const gridX = panelX + OVERLAY_PADDING;
    const gridY = labelY + OVERLAY_SECTION_LABEL_HEIGHT + 7;
    const previewX = gridX + gridWidth + OVERLAY_PREVIEW_GAP;
    const previewY = gridY - 4;
    const previewHeight = gridHeight + 8;
    const pageButtonY = gridY + gridHeight + 8;
    const pageButtonX = gridX - 4;
    const pageButtonWidth = gridWidth + 8;
    const isPageUnlocked = this.isInventoryPageUnlocked(this.currentOverlayPage);

    this.overlayBounds = {
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      gridX,
      gridY,
      gridWidth,
      gridHeight,
      previewX,
      previewY,
      previewWidth,
      previewHeight,
      slotSize,
      rowCount,
    };

    this.setOverlayZoneRestPosition(this.overlayBackdropZone, panelX, panelY);
    this.overlayBackdropZone.setSize(panelWidth, panelHeight);
    this.overlayBackdropZone.input.hitArea.setTo(0, 0, panelWidth, panelHeight);

    this.overlayGraphics.clear();
    this.overlayGraphics.fillStyle(COLORS.shadow, 0.24);
    this.overlayGraphics.fillRect(panelX + 3, panelY + 4, panelWidth, panelHeight);
    this.overlayGraphics.fillStyle(COLORS.panelOuter, 1);
    this.overlayGraphics.fillRect(panelX, panelY, panelWidth, panelHeight);
    this.overlayGraphics.fillStyle(COLORS.panelInner, 1);
    this.overlayGraphics.fillRect(panelX + 3, panelY + 3, panelWidth - 6, panelHeight - 6);
    this.overlayGraphics.fillStyle(COLORS.slotDryInner, 1);
    this.overlayGraphics.fillRect(gridX - 4, gridY - 4, gridWidth + 8, gridHeight + 8);
    this.drawOverlayPreviewColumn(previewX, previewY, previewWidth, previewHeight);

    this.positionOverlayHeader(panelX, panelY, panelWidth, isPageUnlocked);
    this.positionOverlaySectionLabels(gridX, labelY, gridWidth);
    this.drawOverlaySlots(gridX, gridY, slotSize, rowCount, isPageUnlocked);
    this.drawOverlayPreviewContent(previewX, previewY, previewWidth, previewHeight);
    if (!isPageUnlocked) {
      this.drawLockedPageOverlay(gridX, gridY, gridWidth, gridHeight);
    }
    this.drawOverlayPageButtons(pageButtonX, pageButtonY, pageButtonWidth);
    this.overlayGraphics.restY = 0;
    this.overlayGraphics.restAlpha = 1;
    this.applyOverlayAnimationTransform();
  }

  drawOverlayPreviewColumn(previewX, previewY, previewWidth, previewHeight) {
    this.drawOverlayPreviewSpotlight(previewX, previewY, previewWidth, previewHeight);
  }

  drawOverlayPreviewSpotlight(previewX, previewY, previewWidth, previewHeight) {
    const centerX = Math.round(previewX + previewWidth / 2);
    const spotlightY = Math.round(previewY + previewHeight * 0.34);
    const spotlightWidth = Math.round(previewWidth * 0.66);
    const spotlightHeight = Math.max(10, Math.round(previewHeight * 0.12));
    const ellipseX = centerX;
    const ellipseY = spotlightY + Math.round(spotlightHeight / 2);

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
      this.showEmptyPreviewMessage(previewX, previewY, previewWidth, previewHeight);
      return;
    }

    this.hideEmptyPreviewMessage();

    const centerX = Math.round(previewX + previewWidth / 2);
    const objectCenterY = Math.round(previewY + previewHeight * 0.3);

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
    } else {
      this.previewTraits.hideImmediate();
    }
  }

  showEmptyPreviewMessage(previewX, previewY, previewWidth, previewHeight) {
    const placeholderRawHeight = 48;
    const placeholderDisplayWidth = this.previewTraits.displayWidth || 0;
    const placeholderDisplayHeight = placeholderRawHeight * (this.previewTraits.overlayScale ?? 1);
    const traitX = Math.round(previewX + (previewWidth - placeholderDisplayWidth) / 2);
    const gridBottom = this.overlayBounds?.gridY + this.overlayBounds?.gridHeight + 4;
    const fallbackBottom = previewY + previewHeight - 4;
    const traitBottom = Number.isFinite(gridBottom) ? gridBottom : fallbackBottom;
    const traitY = Math.round(traitBottom - placeholderDisplayHeight);

    this.previewTraits.showPlaceholderAt(traitX, traitY, placeholderRawHeight, 1);

    this.previewEmptyLabel.setText('No item selected');
    this.previewEmptyLabelShadow.setVisible(false);
    this.previewEmptyLabel.setVisible(true);
    this.setOverlayRestAlpha(this.previewEmptyLabel, 0.4);

    const labelWidth = this.previewEmptyLabel.width ?? 0;
    const labelHeight = this.previewEmptyLabel.height ?? 0;
    const labelX = Math.round(traitX + (placeholderDisplayWidth - labelWidth) / 2);
    const labelY = Math.round(traitY + (placeholderDisplayHeight - labelHeight) / 2);

    this.setOverlayRestPosition(this.previewEmptyLabel, labelX, labelY);
  }

  hideEmptyPreviewMessage() {
    this.previewEmptyLabelShadow.setVisible(false);
    this.previewEmptyLabel.setVisible(false);
  }

  getOverlayPreviewEntry() {
    if (!this.isInventoryPageUnlocked(this.currentOverlayPage)) {
      return null;
    }

    const slotIndex = this.overlayHoverSlotIndex ?? this.overlayFocusSlotIndex;

    if (slotIndex === null) {
      return null;
    }

    const entry = this.getLargeSlotItem(this.currentOverlayPage, slotIndex);

    if (!entry || entry === this.inventoryDrag?.entry) {
      return null;
    }

    return entry;
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

    this.previewEntry = null;
  }

  positionOverlayHeader(panelX, panelY, panelWidth, isPageUnlocked) {
    const titleX = panelX + OVERLAY_PADDING;
    const titleY = panelY + OVERLAY_PADDING;

    this.overlayTitleShadow.setText('');
    this.setOverlayRestPosition(this.overlayTitleShadow, titleX + 1, titleY + 1);
    this.overlayTitle.setText('');
    this.setOverlayRestPosition(this.overlayTitle, titleX, titleY);

    const closeX = panelX + panelWidth - OVERLAY_PADDING + 1;
    const closeY = panelY + OVERLAY_PADDING + 6;

    this.setOverlayRestPosition(this.overlayCloseText, closeX, closeY);
    this.setOverlayZoneRestPosition(this.overlayCloseZone, closeX, closeY);
    this.overlayCloseZone.setSize(24, 24);
    this.overlayCloseZone.input.hitArea.setTo(-12, -12, 24, 24);
  }

  drawOverlayPageButtons(pageButtonX, pageButtonY, pageButtonWidth) {
    const tabWidth = pageButtonWidth / INVENTORY_PAGE_COUNT;

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

    if (isRefrigerated && isPageUnlocked) {
      this.drawRefrigeratedMarker(slotX, slotY, slotSize);
    }

    if (isPageUnlocked && item) {
      this.drawLargeSlotItem(slotX, slotY, slotSize, item);
    }
  }

  drawRefrigeratedMarker(slotX, slotY, slotSize) {
    const size = Math.max(4, Math.floor(slotSize * 0.22));

    this.overlayGraphics.fillStyle(COLORS.ice, 0.38);
    this.overlayGraphics.fillRect(slotX + 3, slotY + 3, size, 1);
    this.overlayGraphics.fillRect(slotX + 3, slotY + 3, 1, size);
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
    if (source.type !== 'large' || source.pageIndex !== this.currentOverlayPage) {
      return;
    }

    this.overlayFocusSlotIndex = this.overlayFocusSlotIndex === source.slotIndex
      ? null
      : source.slotIndex;
    this.drawOverlay();
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

    const target = this.getInventoryDropTargetAt(pointer.x, pointer.y);

    if (target) {
      this.moveInventoryEntry(this.inventoryDrag.source, target);
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

    if (overlaySlotIndex !== null && this.isInventoryPageUnlocked(this.currentOverlayPage)) {
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

    if (this.isOverlayOpen && this.isInventoryPageUnlocked(this.currentOverlayPage)) {
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

  drawEmptyPlus(slotX, slotY, slotSize) {
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

    this.graphics.fillStyle(COLORS.inset, 0.34);
    this.graphics.fillRect(left, innerTop, armReach, thickness);
    this.graphics.fillRect(innerLeft + thickness, innerTop, armReach, thickness);
    this.graphics.fillRect(innerLeft, top, thickness, armReach);
    this.graphics.fillRect(innerLeft, innerTop + thickness, thickness, armReach);
    this.graphics.fillRect(innerLeft, innerTop, thickness, thickness);
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
    const baseScale = Math.min(maxSize / naturalWidth, maxSize / naturalHeight);

    iconObject.baseScale = baseScale;
    iconObject.setPosition(Math.round(centerX), Math.round(centerY));
    this.applyIconScale(iconObject);
  }

  applyIconScale(iconObject) {
    const baseScale = iconObject.baseScale ?? 1;
    const impactX = iconObject.impactScaleX ?? 1;
    const impactY = iconObject.impactScaleY ?? 1;

    iconObject.setScale(baseScale * impactX, baseScale * impactY);
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
    } = this.overlayBounds;

    return x >= panelX
      && x <= panelX + panelWidth
      && y >= panelY
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

    const iconObject = object.createInventoryIcon?.(this.scene) ?? null;

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

    const iconObject = object.createInventoryIcon?.(this.scene) ?? null;

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
    this.scene.input.off('dragend', this.dragEndHandler);
    this.scene.input.off('drag', this.dragHandler);
    this.scene.input.off('pointerdown', this.pointerDownHandler);
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
    this.overlayPageTexts.forEach((text) => text.destroy());
    this.overlayPageTexts = [];
    this.overlayBackdropZone.destroy();
    this.overlayGraphics.destroy();
    this.inventoryDragGraphics.destroy();
    this.previewTraits.destroy();
    this.slotTraits.destroy();
    this.previewEmptyLabelShadow.destroy();
    this.previewEmptyLabel.destroy();
    this.overlayTitleShadow.destroy();
    this.overlayTitle.destroy();
    this.overlayColdLabel.destroy();
    this.overlayDryLabel.destroy();
    this.overlayCloseText.destroy();
    this.overlayCloseZone.destroy();
    this.graphics.destroy();
  }
}
