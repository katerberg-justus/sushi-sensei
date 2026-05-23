import * as Phaser from 'phaser/dist/phaser.esm.js';
import { RotatableObject } from './RotatableObject.js';

export class CuttingObject extends RotatableObject {
  constructor(scene, x, y, width, height, options = {}) {
    super(scene, x, y, width, height);

    this.canCut = true;
    this.cutTipOffset = new Phaser.Math.Vector2(
      options.cutTipOffset?.x ?? 0,
      options.cutTipOffset?.y ?? -height / 2,
    );
    this.minCutStrokeDistance = 18;
    this.lastCutPoint = null;
    this.cutTraceDuration = 180;
    this.cutTraceLineWidth = 4;
    this.activeCutTraces = new Set();
    this.input.cursor = 'grab';
  }

  handleDragStart(pointer) {
    if (!super.handleDragStart(pointer)) {
      return false;
    }

    this.lastCutPoint = this.getCutPoint();
    return true;
  }

  handleDrag(pointer, dragX, dragY) {
    const wasDragging = this.isDragging;
    const previousCutPoint = wasDragging ? (this.lastCutPoint || this.getCutPoint()) : null;

    if (!super.handleDrag(pointer, dragX, dragY)) {
      return false;
    }

    if (!wasDragging) {
      this.lastCutPoint = this.getCutPoint();
      return true;
    }

    const nextCutPoint = this.getCutPoint();
    const distance = Phaser.Math.Distance.Between(
      previousCutPoint.x,
      previousCutPoint.y,
      nextCutPoint.x,
      nextCutPoint.y,
    );

    if (distance >= this.minCutStrokeDistance) {
      this.emit('cutstroke', {
        cutter: this,
        start: previousCutPoint,
        end: nextCutPoint,
      });
      this.lastCutPoint = nextCutPoint;
    }

    return true;
  }

  handleDragEnd(pointer) {
    const endedDrag = super.handleDragEnd(pointer);
    this.lastCutPoint = null;
    return endedDrag;
  }

  showCutTrace(start, end) {
    const trace = this.scene.add.graphics();

    trace.setDepth(this.depth + 1);
    trace.lineStyle(this.cutTraceLineWidth + 4, 0xffffff, 0.25);
    trace.beginPath();
    trace.moveTo(start.x, start.y);
    trace.lineTo(end.x, end.y);
    trace.strokePath();
    trace.lineStyle(this.cutTraceLineWidth, 0xffffff, 0.95);
    trace.beginPath();
    trace.moveTo(start.x, start.y);
    trace.lineTo(end.x, end.y);
    trace.strokePath();

    this.activeCutTraces.add(trace);

    this.scene.tweens.add({
      targets: trace,
      alpha: 0,
      duration: this.cutTraceDuration,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.activeCutTraces.delete(trace);
        trace.destroy();
      },
    });
  }

  getCutPoint() {
    const localPoint = this.getLocalCutPoint();

    if (this.localToWorldPoint) {
      return this.localToWorldPoint(localPoint);
    }

    return new Phaser.Math.Vector2(this.x + localPoint.x, this.y + localPoint.y);
  }

  getLocalCutPoint() {
    const liftOffset = this.getLocalCutLiftOffset();

    return new Phaser.Math.Vector2(
      this.cutTipOffset.x + liftOffset.x,
      this.cutTipOffset.y + liftOffset.y,
    );
  }

  getLocalCutLiftOffset() {
    const lift = -(this.currentLift ?? 0) + (this.currentImpactSink ?? 0);

    if (this.getLocalVectorForWorldOffset) {
      return this.getLocalVectorForWorldOffset(0, lift);
    }

    return new Phaser.Math.Vector2(0, lift);
  }

  setCutTipOffset(x, y) {
    if (typeof x === 'object') {
      this.cutTipOffset.set(x.x ?? 0, x.y ?? 0);
      return this;
    }

    this.cutTipOffset.set(x, y);

    return this;
  }

  setHoldArea(width, height, offsetX = 0, offsetY = 0) {
    this.setCenteredHitbox(width, height, offsetX, offsetY);

    return this;
  }

  destroy(fromScene) {
    this.activeCutTraces.forEach((trace) => {
      trace.destroy();
    });
    this.activeCutTraces.clear();

    super.destroy(fromScene);
  }
}
