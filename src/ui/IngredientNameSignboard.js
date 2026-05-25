import { BITMAP_FONT_PIXEL } from '../game/constants.js';
import { UI_ANIMATION, UI_DEPTHS } from './constants.js';

export class IngredientNameSignboard {
  constructor(scene) {
    this.scene = scene;
    this.height = 8;
    this.tween = null;
    this.isShowing = false;

    this.container = scene.add.container(0, 0);
    this.container.setDepth(UI_DEPTHS.signboard);
    this.container.setVisible(false);

    this.shadowText = scene.add.bitmapText(1, 1, BITMAP_FONT_PIXEL, '', this.height);
    this.shadowText.setOrigin(1, 0.5);
    this.shadowText.setTint(0x10251e);
    this.shadowText.setAlpha(0.24);
    this.container.add(this.shadowText);

    this.text = scene.add.bitmapText(0, 0, BITMAP_FONT_PIXEL, '', this.height);
    this.text.setOrigin(1, 0.5);
    this.text.setTint(0xffffff);
    this.container.add(this.text);
  }

  position(visibleArea) {
    const margin = 12;
    const restX = Math.round(visibleArea.right - margin);
    const restY = Math.round(visibleArea.bottom - margin - this.height / 2);

    this.container.restX = restX;
    this.container.restY = restY;
    this.container.setX(restX);

    if (!this.container.visible) {
      this.container.setY(restY);
    }
  }

  setText(value) {
    this.shadowText.setText(value);
    this.text.setText(value);
  }

  show() {
    if (this.isShowing) {
      return;
    }

    this.stopTween();

    const restY = this.container.restY ?? this.container.y;

    this.isShowing = true;
    this.container.setVisible(true);
    this.container.setAlpha(0);
    this.container.setY(restY + UI_ANIMATION.slideOffset);

    this.tween = this.scene.tweens.add({
      targets: this.container,
      y: restY,
      alpha: 1,
      duration: UI_ANIMATION.showDuration,
      ease: 'Cubic.Out',
    });
  }

  hide() {
    if (!this.isShowing) {
      return;
    }

    this.stopTween();

    const restY = this.container.restY ?? this.container.y;

    this.isShowing = false;

    this.tween = this.scene.tweens.add({
      targets: this.container,
      y: restY + UI_ANIMATION.slideOffset,
      alpha: 0,
      duration: UI_ANIMATION.hideDuration,
      ease: 'Cubic.In',
      onComplete: () => {
        this.container.setVisible(false);
        this.container.setY(restY);
      },
    });
  }

  stopTween() {
    if (this.tween) {
      this.tween.stop();
      this.tween = null;
    }
  }

  destroy() {
    this.stopTween();
    this.container.destroy();
  }
}
