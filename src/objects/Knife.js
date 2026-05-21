import * as Phaser from 'phaser/dist/phaser.esm.js';
import { CuttingObject } from './CuttingObject.js';

const KNIFE_KEY = 'knife-pixel';
const KNIFE_SHADOW_KEY = 'knife-shadow-pixel';
const PIXEL = 2.5;
const KNIFE_ROTATION = Phaser.Math.DegToRad(90);
const KNIFE_TIP_LOCAL_X = -7.5;
const KNIFE_TIP_LOCAL_Y = -75;
const BLADE_HOLD_WIDTH = 38;
const BLADE_HOLD_HEIGHT = 112;
const BLADE_HOLD_OFFSET_Y = -24;

export class Knife extends CuttingObject {
  constructor(scene, x, y) {
    Knife.createTexture(scene);

    super(scene, x, y, 46, 160);

    this.restDepth = 35;
    this.dragDepth = 120;
    this.softness = 0.05;
    this.dragLift = 6;
    this.restShadowOffset = 8;
    this.dragShadowOffset = 15;

    const shadowEdge = scene.add.image(0, 0, KNIFE_SHADOW_KEY);
    shadowEdge.setScale(PIXEL * this.shadowEdgeScaleX, PIXEL * this.shadowEdgeScaleY);
    shadowEdge.setOrigin(0.5);
    shadowEdge.setRotation(KNIFE_ROTATION);
    shadowEdge.setTint(0x9a8064);

    const shadowCore = scene.add.image(0, 0, KNIFE_SHADOW_KEY);
    shadowCore.setScale(PIXEL * this.shadowCoreScaleX, PIXEL * this.shadowCoreScaleY);
    shadowCore.setOrigin(0.5);
    shadowCore.setRotation(KNIFE_ROTATION);
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

    this.sprite = scene.add.image(0, 0, KNIFE_KEY);
    this.sprite.setScale(PIXEL);
    this.sprite.setOrigin(0.5);
    this.sprite.setRotation(KNIFE_ROTATION);
    this.addDraggablePart(this.sprite);
    this.setCutTipOffset(KNIFE_TIP_LOCAL_X, KNIFE_TIP_LOCAL_Y);
    this.setBladeHoldArea(BLADE_HOLD_WIDTH, BLADE_HOLD_HEIGHT, 0, BLADE_HOLD_OFFSET_Y);
    this.setDepth(this.restDepth);
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
    const bladeLocalRotation = this.sprite?.rotation ?? KNIFE_ROTATION;

    return this.localVectorToWorld(new Phaser.Math.Vector2(
      Math.cos(bladeLocalRotation),
      Math.sin(bladeLocalRotation),
    ));
  }

  static createTexture(scene) {
    if (!scene.textures.exists(KNIFE_KEY)) {
      Knife.createKnifeTexture(scene);
    }

    if (!scene.textures.exists(KNIFE_SHADOW_KEY)) {
      Knife.createShadowTexture(scene);
    }
  }

  static createKnifeTexture(scene) {
    const width = 64;
    const height = 18;
    const texture = scene.textures.createCanvas(KNIFE_KEY, width, height);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);

    context.fillStyle = '#6a3f2a';
    context.fillRect(42, 8, 18, 5);
    context.fillStyle = '#8b5538';
    context.fillRect(45, 6, 14, 3);
    context.fillStyle = '#4b2e22';
    context.fillRect(58, 9, 4, 3);

    context.fillStyle = '#cbd4d7';
    context.fillRect(8, 6, 36, 6);
    context.fillStyle = '#edf3f4';
    context.fillRect(5, 12, 35, 3);
    context.fillStyle = '#8fa2a8';
    context.fillRect(10, 4, 31, 2);
    context.fillStyle = '#f8fbfb';
    context.fillRect(2, 11, 6, 2);

    texture.refresh();
  }

  static createShadowTexture(scene) {
    const width = 64;
    const height = 18;
    const texture = scene.textures.createCanvas(KNIFE_SHADOW_KEY, width, height);
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
