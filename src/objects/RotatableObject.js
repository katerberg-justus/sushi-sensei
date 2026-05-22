import * as Phaser from 'phaser/dist/phaser.esm.js';
import { DraggableObject } from './DraggableObject.js';

export class RotatableObject extends DraggableObject {
  constructor(scene, x, y, width, height) {
    super(scene, x, y, width, height);

    this.isRotatable = true;
    this.rotationStep = Phaser.Math.DegToRad(90);
    this.rotationDuration = 180;
    this.doubleClickInterval = 300;
    this.lastRotateClickTime = -Infinity;
    this.rotationTween = null;
    this.rotationOnlyPointerId = null;

    this.on('pointerdown', this.handleRotatePointerDown, this);
  }

  handleRotatePointerDown(pointer) {
    if (!this.isRotatable) {
      return;
    }

    const clickTime = pointer.downTime ?? this.scene.time.now;

    if (clickTime - this.lastRotateClickTime <= this.doubleClickInterval) {
      this.lastRotateClickTime = -Infinity;
      this.rotationOnlyPointerId = this.getDragPointerId(pointer);
      this.rotateBy(this.rotationStep);
      return;
    }

    this.lastRotateClickTime = clickTime;
    this.rotationOnlyPointerId = null;
  }

  shouldSuppressDragStart(pointer) {
    const pointerId = this.getDragPointerId(pointer);

    if (pointerId === null) {
      return false;
    }

    return pointerId === this.rotationOnlyPointerId
      || pointerId === this.suppressedDragPointerId;
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
