import * as Phaser from 'phaser/dist/phaser.esm.js';
import { DraggableObject } from './DraggableObject.js';

export class RotatableObject extends DraggableObject {
  constructor(scene, x, y, width, height, options = {}) {
    super(scene, x, y, width, height, options);

    this.isRotatable = true;
    this.rotationStep = Phaser.Math.DegToRad(90);
    this.rotationDuration = 180;
    this.doubleClickInterval = 300;
    this.rotateClickDragTolerance = 6;
    this.clickDragTolerance = this.rotateClickDragTolerance;
    this.lastRotateClickTime = -Infinity;
    this.lastRotateClickX = null;
    this.lastRotateClickY = null;
    this.rotationTween = null;
    this.rotationOnlyPointerId = null;
    this.rotationClickPointerId = null;
    this.rotationRejectTween = null;
    this.rotationRejectAmplitude = Phaser.Math.DegToRad(2);
    this.rotationRejectDuration = 45;

    this.on('pointerdown', this.handleRotatePointerDown, this);
  }

  handleRotatePointerDown(pointer) {
    if (!this.isRotatable || !this.isRotatePointer(pointer)) {
      return;
    }

    const clickTime = pointer.downTime ?? this.scene.time.now;

    if (this.isRotateDoubleClick(pointer, clickTime)) {
      this.clearLastRotateClick();
      this.rotationOnlyPointerId = this.getDragPointerId(pointer);
      this.rotationClickPointerId = this.getDragPointerId(pointer);
      this.pendingClickDragPointerId = null;
      this.scene?.clearPendingIngredientTraitClick?.();
      this.scene?.ui?.hideIngredientTraits?.();
      this.rotateBy(this.rotationStep);
      return;
    }

    this.lastRotateClickTime = clickTime;
    this.lastRotateClickX = pointer.x;
    this.lastRotateClickY = pointer.y;
    this.rotationOnlyPointerId = null;
    this.rotationClickPointerId = null;
  }

  isRotateDoubleClick(pointer, clickTime) {
    if (clickTime - this.lastRotateClickTime > this.doubleClickInterval) {
      return false;
    }

    const x = pointer?.x;
    const y = pointer?.y;

    if (![x, y, this.lastRotateClickX, this.lastRotateClickY].every(Number.isFinite)) {
      return true;
    }

    return Phaser.Math.Distance.Between(
      this.lastRotateClickX,
      this.lastRotateClickY,
      x,
      y,
    ) <= this.rotateClickDragTolerance;
  }

  clearLastRotateClick() {
    this.lastRotateClickTime = -Infinity;
    this.lastRotateClickX = null;
    this.lastRotateClickY = null;
  }

  didConsumeRotationClick(pointer) {
    const pointerId = this.getDragPointerId(pointer);

    if (pointerId === null || pointerId !== this.rotationClickPointerId) {
      return false;
    }

    this.rotationClickPointerId = null;
    return true;
  }

  isRotatePointer(pointer) {
    return this.isPrimaryDragPointer(pointer);
  }

  shouldSuppressDragStart(pointer) {
    const pointerId = this.getDragPointerId(pointer);

    if (pointerId === null) {
      return false;
    }

    return super.shouldSuppressDragStart(pointer)
      || pointerId === this.rotationOnlyPointerId
      || pointerId === this.suppressedDragPointerId;
  }

  rotateBy(angle) {
    const target = (this.rotation ?? 0) + angle;

    if (!this.canRotateTo(target)) {
      this.playRotationRejectBuzz();
      return this;
    }

    return this.tweenObjectRotation(target);
  }

  canRotateTo(angle) {
    if (typeof this.canOccupyPosition !== 'function') {
      return true;
    }

    const originalRotation = this.rotation ?? 0;

    this.rotation = angle;

    let allowed;
    try {
      allowed = this.canOccupyPosition(this.x, this.y);
    } finally {
      this.rotation = originalRotation;
    }

    return allowed;
  }

  playRotationRejectBuzz() {
    if (!this.scene?.tweens) {
      return this;
    }

    this.stopRotationRejectBuzz();
    this.stopRotationTween();

    const baseRotation = this.rotation ?? 0;
    const amplitude = this.rotationRejectAmplitude;

    this.rotationRejectTween = this.scene.tweens.add({
      targets: this,
      rotation: baseRotation + amplitude,
      duration: this.rotationRejectDuration,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: 1,
      onUpdate: () => {
        this.refreshRotatedGeometry({ transient: true });
      },
      onComplete: () => {
        this.rotationRejectTween = null;
        this.applyObjectRotation(baseRotation);
      },
      onStop: () => {
        this.rotationRejectTween = null;
      },
    });

    return this;
  }

  stopRotationRejectBuzz() {
    if (!this.rotationRejectTween) {
      return;
    }

    this.rotationRejectTween.stop();
    this.rotationRejectTween = null;
  }

  setObjectRotation(angle) {
    this.stopRotationTween();
    this.applyObjectRotation(angle);

    return this;
  }

  applyObjectRotation(angle) {
    const normalizedAngle = Phaser.Math.Angle.Wrap(angle);

    this.setRotation(normalizedAngle);
    this.refreshRotatedGeometry();

    return this;
  }

  tweenObjectRotation(angle) {
    const startRotation = this.rotation ?? 0;
    const endRotation = startRotation + Phaser.Math.Angle.ShortestBetween(
      Phaser.Math.RadToDeg(startRotation),
      Phaser.Math.RadToDeg(angle),
    ) * Phaser.Math.DegToRad(1);

    this.stopRotationTween();
    this.beforeObjectRotationTween(endRotation, startRotation);

    this.rotationTween = this.scene.tweens.add({
      targets: this,
      rotation: endRotation,
      duration: this.rotationDuration,
      ease: 'Cubic.Out',
      onUpdate: () => {
        this.refreshRotatedGeometry({ transient: true });
      },
      onComplete: () => {
        this.rotationTween = null;
        this.applyObjectRotation(endRotation);
        this.afterObjectRotationTween(endRotation, startRotation);
      },
    });

    return this;
  }

  beforeObjectRotationTween(_endRotation, _startRotation) {
  }

  afterObjectRotationTween(_endRotation, _startRotation) {
  }

  stopRotationTween() {
    if (!this.rotationTween) {
      return;
    }

    this.rotationTween.stop();
    this.rotationTween = null;
  }

  refreshRotatedGeometry(options = {}) {
    if (!options.transient && this.shadow?.isCompositionShadow && this.refreshCompositionShadow) {
      this.refreshCompositionShadow();
    }

    this.setDragLift(this.currentLift);

    return this;
  }

  worldToLocalPoint(point) {
    const local = new Phaser.Math.Vector2();

    this.getWorldTransformMatrix().applyInverse(point.x, point.y, local);

    return local;
  }

  localToWorldPoint(point) {
    const world = new Phaser.Math.Vector2();

    this.getWorldTransformMatrix().transformPoint(point.x, point.y, world);

    return world;
  }

  worldVectorToLocal(vector) {
    if (this.getLocalVectorForWorldOffset) {
      return this.getLocalVectorForWorldOffset(vector.x, vector.y);
    }

    const origin = this.worldToLocalPoint({ x: 0, y: 0 });
    const end = this.worldToLocalPoint(vector);

    return new Phaser.Math.Vector2(end.x - origin.x, end.y - origin.y);
  }

  localVectorToWorld(vector) {
    const origin = this.localToWorldPoint({ x: 0, y: 0 });
    const end = this.localToWorldPoint(vector);

    return new Phaser.Math.Vector2(
      end.x - origin.x,
      end.y - origin.y,
    );
  }

  destroy(fromScene) {
    this.stopRotationRejectBuzz();
    this.stopRotationTween();
    super.destroy(fromScene);
  }
}
