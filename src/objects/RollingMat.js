import * as Phaser from 'phaser/dist/phaser.esm.js';
import { IngredientObject } from './IngredientObject.js';
import { NoriSheet } from './NoriSheet.js';
import { SushiRoll } from './SushiRoll.js';
import { resolveVariantTexture, toHexColor } from './ProceduralTexture.js';

const PIXEL = 2;
const MAT_BASE_KEY = 'rolling-mat-pixel';
const MAT_VARIANT_POOL = 4;
const MAT_WIDTH = 76;
const MAT_HEIGHT = 64;
const MAT_WEIGHT_GRAMS = 120;
const MAT_PERSPECTIVE_SQUASH = 0.6;

export class RollingMat extends IngredientObject {
  constructor(scene, x, y, options = {}) {
    const { textureKey, variantIndex } = resolveVariantTexture(scene, MAT_BASE_KEY, options, {
      width: MAT_WIDTH,
      height: MAT_HEIGHT,
      pool: MAT_VARIANT_POOL,
      paint: RollingMat.paintTexture,
      shapeNoise: { chipChance: 0.006, bumpChance: 0.004 },
    });
    const displayWidth = MAT_WIDTH * PIXEL;
    const displayHeight = MAT_HEIGHT * PIXEL * MAT_PERSPECTIVE_SQUASH;

    super(scene, x, y, displayWidth, displayHeight, {
      ...options,
      visualVariation: false,
    });

    this.setCenteredHitbox(displayWidth, displayHeight);
    this.ownWeightGrams = options.weightGrams ?? MAT_WEIGHT_GRAMS;
    this.displayName = 'Rolling Mat';
    this.variantIndex = variantIndex;
    this.stackCategory = 'mat';
    this.acceptedStackCategories = ['nori', 'rice', 'fish'];
    this.maxStackedItems = 10;
    this.stackOffsetX = 0;
    this.stackOffsetY = -3;
    this.preserveStackChildRotation = true;
    this.kneadableStackCategory = 'nori';
    this.kneadRequiredStrokes = 5;
    this.kneadStrokeDistance = 16;
    this.rollProgressBase = null;
    this.rollStartSide = null;
    this.rollDragStartLocalY = null;
    this.rollClipGraphics = null;
    this.rollClipMask = null;
    this.rollWrapOverlay = null;
    this.rollStartSideDepth = 18;
    this.rollHoverHighlight = null;
    this.rollHoverSide = null;
    this.rollHoverPointerMoveHandler = null;
    this.softness = 0.05;
    this.spreadRequiresCoverage = true;
    this.spreadRequiredStrokes = 18;
    this.spreadStrokeDistance = 8;
    this.finishedStackDisplayName = 'Hosomaki';
    this.restDepth = 12;
    this.isFlat = true;
    this.footprintDepthFactor = 1;
    this.computedShadeDarkAlpha = 0.18;
    this.computedShadeLightAlpha = 0.08;

    this.sprite = scene.add.image(0, 0, textureKey);
    this.sprite.setScale(PIXEL, PIXEL * MAT_PERSPECTIVE_SQUASH);
    this.sprite.setOrigin(0.5);
    this.addDraggablePart(this.sprite);

    this.on('pointerover', this.handleRollHoverMove, this);
    this.on('pointermove', this.handleRollHoverMove, this);
    this.on('pointerout', this.hideRollHoverHighlight, this);
    this.rollHoverPointerMoveHandler = (pointer) => {
      this.handleRollHoverPointerMove(pointer);
    };
    this.scene.input.on('pointermove', this.rollHoverPointerMoveHandler);

    this.refreshCompositionShadow();
    this.applyRestingDepth();
  }

  getNoriSheet() {
    return (this.stackChildren ?? []).find((child) => child instanceof NoriSheet) ?? null;
  }

  accepts(other, placement = {}) {
    if (other?.stackCategory === 'nori') {
      return !this.getNoriSheet() && super.accepts(other, placement);
    }

    const nori = this.getNoriSheet();

    return Boolean(nori?.accepts?.(other, placement));
  }

  getStackRejectionReason(other, placement = {}) {
    if (other?.stackCategory === 'nori') {
      return this.getNoriSheet() ? 'mat already has nori' : super.getStackRejectionReason(other, placement);
    }

    const nori = this.getNoriSheet();

    if (!nori) {
      return 'mat needs nori first';
    }

    return nori.getStackRejectionReason?.(other, placement) ?? 'nori rejected placement';
  }

  getStackPlacementOffset(child, drop = {}) {
    if (child?.stackCategory === 'nori') {
      return { x: 0, y: -3 };
    }

    const nori = this.getNoriSheet();

    if (!nori?.getStackPlacementOffset) {
      return { x: 0, y: -3 };
    }

    const noriWorld = this.localToWorldPoint({ x: nori.x, y: nori.y });
    const delegated = nori.getStackPlacementOffset(child, drop);

    if (!delegated) {
      return { x: nori.x, y: nori.y };
    }

    const worldOffset = nori.localVectorToWorld(new Phaser.Math.Vector2(delegated.x, delegated.y));
    const localPoint = this.worldToLocalPoint({
      x: noriWorld.x + worldOffset.x,
      y: noriWorld.y + worldOffset.y,
    });

    return { x: localPoint.x, y: localPoint.y };
  }

  handleStackChildAttached(child) {
    if (child?.stackCategory === 'nori') {
      this.bringToTop(child);
      this.refreshCompositionShadow?.();
      return;
    }

    const nori = this.getNoriSheet();

    if (!nori?.accepts?.(child)) {
      return;
    }

    this.moveChildOntoNori(child, nori);
  }

  moveChildOntoNori(child, nori) {
    const worldPoint = this.localToWorldPoint({ x: child.x, y: child.y });
    const index = this.stackChildren.indexOf(child);

    if (index !== -1) {
      this.stackChildren.splice(index, 1);
    }

    child.unhoistShadowFromStack?.();
    this.remove(child);
    this.scene.add.existing(child);
    child.stackParent = null;
    child.setPosition(worldPoint.x, worldPoint.y);
    child.setRotation((this.rotation ?? 0) + (child.rotation ?? 0));
    child.refreshRotatedGeometry?.();
    child.attachToStackTarget(nori);
    this.refreshCompositionShadow?.();
  }

  canStartSpreading() {
    const nori = this.getNoriSheet();

    return Boolean(nori?.canStartSpreading?.());
  }

  getSpreadIngredient() {
    return this.getNoriSheet()?.getSpreadIngredient?.() ?? null;
  }

  beginSpreadFeedback(position, rice) {
    return this.getNoriSheet()?.beginSpreadFeedback?.(position, rice) ?? 0;
  }

  updateSpreadFeedback(position, options = {}) {
    return this.getNoriSheet()?.updateSpreadFeedback?.(position, options) ?? null;
  }

  finishSpreadFeedback() {
    this.getNoriSheet()?.finishSpreadFeedback?.();
  }

  completeSpreadFeedback() {
    this.getNoriSheet()?.completeSpreadFeedback?.();
  }

  completeSpreading() {
    const nori = this.getNoriSheet();

    if (!nori) {
      super.completeSpreading();
      return;
    }

    this.completeSpreadFeedback();
    this.finishSpreading();
    this.replaceNoriOnMat(nori, nori.createSpreadStackResult?.(nori.getSpreadIngredient?.()));
  }

  replaceNoriOnMat(oldNori, newNori) {
    if (!newNori) {
      return;
    }

    const oldIndex = this.stackChildren.indexOf(oldNori);
    const replacementX = oldNori.x;
    const replacementY = oldNori.y;
    const oldChildren = [...(oldNori.stackChildren ?? [])];
    const cuttableObjects = this.scene?.cuttableObjects;
    const cuttableIndex = Array.isArray(cuttableObjects) ? cuttableObjects.indexOf(oldNori) : -1;

    oldNori.stackChildren = [];
    oldChildren.forEach((child) => {
      child.stackParent = null;
      child.destroy();
    });

    oldNori.stackParent = null;
    this.remove(oldNori);
    oldNori.destroy();

    this.add(newNori);
    newNori.setPosition(replacementX, replacementY);
    newNori.setRotation((newNori.rotation ?? 0) - (this.rotation ?? 0));
    newNori.stackParent = this;
    newNori.disableInteractive();

    if (oldIndex === -1) {
      this.stackChildren.push(newNori);
    } else {
      this.stackChildren.splice(oldIndex, 1, newNori);
    }

    newNori.hoistShadowInto?.(this, newNori.x, newNori.y);
    newNori.refreshRotatedGeometry?.();
    this.refreshCompositionShadow?.();
    newNori.playFinishedStackPulse?.();

    if (cuttableIndex !== -1) {
      cuttableObjects.splice(cuttableIndex, 1, newNori);
    }
  }

  canStartKneading() {
    const nori = this.getNoriSheet();

    return !this.isFinishedStack
      && !this.stackLocked
      && Boolean(nori?.hasSpreadRice)
      && this.hasRollFilling(nori);
  }

  hasRollFilling(nori = this.getNoriSheet()) {
    return Boolean(
      nori?.stackChildren?.some((child) => child?.stackCategory === 'fish'),
    );
  }

  getKneadTopping() {
    return this.getNoriSheet();
  }

  handleRollHoverPointerMove(pointer) {
    if (!this.scene || this.isKneading || !this.canStartKneading()) {
      this.hideRollHoverHighlight();
      return;
    }

    const position = pointer ? { x: pointer.x, y: pointer.y } : null;

    if (!this.isRollHoverPositionInsideMat(position)) {
      this.hideRollHoverHighlight();
      return;
    }

    this.rollHoverSide = this.getRollStartSide(position);
    this.showRollHoverHighlight();
  }

  handleRollHoverMove(pointer) {
    if (this.isKneading || !this.canStartKneading()) {
      this.hideRollHoverHighlight();
      return;
    }

    const position = pointer ? { x: pointer.x, y: pointer.y } : null;
    const nextSide = this.getRollStartSide(position);

    if (!nextSide) {
      this.hideRollHoverHighlight();
      return;
    }

    this.rollHoverSide = nextSide;
    this.showRollHoverHighlight();
  }

  getRollMatBounds() {
    return new Phaser.Geom.Rectangle(
      -MAT_WIDTH * PIXEL / 2,
      -MAT_HEIGHT * PIXEL * MAT_PERSPECTIVE_SQUASH / 2,
      MAT_WIDTH * PIXEL,
      MAT_HEIGHT * PIXEL * MAT_PERSPECTIVE_SQUASH,
    );
  }

  showRollHoverHighlight() {
    if (!this.sprite) {
      return;
    }

    if (!this.rollHoverHighlight) {
      this.rollHoverHighlight = this.scene.add.graphics();
      this.rollHoverHighlight.excludeFromCompositionShadow = true;
      this.add(this.rollHoverHighlight);
    }

    const bounds = this.getRollMatBounds();
    const sideDepth = Math.min(this.rollStartSideDepth, bounds.height * 0.32);
    const topY = bounds.y;
    const bottomY = bounds.y + bounds.height - sideDepth;
    const bandY = this.rollHoverSide === 'top'
      ? topY
      : this.rollHoverSide === 'bottom'
        ? bottomY
        : null;

    if (bandY === null) {
      this.hideRollHoverHighlight();
      return;
    }

    this.rollHoverHighlight.clear();
    this.drawRollHoverBand(bounds.x, bandY, bounds.width, sideDepth);
    this.rollHoverHighlight.setVisible(true);
  }

  drawRollHoverBand(x, y, width, height) {
    if (!this.rollHoverHighlight) {
      return;
    }

    this.rollHoverHighlight.fillStyle(0xfff2a8, 0.18);
    this.rollHoverHighlight.fillRect(x, y, width, height);
    this.rollHoverHighlight.lineStyle(3, 0xfff2a8, 0.72);
    this.rollHoverHighlight.strokeRect(x, y, width, height);
  }

  hideRollHoverHighlight() {
    this.rollHoverSide = null;
    this.rollHoverHighlight?.setVisible(false);
  }

  isRollHoverPositionInsideMat(position) {
    if (!position || !this.sprite) {
      return false;
    }

    const local = this.worldToLocalPoint(position);
    const bounds = this.getRollMatBounds();

    return local.x >= bounds.x
      && local.x <= bounds.x + bounds.width
      && local.y >= bounds.y
      && local.y <= bounds.y + bounds.height;
  }

  beginKneading(pointer) {
    const position = this.getKneadPointerPosition(pointer);
    const startSide = this.getRollStartSide(position);

    if (!startSide) {
      return false;
    }

    this.hideRollHoverHighlight();
    this.rollProgressBase = null;
    this.rollStartSide = startSide;
    const nori = this.getNoriSheet();

    if (nori) {
      this.rollProgressBase = {
        scaleX: nori.scaleX || 1,
        scaleY: nori.scaleY || 1,
        y: nori.y || 0,
      };
    }

    this.rollDragStartLocalY = this.worldToLocalPoint(position).y;
    this.ensureRollWrapOverlay();
    this.ensureRollClipMask();
    this.setRollProgress(0);

    const started = super.beginKneading(pointer);

    if (!started) {
      this.rollProgressBase = null;
      this.rollStartSide = null;
      this.rollDragStartLocalY = null;
      this.hideRollWrapOverlay();
      this.clearRollClipMask();
    }

    this.bringRollWrapOverlayToTop();

    return started;
  }

  getRollStartSide(position) {
    if (!position || !this.sprite) {
      return null;
    }

    const local = this.worldToLocalPoint(position);
    const bounds = this.getRollMatBounds();
    const sideDepth = Math.min(this.rollStartSideDepth, bounds.height * 0.32);
    const insideX = local.x >= bounds.x && local.x <= bounds.x + bounds.width;

    if (!insideX) {
      return null;
    }

    if (local.y >= bounds.y && local.y <= bounds.y + sideDepth) {
      return 'top';
    }

    if (local.y <= bounds.y + bounds.height && local.y >= bounds.y + bounds.height - sideDepth) {
      return 'bottom';
    }

    return null;
  }

  handleKneadPointerMove(pointer) {
    if (!this.isKneading) {
      return;
    }

    if (!this.kneadUsesTouch && this.getDragPointerId(pointer) !== this.kneadPointerId) {
      return;
    }

    const position = this.getKneadPointerPosition(pointer);

    if (!position) {
      return;
    }

    const local = this.worldToLocalPoint(position);
    const startY = this.rollDragStartLocalY ?? this.worldToLocalPoint(this.kneadGestureAnchor).y;
    const directionalDistance = this.rollStartSide === 'top'
      ? local.y - startY
      : startY - local.y;

    if (directionalDistance <= 0) {
      return;
    }

    const nextProgress = Phaser.Math.Clamp(
      directionalDistance / this.getRollRequiredDragDistance(),
      0,
      1,
    );

    if (nextProgress <= this.kneadProgress) {
      return;
    }

    this.kneadGestureAnchor = position;
    this.setRollProgress(nextProgress);

    if (this.kneadProgress < 1) {
      return;
    }

    this.completeKneading();
  }

  getRollRequiredDragDistance() {
    if (!this.sprite) {
      return 56;
    }

    const bounds = this.getRollMatBounds();
    const sideDepth = Math.min(this.rollStartSideDepth, bounds.height * 0.32);

    return Math.max(42, bounds.height - sideDepth);
  }

  updateKneadMeter() {
    if (!this.kneadMeter) {
      return;
    }

    const bounds = this.getKneadMeterBounds();
    const progress = Phaser.Math.Clamp(this.kneadProgress, 0, 1);
    const trackWidth = 8;
    const trackHeight = Math.max(48, bounds.height - 12);
    const x = bounds.x + bounds.width + 9;
    const y = bounds.y + bounds.height / 2 - trackHeight / 2;
    const fillHeight = trackHeight * progress;
    const arrowInset = 8;
    const nextDirection = this.getNextRollDirection();

    this.kneadMeter.clear();
    this.kneadMeter.fillStyle(0x2f2419, 0.22);
    this.kneadMeter.fillRoundedRect(x, y, trackWidth, trackHeight, 3);
    this.kneadMeter.lineStyle(2, 0x6b4a32, 0.45);
    this.kneadMeter.strokeRoundedRect(x, y, trackWidth, trackHeight, 3);

    if (fillHeight > 0) {
      this.kneadMeter.fillStyle(0xfff2a8, 0.9);
      this.kneadMeter.fillRoundedRect(x, y + trackHeight - fillHeight, trackWidth, fillHeight, 3);
    }

    const centerX = x + trackWidth / 2;

    this.kneadMeter.lineStyle(2, 0xfff2a8, nextDirection === 'down' ? 0.9 : 0.45);
    this.kneadMeter.lineBetween(centerX - 8, y + arrowInset, centerX - 8, y + trackHeight - arrowInset);
    this.kneadMeter.lineBetween(centerX - 8, y + trackHeight - arrowInset, centerX - 11, y + trackHeight - arrowInset - 5);
    this.kneadMeter.lineBetween(centerX - 8, y + trackHeight - arrowInset, centerX - 5, y + trackHeight - arrowInset - 5);
    this.kneadMeter.lineStyle(2, 0xfff2a8, nextDirection === 'up' ? 0.9 : 0.45);
    this.kneadMeter.lineBetween(centerX + 8, y + trackHeight - arrowInset, centerX + 8, y + arrowInset);
    this.kneadMeter.lineBetween(centerX + 8, y + arrowInset, centerX + 5, y + arrowInset + 5);
    this.kneadMeter.lineBetween(centerX + 8, y + arrowInset, centerX + 11, y + arrowInset + 5);
  }

  getNextRollDirection() {
    return this.rollStartSide === 'top' ? 'down' : 'up';
  }

  setRollProgress(progress) {
    this.kneadProgress = Phaser.Math.Clamp(progress, 0, 1);
    this.kneadStrokeCount = Math.round(this.kneadProgress * this.kneadRequiredStrokes);
    this.updateRollVisuals();
    this.updateKneadMeter();
  }

  updateRollVisuals() {
    this.applyRollProgressVisual();
    this.updateRolledMatCrop();
    this.updateRollClipMask();
    this.drawRollWrapOverlay();
  }

  updateRolledMatCrop() {
    if (!this.sprite) {
      return;
    }

    const progress = Phaser.Math.Clamp(this.kneadProgress, 0, 1);
    const rolledPixels = Math.round(MAT_HEIGHT * progress);

    if (this.rollStartSide === 'top') {
      const cropY = Math.min(MAT_HEIGHT - 1, rolledPixels);

      this.sprite.setCrop(0, cropY, MAT_WIDTH, MAT_HEIGHT - cropY);
      return;
    }

    if (this.rollStartSide === 'bottom') {
      const cropHeight = Math.max(1, MAT_HEIGHT - rolledPixels);

      this.sprite.setCrop(0, 0, MAT_WIDTH, cropHeight);
    }
  }

  resetRolledMatCrop() {
    this.sprite?.setCrop();
  }

  ensureRollClipMask() {
    const nori = this.getNoriSheet();

    if (!nori) {
      return;
    }

    if (!this.rollClipGraphics) {
      this.rollClipGraphics = this.scene.add.graphics();
      this.rollClipGraphics.setVisible(false);
    }

    if (!this.rollClipMask) {
      this.rollClipMask = this.rollClipGraphics.createGeometryMask();
    }

    nori.setMask(this.rollClipMask);
  }

  updateRollClipMask() {
    const nori = this.getNoriSheet();

    if (!nori || !this.rollClipGraphics || !this.sprite) {
      return;
    }

    const bounds = this.getRollMatBounds();
    const progress = Phaser.Math.Clamp(this.kneadProgress, 0, 1);
    const sideDepth = Math.min(this.rollStartSideDepth, bounds.height * 0.32);
    const travel = bounds.height - sideDepth;
    const fromTop = this.rollStartSide === 'top';
    const edgeY = fromTop
      ? bounds.y + travel * progress + sideDepth
      : bounds.y + bounds.height - sideDepth - travel * progress;
    const top = fromTop ? edgeY : bounds.y;
    const bottom = fromTop ? bounds.y + bounds.height : edgeY;

    this.rollClipGraphics.clear();

    if (bottom <= top) {
      return;
    }

    const corners = [
      this.localToWorldPoint({ x: bounds.x, y: top }),
      this.localToWorldPoint({ x: bounds.x + bounds.width, y: top }),
      this.localToWorldPoint({ x: bounds.x + bounds.width, y: bottom }),
      this.localToWorldPoint({ x: bounds.x, y: bottom }),
    ];

    this.rollClipGraphics.fillStyle(0xffffff);
    this.rollClipGraphics.beginPath();
    this.rollClipGraphics.moveTo(corners[0].x, corners[0].y);
    corners.slice(1).forEach((corner) => {
      this.rollClipGraphics.lineTo(corner.x, corner.y);
    });
    this.rollClipGraphics.closePath();
    this.rollClipGraphics.fillPath();
  }

  clearRollClipMask() {
    this.getNoriSheet()?.clearMask();
    this.rollClipGraphics?.clear();
  }

  applyRollProgressVisual() {
    const nori = this.getNoriSheet();

    if (!nori) {
      return;
    }

    const base = this.rollProgressBase ?? {
      scaleX: nori.scaleX || 1,
      scaleY: nori.scaleY || 1,
      y: nori.y || 0,
    };
    const progress = Phaser.Math.Clamp(this.kneadProgress, 0, 1);
    const targetScaleX = base.scaleX * Phaser.Math.Linear(1, 1.06, progress);
    const targetScaleY = base.scaleY * Phaser.Math.Linear(1, 0.62, progress);
    const targetY = base.y + Phaser.Math.Linear(0, 1.5, progress);

    nori.setScale(targetScaleX, targetScaleY);
    nori.setY(targetY);
    this.refreshCompositionShadow?.();
  }

  ensureRollWrapOverlay() {
    if (!this.rollWrapOverlay) {
      this.rollWrapOverlay = this.scene.add.graphics();
      this.rollWrapOverlay.excludeFromCompositionShadow = true;
      this.rollWrapOverlay.excludeFromComputedShade = true;
      this.add(this.rollWrapOverlay);
    }

    this.bringRollWrapOverlayToTop();
    this.rollWrapOverlay.setVisible(true);
  }

  bringRollWrapOverlayToTop() {
    if (!this.rollWrapOverlay) {
      return;
    }

    this.bringToTop(this.rollWrapOverlay);
  }

  drawRollWrapOverlay() {
    if (!this.rollWrapOverlay || !this.sprite) {
      return;
    }

    const bounds = this.getRollMatBounds();
    const progress = Phaser.Math.Clamp(this.kneadProgress, 0, 1);
    const sideDepth = Math.min(this.rollStartSideDepth, bounds.height * 0.32);
    const travel = bounds.height - sideDepth;
    const fromTop = this.rollStartSide === 'top';
    const leadingY = fromTop
      ? bounds.y + travel * progress
      : bounds.y + bounds.height - sideDepth - travel * progress;

    this.rollWrapOverlay.clear();
    this.bringRollWrapOverlayToTop();
    this.drawOpaqueMatLip(bounds.x, leadingY, bounds.width, sideDepth);
  }

  drawOpaqueMatLip(x, y, width, height) {
    this.rollWrapOverlay.fillStyle(0xae8c5e);
    this.rollWrapOverlay.fillRect(x, y, width, height);
    this.rollWrapOverlay.fillStyle(0xd4be93);
    this.rollWrapOverlay.fillRect(x + 2, y + 2, width - 4, Math.max(1, height - 4));
    this.drawMatSlats(x + 2, y + 2, width - 4, Math.max(1, height - 4), 0.8);
    this.rollWrapOverlay.lineStyle(2, 0xae8c5e, 1);
    this.rollWrapOverlay.strokeRect(x, y, width, height);
  }

  drawMatSlats(x, y, width, height, alpha = 0.8) {
    this.rollWrapOverlay.fillStyle(0xae8c5e, alpha);
    for (let lineY = y + 3; lineY < y + height - 1; lineY += 4) {
      this.rollWrapOverlay.fillRect(x, lineY, width, 1);
    }
  }

  hideRollWrapOverlay() {
    this.rollWrapOverlay?.clear();
    this.rollWrapOverlay?.setVisible(false);
    this.resetRolledMatCrop();
    this.clearRollClipMask();
  }

  finishKneading() {
    const shouldResetRoll = this.isKneading
      && this.kneadProgress < 1
      && this.rollProgressBase;
    const completedRoll = this.kneadProgress >= 1;
    const nori = shouldResetRoll ? this.getNoriSheet() : null;
    const base = this.rollProgressBase;

    super.finishKneading();
    this.rollStartSide = null;
    this.rollDragStartLocalY = null;

    if (!completedRoll) {
      this.hideRollWrapOverlay();
    }

    if (!shouldResetRoll || !nori || !base) {
      return;
    }

    this.scene.tweens.add({
      targets: nori,
      scaleX: base.scaleX,
      scaleY: base.scaleY,
      y: base.y,
      duration: 120,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.rollProgressBase = null;
        this.refreshCompositionShadow?.();
      },
    });
  }

  completeKneading() {
    const nori = this.getNoriSheet();
    const base = this.rollProgressBase ?? (
      nori
        ? { scaleX: nori.scaleX || 1, scaleY: nori.scaleY || 1, y: nori.y || 0 }
        : null
    );
    const fillingType = this.resolveRollFillingType(nori);
    const rollWorldX = this.x;
    const rollWorldY = this.y;
    const rollRotation = this.rotation ?? 0;

    this.finishKneading();

    this.stackLocked = true;
    this.isFinishedStack = true;
    this.kneadProgress = 1;
    this.displayName = this.finishedStackDisplayName;

    const spawnSushiRoll = () => {
      this.rollProgressBase = null;
      this.hideRollWrapOverlay();

      if (!this.scene) {
        return;
      }

      this.consumeRolledNori(nori);

      const sushiRoll = new SushiRoll(this.scene, rollWorldX, rollWorldY, { fillingType });

      sushiRoll.setObjectRotation(rollRotation);
      this.attachRollResult(sushiRoll);
      this.stackLocked = false;
      this.isFinishedStack = false;
      this.displayName = 'Rolling Mat';
      this.refreshCompositionShadow?.();
      sushiRoll.playFinishedStackPulse?.();
    };

    if (nori) {
      this.scene.tweens.add({
        targets: nori,
        scaleX: (base?.scaleX ?? nori.scaleX ?? 1) * 1.1,
        scaleY: (base?.scaleY ?? nori.scaleY ?? 1) * 0.42,
        y: (base?.y ?? nori.y ?? 0) + 2,
        duration: 180,
        ease: 'Back.Out',
        onComplete: spawnSushiRoll,
      });
    } else {
      spawnSushiRoll();
    }

    this.playFinishedStackPulse();
  }

  consumeRolledNori(nori = this.getNoriSheet()) {
    if (!nori) {
      return;
    }

    const cuttableObjects = this.scene?.cuttableObjects;
    const cuttableIndex = Array.isArray(cuttableObjects) ? cuttableObjects.indexOf(nori) : -1;
    const index = this.stackChildren.indexOf(nori);

    if (index !== -1) {
      this.stackChildren.splice(index, 1);
    }

    nori.stackChildren = [...(nori.stackChildren ?? [])];
    nori.stackChildren.forEach((child) => {
      child.stackParent = null;
      child.destroy();
    });
    nori.stackChildren = [];
    nori.clearMask?.();
    nori.unhoistShadowFromStack?.();
    nori.stackParent = null;
    this.remove(nori);
    nori.destroy();

    if (cuttableIndex !== -1) {
      cuttableObjects.splice(cuttableIndex, 1);
    }
  }

  attachRollResult(sushiRoll) {
    if (!sushiRoll) {
      return;
    }

    const offsetX = this.stackOffsetX ?? 0;
    const offsetY = this.stackOffsetY ?? -3;
    const preservedWorldRotation = sushiRoll.rotation ?? 0;

    this.add(sushiRoll);
    sushiRoll.setPosition(offsetX, offsetY);
    sushiRoll.setRotation(this.preserveStackChildRotation
      ? preservedWorldRotation - (this.rotation ?? 0)
      : 0);
    sushiRoll.refreshRotatedGeometry?.();
    sushiRoll.hoistShadowInto?.(this, offsetX, offsetY);

    if (sushiRoll.input) {
      sushiRoll.disableInteractive();
    }

    sushiRoll.stackParent = this;
    this.stackChildren.push(sushiRoll);

    const cuttableObjects = this.scene?.cuttableObjects;

    if (Array.isArray(cuttableObjects) && !cuttableObjects.includes(sushiRoll)) {
      cuttableObjects.push(sushiRoll);
    }
  }

  resolveRollFillingType(nori = this.getNoriSheet()) {
    const fishChild = nori?.stackChildren?.find((child) => (
      child?.stackCategory === 'fish' && typeof child.fishType === 'string'
    ));

    return fishChild?.fishType ?? 'salmon';
  }

  destroy(fromScene) {
    if (this.rollHoverPointerMoveHandler) {
      this.scene?.input?.off('pointermove', this.rollHoverPointerMoveHandler);
      this.rollHoverPointerMoveHandler = null;
    }

    this.rollHoverHighlight?.destroy();
    this.rollHoverHighlight = null;
    this.rollWrapOverlay?.destroy();
    this.rollWrapOverlay = null;
    this.clearRollClipMask();
    this.rollClipGraphics?.destroy();
    this.rollClipGraphics = null;
    this.rollClipMask = null;

    super.destroy(fromScene);
  }

  static paintTexture(context, rng) {
    context.fillStyle = toHexColor(0xae8c5e);
    context.fillRect(6, 5, 64, 3);
    context.fillRect(4, 8, 68, 49);
    context.fillRect(7, 57, 62, 3);

    context.fillStyle = toHexColor(0xd4be93);
    for (let y = 9; y < 57; y += 10) {
      context.fillRect(9, y, 58, 6);
    }
    void rng;
  }
}
