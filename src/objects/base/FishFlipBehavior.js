import * as Phaser from 'phaser/dist/phaser.esm.js';

const FISH_FLIP_DURATION = 280;
const FISH_FLIP_LIFT = 12;
const FISH_FLIP_MIN_SCALE_Y = 0.08;
const FISH_UNDERSIDE_TINT = 0xe7d5c4;
const WASABI_BOTTOM_OFFSET_Y = -4;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function setupFishFlip(target, options = {}) {
  target.canFlipFish = true;
  target.isFishBottomUp = Boolean(options.isFishBottomUp);
  target.fishFlipDuration = options.fishFlipDuration ?? FISH_FLIP_DURATION;
  target.fishFlipLift = options.fishFlipLift ?? FISH_FLIP_LIFT;
  target.fishFlipTween = null;
  target.fishFlipTweenState = null;

  target.on('pointerdown', target.handleFishFlipPointerDown, target);
  target.applyFishSurfaceState(target.isFishBottomUp);
  target.updateFishBottomStackVisibility?.();
}

export const FishFlipBehavior = {
  handleFishFlipPointerDown(pointer) {
    if (!this.canFlipFish || !this.isFishFlipPointer(pointer) || !this.canStartFishFlip()) {
      return;
    }

    pointer.event?.preventDefault?.();
    this.cancelStackLongPress?.();
    this.scene?.clearPendingIngredientTraitClick?.();
    this.scene?.ui?.hideIngredientTraits?.();

    this.suppressedDragPointerId = this.getDragPointerId(pointer);
    this.fishFlipClickPointerId = this.getDragPointerId(pointer);
    this.toggleFishBottomUp();
  },

  isFishFlipPointer(pointer) {
    return this.isRightButtonPointer?.(pointer)
      || pointer?.rightButtonDown?.()
      || pointer?.button === 2
      || pointer?.event?.button === 2
      || this.isTwoFingerTouchPointer?.(pointer);
  },

  canStartFishFlip() {
    return !this.isDragging
      && !this.rotationTween
      && !this.fishFlipTween
      && !this.isSpreading
      && !this.isKneading;
  },

  didConsumeFishFlipClick(pointer) {
    const pointerId = this.getDragPointerId?.(pointer);

    if (pointerId === null || pointerId !== this.fishFlipClickPointerId) {
      return false;
    }

    this.fishFlipClickPointerId = null;
    return true;
  },

  toggleFishBottomUp() {
    return this.setFishBottomUp(!this.isFishBottomUp);
  },

  setFishBottomUp(isFishBottomUp, options = {}) {
    const nextValue = Boolean(isFishBottomUp);

    if (this.isFishBottomUp === nextValue && !options.force) {
      return this;
    }

    if (options.instant || !this.scene?.tweens) {
      this.stopFishFlipTween();
      this.isFishBottomUp = nextValue;
      this.applyFishSurfaceState(nextValue);
      this.updateFishBottomStackVisibility();
      this.refreshComputedShade?.();
      this.refreshCompositionShadow?.();
      return this;
    }

    return this.beginFishFlipTween(nextValue);
  },

  beginFishFlipTween(nextValue) {
    const startY = this.y;
    const baseScaleX = this.scaleX || 1;
    const baseScaleY = this.scaleY || 1;
    const duration = this.fishFlipDuration ?? FISH_FLIP_DURATION;
    const lift = this.fishFlipLift ?? FISH_FLIP_LIFT;
    const state = {
      progress: 0,
      hasSwappedSurface: false,
    };

    this.stopFishFlipTween();
    this.isFishBottomUp = nextValue;
    this.fishFlipTweenState = state;
    this.setComputedShadeAlpha?.(1);

    this.fishFlipTween = this.scene.tweens.add({
      targets: state,
      progress: 1,
      duration,
      ease: 'Sine.InOut',
      onUpdate: () => {
        const progress = Phaser.Math.Clamp(state.progress, 0, 1);
        const arc = Math.sin(progress * Math.PI);
        const scaleY = baseScaleY * Phaser.Math.Linear(1, FISH_FLIP_MIN_SCALE_Y, arc);

        if (!state.hasSwappedSurface && progress >= 0.5) {
          state.hasSwappedSurface = true;
          this.applyFishSurfaceState(nextValue);
          this.updateFishBottomStackVisibility();
        }

        this.setScale(baseScaleX, scaleY);
        this.setY(startY - lift * arc);
        this.setComputedShadeAlpha?.(Phaser.Math.Linear(1, 0.2, arc));
      },
      onComplete: () => {
        this.fishFlipTween = null;
        this.fishFlipTweenState = null;
        this.setScale(baseScaleX, baseScaleY);
        this.setY(startY);
        this.applyFishSurfaceState(nextValue);
        this.updateFishBottomStackVisibility();
        this.refreshComputedShade?.();
        this.refreshCompositionShadow?.();
        this.applyRestingDepth?.();
      },
      onStop: () => {
        this.fishFlipTween = null;
        this.fishFlipTweenState = null;
        this.setScale(baseScaleX, baseScaleY);
        this.setY(startY);
      },
    });

    return this;
  },

  stopFishFlipTween() {
    if (!this.fishFlipTween) {
      return;
    }

    this.fishFlipTween.stop();
    this.fishFlipTween = null;
    this.fishFlipTweenState = null;
  },

  applyFishSurfaceState(isBottomUp) {
    this.getFishFlipParts().forEach((part) => {
      part.setFlipY?.(isBottomUp);

      if (isBottomUp) {
        part.setTint?.(FISH_UNDERSIDE_TINT);
        part.setAlpha?.(0.96);
      } else {
        part.clearTint?.();
        part.setAlpha?.(1);
      }
    });

    return this;
  },

  getFishFlipParts() {
    if (Array.isArray(this.pieces) && this.pieces.length) {
      return this.pieces
        .map((piece) => piece?.image)
        .filter(Boolean);
    }

    return (this.draggableParts ?? []).filter((part) => !part?.excludeFromCompositionShadow);
  },

  acceptsStackPlacement(other, placement = {}) {
    if (other?.stackCategory === 'wasabi' && !this.isFishBottomUp) {
      return false;
    }

    return true;
  },

  getStackPlacementRejectionReason(other, placement = {}) {
    if (other?.stackCategory === 'wasabi' && !this.isFishBottomUp) {
      return 'flip fish to add wasabi to the bottom';
    }

    return 'stack OK';
  },

  getStackPlacementOffset(child, drop = {}) {
    if (child?.stackCategory !== 'wasabi') {
      return {
        x: this.stackOffsetX ?? 0,
        y: this.stackOffsetY ?? -4,
      };
    }

    const bounds = this.getLocalVisualBounds?.();

    if (!bounds) {
      return { x: 0, y: this.stackOffsetY ?? -4 };
    }

    const dropX = drop.x ?? child?.x ?? this.x;
    const dropY = drop.y ?? child?.y ?? this.y;
    const localPoint = this.worldToLocalPoint?.({ x: dropX, y: dropY }) ?? { x: 0, y: 0 };
    const marginX = Math.min(Math.max((child.displayWidth ?? 12) * 0.22, 2), bounds.width * 0.42);
    const marginY = Math.min(Math.max((child.displayHeight ?? 10) * 0.22, 2), bounds.height * 0.42);

    return {
      x: bounds.x + bounds.width / 2,
      y: clamp(localPoint.y + WASABI_BOTTOM_OFFSET_Y, bounds.y + marginY, bounds.y + bounds.height - marginY),
    };
  },

  handleStackChildAttached(child) {
    this.updateFishBottomStackChildVisibility(child);
    this.refreshCompositionShadow?.();
  },

  handleStackChildDetached(child) {
    if (child?.stackCategory === 'wasabi') {
      child.setVisible?.(true);
      child.shadow?.setVisible?.(true);
    }

    this.refreshCompositionShadow?.();
  },

  updateFishBottomStackVisibility() {
    (this.stackChildren ?? []).forEach((child) => {
      this.updateFishBottomStackChildVisibility(child);
    });
  },

  updateFishBottomStackChildVisibility(child) {
    if (child?.stackCategory !== 'wasabi') {
      return;
    }

    const visible = Boolean(this.isFishBottomUp);

    child.setVisible?.(visible);
    child.shadow?.setVisible?.(visible);
  },

  destroy(fromScene) {
    this.stopFishFlipTween();
    return fromScene;
  },
};
