import * as Phaser from 'phaser/dist/phaser.esm.js';
import { DraggableObject } from './DraggableObject.js';

export class RotatableObject extends DraggableObject {
  constructor(scene, x, y, width, height) {
    super(scene, x, y, width, height);

    this.isRotatable = true;
    this.rotationStep = Phaser.Math.DegToRad(90);
    this.rotationDuration = 180;
    this.doubleClickInterval = 300;
    this.rotateClickDragTolerance = 6;
    this.lastRotateClickTime = -Infinity;
    this.rotationTween = null;
    this.rotationOnlyPointerId = null;
    this.pendingRotateClickDragPointerId = null;

    this.on('pointerdown', this.handleRotatePointerDown, this);
  }

  handleRotatePointerDown(pointer) {
    if (!this.isRotatable || !this.isRotatePointer(pointer)) {
      return;
    }

    const clickTime = pointer.downTime ?? this.scene.time.now;

    if (clickTime - this.lastRotateClickTime <= this.doubleClickInterval) {
      this.lastRotateClickTime = -Infinity;
      this.rotationOnlyPointerId = this.getDragPointerId(pointer);
      this.pendingRotateClickDragPointerId = null;
      this.rotateBy(this.rotationStep);
      return;
    }

    this.lastRotateClickTime = clickTime;
    this.rotationOnlyPointerId = null;
  }

  isRotatePointer(pointer) {
    return !(
      pointer?.rightButtonDown?.()
      || pointer?.middleButtonDown?.()
      || pointer?.button === 1
      || pointer?.button === 2
      || pointer?.event?.button === 1
      || pointer?.event?.button === 2
    );
  }

  shouldSuppressDragStart(pointer) {
    const pointerId = this.getDragPointerId(pointer);

    if (pointerId === null) {
      return false;
    }

    return pointerId === this.rotationOnlyPointerId
      || pointerId === this.suppressedDragPointerId;
  }

  handleDragStart(pointer) {
    if (this.shouldDeferRotateClickDrag(pointer)) {
      this.pendingRotateClickDragPointerId = this.getDragPointerId(pointer);
      this.suppressedDragPointerId = this.pendingRotateClickDragPointerId;
      this.isDragging = false;
      return false;
    }

    this.pendingRotateClickDragPointerId = null;
    return super.handleDragStart(pointer);
  }

  handleDrag(pointer, dragX, dragY) {
    if (this.isPendingRotateClickDrag(pointer)) {
      if (!this.hasMovedBeyondRotateClickTolerance(pointer)) {
        return false;
      }

      this.pendingRotateClickDragPointerId = null;
      this.suppressedDragPointerId = null;

      if (!super.handleDragStart(pointer)) {
        return false;
      }
    }

    return super.handleDrag(pointer, dragX, dragY);
  }

  handleDragEnd(pointer) {
    if (this.isPendingRotateClickDrag(pointer)) {
      this.pendingRotateClickDragPointerId = null;
      this.suppressedDragPointerId = null;
      return false;
    }

    return super.handleDragEnd(pointer);
  }

  shouldDeferRotateClickDrag(pointer) {
    if (
      !this.isRotatable
      || !this.isRotatePointer(pointer)
      || this.shouldSuppressDragStart(pointer)
    ) {
      return false;
    }

    return !this.hasMovedBeyondRotateClickTolerance(pointer);
  }

  isPendingRotateClickDrag(pointer) {
    const pointerId = this.getDragPointerId(pointer);

    return pointerId !== null
      && pointerId === this.pendingRotateClickDragPointerId;
  }

  hasMovedBeyondRotateClickTolerance(pointer) {
    return this.getPointerDownDistance(pointer) > this.rotateClickDragTolerance;
  }

  getPointerDownDistance(pointer) {
    const downX = pointer?.downX ?? pointer?.x;
    const downY = pointer?.downY ?? pointer?.y;
    const x = pointer?.x;
    const y = pointer?.y;

    if (![downX, downY, x, y].every(Number.isFinite)) {
      return 0;
    }

    return Phaser.Math.Distance.Between(downX, downY, x, y);
  }

  rotateBy(angle) {
    return this.tweenObjectRotation((this.rotation ?? 0) + angle);
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
    this.stopRotationTween();
    super.destroy(fromScene);
  }
}
