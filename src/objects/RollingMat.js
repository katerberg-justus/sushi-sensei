import * as Phaser from 'phaser/dist/phaser.esm.js';
import { IngredientObject } from './IngredientObject.js';
import { NoriSheet } from './NoriSheet.js';
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
    this.spreadRequiresCoverage = true;
    this.spreadRequiredStrokes = 18;
    this.spreadStrokeDistance = 8;
    this.finishedStackDisplayName = 'Hosomaki';
    this.restDepth = 12;
    this.footprintDepthFactor = 1;
    this.computedShadeDarkAlpha = 0.18;
    this.computedShadeLightAlpha = 0.08;

    this.sprite = scene.add.image(0, 0, textureKey);
    this.sprite.setScale(PIXEL, PIXEL * MAT_PERSPECTIVE_SQUASH);
    this.sprite.setOrigin(0.5);
    this.addDraggablePart(this.sprite);

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
      && Boolean(nori?.stackChildren?.length)
      && nori.getRollCoverage().covered;
  }

  getKneadTopping() {
    return this.getNoriSheet();
  }

  completeKneading() {
    const nori = this.getNoriSheet();

    this.finishKneading();

    this.stackLocked = true;
    this.isFinishedStack = true;
    this.kneadProgress = 1;
    this.displayName = this.finishedStackDisplayName;

    if (nori) {
      this.scene.tweens.add({
        targets: nori,
        scaleX: (nori.scaleX || 1) * 0.42,
        scaleY: (nori.scaleY || 1) * 1.1,
        y: nori.y + 2,
        duration: 180,
        ease: 'Back.Out',
        onComplete: () => {
          this.refreshCompositionShadow?.();
        },
      });
    }

    this.playFinishedStackPulse();
  }

  static paintTexture(context, rng) {
    const jitter = (range) => Math.floor(rng() * (range * 2 + 1)) - range;

    context.fillStyle = toHexColor(0x8a7556);
    context.fillRect(6, 5, 64, 3);
    context.fillRect(4, 8, 68, 49);
    context.fillRect(7, 57, 62, 3);

    for (let x = 7; x < 70; x += 5) {
      const color = x % 10 === 7 ? 0xc7b081 : 0xb79a70;
      context.fillStyle = toHexColor(color);
      context.fillRect(x + jitter(1), 7, 3, 51);
      context.fillStyle = toHexColor(0xddc796);
      context.fillRect(x + jitter(1), 9, 1, 45);
    }

    context.fillStyle = toHexColor(0x6f6048);
    for (let y = 11; y < 55; y += 9) {
      context.fillRect(5, y, 66, 1);
      if (rng() < 0.75) {
        context.fillRect(8 + Math.floor(rng() * 56), y + 2, 8 + Math.floor(rng() * 8), 1);
      }
    }

    context.fillStyle = toHexColor(0xe2d0a4);
    context.fillRect(10, 8, 54, 1);
    context.fillRect(11, 56, 50, 1);
  }
}
