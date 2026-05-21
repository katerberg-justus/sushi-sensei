import * as Phaser from 'phaser/dist/phaser.esm.js';
import { DraggableObject } from './DraggableObject.js';

export class RotatableObject extends DraggableObject {
  constructor(scene, x, y, width, height) {
    super(scene, x, y, width, height);

    this.isRotatable = true;
    this.rotationStep = Phaser.Math.DegToRad(90);
    this.doubleClickInterval = 300;
    this.lastRotateClickTime = -Infinity;

    this.on('pointerdown', this.handleRotatePointerDown, this);
  }

  handleRotatePointerDown(pointer) {
    if (!this.isRotatable) {
      return;
    }

    const clickTime = pointer.downTime ?? this.scene.time.now;

    if (clickTime - this.lastRotateClickTime <= this.doubleClickInterval) {
      this.lastRotateClickTime = -Infinity;
      this.rotateBy(this.rotationStep);
      return;
    }

    this.lastRotateClickTime = clickTime;
  }

  rotateBy(angle) {
    return this.setObjectRotation(this.rotation + angle);
  }

  setObjectRotation(angle) {
    const normalizedAngle = Phaser.Math.Angle.Wrap(angle);

    this.setRotation(normalizedAngle);
    this.refreshRotatedGeometry();

    return this;
  }

  refreshRotatedGeometry() {
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
    const rotation = -(this.rotation ?? 0);
    const sin = Math.sin(rotation);
    const cos = Math.cos(rotation);

    return new Phaser.Math.Vector2(
      vector.x * cos - vector.y * sin,
      vector.x * sin + vector.y * cos,
    );
  }

  localVectorToWorld(vector) {
    const rotation = this.rotation ?? 0;
    const sin = Math.sin(rotation);
    const cos = Math.cos(rotation);

    return new Phaser.Math.Vector2(
      vector.x * cos - vector.y * sin,
      vector.x * sin + vector.y * cos,
    );
  }
}
