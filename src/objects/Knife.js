import * as Phaser from 'phaser/dist/phaser.esm.js';
import { CuttingObject } from './CuttingObject.js';

const MANUAL_CUT_STROKE_DISTANCE = 120;
const MANUAL_CUT_STROKE_DURATION = 88;

export class Knife extends CuttingObject {
  static TEXTURE_KEY = 'knife-pixel';
  static SHADOW_TEXTURE_KEY = 'knife-shadow-pixel';
  static PIXEL_SCALE = 2.5;
  static BLADE_ROTATION = Phaser.Math.DegToRad(90);
  static TIP_LOCAL_X = -7.5;
  static TIP_LOCAL_Y = -75;
  static HANDLE_HOLD_WIDTH = 26;
  static HANDLE_HOLD_HEIGHT = 48;
  static HANDLE_HOLD_OFFSET_Y = 56;
  static BODY_WIDTH = 46;
  static BODY_HEIGHT = 160;

  constructor(scene, x, y, options = {}) {
    const Cls = new.target ?? Knife;
    Cls.createTexture(scene);

    super(scene, x, y, Cls.BODY_WIDTH, Cls.BODY_HEIGHT, {
      ...options,
      hasQuality: options.hasQuality ?? true,
    });

    const PIXEL = Cls.PIXEL_SCALE;

    this.isTool = true;
    this.restDepth = 35;
    this.dragDepth = 120;
    this.softness = 0.05;
    this.dragLift = 6;
    this.restShadowOffset = 8;
    this.dragShadowOffset = 15;
    this.manualCutStrokeOffset = 0;
    this.manualCutStrokeTween = null;

    const shadowEdge = scene.add.image(0, 0, Cls.SHADOW_TEXTURE_KEY);
    shadowEdge.setScale(PIXEL * this.shadowEdgeScaleX, PIXEL * this.shadowEdgeScaleY);
    shadowEdge.setOrigin(0.5);
    shadowEdge.setRotation(Cls.BLADE_ROTATION);
    shadowEdge.setTint(0x9a8064);

    const shadowCore = scene.add.image(0, 0, Cls.SHADOW_TEXTURE_KEY);
    shadowCore.setScale(PIXEL * this.shadowCoreScaleX, PIXEL * this.shadowCoreScaleY);
    shadowCore.setOrigin(0.5);
    shadowCore.setRotation(Cls.BLADE_ROTATION);
    shadowCore.setTint(0x6f5d48);

    const shadow = scene.add.container(0, this.restShadowOffset, [shadowEdge, shadowCore]);
    shadow.setPixelBlurProgress = (progress) => {
      shadowEdge.setAlpha(Phaser.Math.Linear(0, this.shadowEdgeAlpha, progress));
      shadowCore.setAlpha(Phaser.Math.Linear(0, this.shadowCoreAlpha, progress));
      shadowEdge.setScale(
        Phaser.Math.Linear(PIXEL * this.shadowEdgeScaleX, PIXEL * this.shadowEdgeDragScaleX, progress),
        Phaser.Math.Linear(PIXEL * this.shadowEdgeScaleY, PIXEL * this.shadowEdgeDragScaleY, progress),
      );
    };
    shadow.setPixelBlurProgress(0);
    this.setPixelShadow(shadow);

    this.sprite = scene.add.image(0, 0, Cls.TEXTURE_KEY);
    this.sprite.setScale(PIXEL);
    this.sprite.setOrigin(0.5);
    this.sprite.setRotation(Cls.BLADE_ROTATION);
    this.addDraggablePart(this.sprite);
    this.setCutTipOffset(Cls.TIP_LOCAL_X, Cls.TIP_LOCAL_Y);
    this.setHoldArea(Cls.HANDLE_HOLD_WIDTH, Cls.HANDLE_HOLD_HEIGHT, 0, Cls.HANDLE_HOLD_OFFSET_Y);
    this.applyRestingDepth();

    this.manualCutPointerDownHandler = (pointer) => {
      this.handleManualCutPointerDown(pointer);
    };
    this.manualCutSpaceHandler = (event) => {
      this.handleManualCutSpace(event);
    };
    scene.input.on('pointerdown', this.manualCutPointerDownHandler);
    scene.input.keyboard?.on('keydown-SPACE', this.manualCutSpaceHandler);
  }

  canCutOrientation(orientation, target) {
    const bladeWorldVector = this.getBladeWorldVector();
    const bladeTargetVector = target?.worldVectorToLocal
      ? target.worldVectorToLocal(bladeWorldVector)
      : bladeWorldVector;
    const bladeOrientation = Math.abs(bladeTargetVector.x) >= Math.abs(bladeTargetVector.y)
      ? 'horizontal'
      : 'vertical';

    return orientation === bladeOrientation;
  }

  getBladeWorldVector() {
    const bladeLocalRotation = this.sprite?.rotation ?? this.constructor.BLADE_ROTATION;

    return this.localVectorToWorld(new Phaser.Math.Vector2(
      Math.cos(bladeLocalRotation),
      Math.sin(bladeLocalRotation),
    ));
  }

  getBladeLocalVector() {
    const bladeLocalRotation = this.sprite?.rotation ?? this.constructor.BLADE_ROTATION;

    return new Phaser.Math.Vector2(
      Math.cos(bladeLocalRotation),
      Math.sin(bladeLocalRotation),
    ).normalize();
  }

  handleManualCutPointerDown(pointer) {
    if (!this.isDragging || !this.isTwoFingerTouchPointer(pointer)) {
      return;
    }

    pointer.event?.preventDefault?.();
    this.triggerManualCutStroke();
  }

  handleManualCutSpace(event) {
    if (event?.repeat) {
      return;
    }

    if (this.triggerManualCutStroke()) {
      event?.preventDefault?.();
    }
  }

  triggerManualCutStroke() {
    if (!this.isDragging || this.manualCutStrokeTween || !this.scene) {
      return false;
    }

    const stroke = this.getManualCutStroke();

    if (!stroke) {
      return false;
    }

    this.playManualCutStrokeAnimation();
    this.emit('cutstroke', {
      cutter: this,
      start: stroke.start,
      end: stroke.end,
    });

    return true;
  }

  getManualCutStroke() {
    const direction = this.getBladeWorldVector();
    const length = direction.length();

    if (!Number.isFinite(length) || length <= 0) {
      return null;
    }

    direction.scale(1 / length);

    const center = this.getCutPoint();
    const halfDistance = MANUAL_CUT_STROKE_DISTANCE / 2;

    return {
      start: new Phaser.Math.Vector2(
        center.x - direction.x * halfDistance,
        center.y - direction.y * halfDistance,
      ),
      end: new Phaser.Math.Vector2(
        center.x + direction.x * halfDistance,
        center.y + direction.y * halfDistance,
      ),
    };
  }

  playManualCutStrokeAnimation() {
    this.stopManualCutStrokeAnimation();

    this.manualCutStrokeOffset = -MANUAL_CUT_STROKE_DISTANCE / 2;
    this.applyManualCutStrokeOffset();

    this.manualCutStrokeTween = this.scene.tweens.add({
      targets: this,
      manualCutStrokeOffset: MANUAL_CUT_STROKE_DISTANCE / 2,
      duration: MANUAL_CUT_STROKE_DURATION,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        this.applyManualCutStrokeOffset();
      },
      onComplete: () => {
        this.manualCutStrokeTween = null;
        this.manualCutStrokeOffset = 0;
        this.applyManualCutStrokeOffset();
      },
      onStop: () => {
        this.manualCutStrokeTween = null;
      },
    });
  }

  stopManualCutStrokeAnimation() {
    if (!this.manualCutStrokeTween) {
      return;
    }

    this.manualCutStrokeTween.stop();
    this.manualCutStrokeTween = null;
    this.manualCutStrokeOffset = 0;
    this.applyManualCutStrokeOffset();
  }

  applyManualCutStrokeOffset() {
    if (!this.sprite) {
      return;
    }

    const basePosition = this.draggablePartBasePositions.get(this.sprite) || { x: 0, y: 0 };
    const liftOffset = this.getLocalVectorForWorldOffset(
      0,
      -(this.currentLift ?? 0) + (this.currentImpactSink ?? 0),
    );
    const bladeOffset = this.getBladeLocalVector().scale(this.manualCutStrokeOffset);

    this.sprite.setPosition(
      basePosition.x + liftOffset.x + bladeOffset.x,
      basePosition.y + liftOffset.y + bladeOffset.y,
    );
  }

  setDragLift(lift) {
    super.setDragLift(lift);
    this.applyManualCutStrokeOffset();
  }

  isTouchPointer(pointer) {
    return pointer?.event?.pointerType === 'touch'
      || pointer?.pointerType === 'touch'
      || pointer?.wasTouch === true;
  }

  isTwoFingerTouchPointer(pointer) {
    if (!this.isTouchPointer(pointer)) {
      return false;
    }

    return pointer.event?.isPrimary === false || this.getActiveTouchPointers().length >= 2;
  }

  getActiveTouchPointers() {
    const managerPointers = this.scene?.input?.manager?.pointers;
    const pluginPointers = this.scene?.input?.pointers;
    const pointers = Array.isArray(managerPointers)
      ? managerPointers
      : pluginPointers;

    if (!Array.isArray(pointers)) {
      return [];
    }

    return pointers.filter((pointer) => pointer?.isDown && this.isTouchPointer(pointer));
  }

  destroy(fromScene) {
    this.scene?.input?.off('pointerdown', this.manualCutPointerDownHandler);
    this.scene?.input?.keyboard?.off('keydown-SPACE', this.manualCutSpaceHandler);
    this.stopManualCutStrokeAnimation();
    super.destroy(fromScene);
  }

  static createTexture(scene) {
    if (!scene.textures.exists(this.TEXTURE_KEY)) {
      this.createBladeTexture(scene);
    }

    if (!scene.textures.exists(this.SHADOW_TEXTURE_KEY)) {
      this.createShadowTexture(scene);
    }
  }

  static createBladeTexture(scene) {
    const width = 64;
    const height = 18;
    const texture = scene.textures.createCanvas(this.TEXTURE_KEY, width, height);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);

    context.fillStyle = '#6a3f2a';
    context.fillRect(42, 8, 18, 5);
    context.fillStyle = '#784a32';
    context.fillRect(43, 9, 16, 3);
    context.fillStyle = '#8b5538';
    context.fillRect(45, 6, 14, 3);
    context.fillStyle = '#a06b48';
    context.fillRect(47, 7, 5, 1);
    context.fillRect(54, 7, 4, 1);
    context.fillStyle = '#4b2e22';
    context.fillRect(44, 12, 16, 2);
    context.fillRect(58, 9, 4, 3);
    context.fillStyle = '#3a2419';
    context.fillRect(61, 8, 1, 5);

    context.fillStyle = '#5a6266';
    context.fillRect(40, 5, 2, 10);
    context.fillStyle = '#8fa2a8';
    context.fillRect(41, 6, 1, 8);

    context.fillStyle = '#a8b6bb';
    context.fillRect(9, 7, 33, 1);
    context.fillRect(7, 8, 35, 2);
    context.fillRect(5, 10, 37, 2);
    context.fillStyle = '#cbd4d7';
    context.fillRect(12, 6, 30, 1);
    context.fillRect(9, 7, 33, 2);
    context.fillRect(7, 9, 35, 3);
    context.fillStyle = '#edf3f4';
    context.fillRect(4, 11, 36, 1);
    context.fillRect(2, 12, 38, 1);
    context.fillRect(5, 13, 35, 2);
    context.fillStyle = '#8fa2a8';
    context.fillRect(14, 4, 27, 1);
    context.fillRect(11, 5, 30, 1);
    context.fillStyle = '#7a8a90';
    context.fillRect(7, 14, 32, 1);

    context.fillStyle = '#ffffff';
    context.fillRect(14, 9, 5, 1);
    context.fillRect(24, 8, 4, 1);
    context.fillRect(32, 10, 3, 1);
    context.fillRect(19, 13, 6, 1);
    context.fillRect(30, 13, 4, 1);

    context.fillStyle = '#f8fbfb';
    context.fillRect(2, 12, 6, 1);
    context.fillRect(4, 11, 5, 1);

    texture.refresh();
  }

  static createShadowTexture(scene) {
    const width = 64;
    const height = 18;
    const texture = scene.textures.createCanvas(this.SHADOW_TEXTURE_KEY, width, height);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#ffffff';
    context.fillRect(12, 5, 36, 2);
    context.fillRect(7, 7, 48, 2);
    context.fillRect(4, 9, 56, 4);
    context.fillRect(8, 13, 46, 2);
    context.fillRect(16, 15, 28, 1);

    texture.refresh();
  }
}
