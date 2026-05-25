import { UI_ANIMATION, UI_DEPTHS } from './constants.js';

const ICON_SIZE = 24;
const ICON_GAP = 6;
const ICON_KEYS = {
  grab: 'hover-grab-hand-icon',
  reset: 'hover-reset-arrow-icon',
  flip: 'hover-flip-fish-icon',
};

export class HoverActionIndicator {
  constructor(scene) {
    this.scene = scene;
    this.tween = null;
    this.isShowing = false;
    this.modes = [];

    this.createTextures();

    const grabIcon = scene.add.image(ICON_SIZE / 2, ICON_SIZE / 2, ICON_KEYS.grab);
    const resetIcon = scene.add.image(ICON_SIZE + ICON_GAP + ICON_SIZE / 2, ICON_SIZE / 2, ICON_KEYS.reset);
    const flipIcon = scene.add.image((ICON_SIZE + ICON_GAP) * 2 + ICON_SIZE / 2, ICON_SIZE / 2, ICON_KEYS.flip);

    grabIcon.setOrigin(0.5);
    resetIcon.setOrigin(0.5);
    flipIcon.setOrigin(0.5);
    resetIcon.setVisible(false);
    flipIcon.setVisible(false);

    this.container = scene.add.container(0, 0, [grabIcon, resetIcon, flipIcon]);
    this.container.setDepth(UI_DEPTHS.overlay);
    this.container.setVisible(false);
    this.container.setAlpha(0);

    this.iconSize = ICON_SIZE;
    this.iconGap = ICON_GAP;
    this.width = ICON_SIZE;
    this.height = ICON_SIZE;
    this.icons = { grab: grabIcon, reset: resetIcon, flip: flipIcon };
  }

  position(visibleArea) {
    const margin = 10;
    const restX = Math.round(visibleArea.left + margin);
    const restY = Math.round(visibleArea.bottom - margin - this.height);

    this.container.restX = restX;
    this.container.restY = restY;
    this.container.setX(restX);

    if (!this.container.visible) {
      this.container.setY(restY);
    }
  }

  setModes(modes = []) {
    this.modes = modes;

    if (!modes.length) {
      this.hide();
      return;
    }

    this.width = modes.length * this.iconSize + (modes.length - 1) * this.iconGap;

    Object.values(this.icons).forEach((icon) => icon.setVisible(false));
    modes.forEach((mode, index) => {
      const icon = this.icons[mode];

      if (!icon) {
        return;
      }

      icon.setPosition(
        this.iconSize / 2 + index * (this.iconSize + this.iconGap),
        this.iconSize / 2,
      );
      icon.setVisible(true);
    });

    this.show();
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

  createTextures() {
    this.createGrabHandTexture();
    this.createResetArrowTexture();
    this.createFlipFishTexture();
  }

  createGrabHandTexture() {
    const key = ICON_KEYS.grab;

    if (this.scene.textures.exists(key)) {
      this.scene.textures.remove(key);
    }

    const graphics = this.scene.add.graphics();
    const drawGrabHand = (offsetX, offsetY, color, alpha) => {
      graphics.fillStyle(color, alpha);
      graphics.fillRect(offsetX + 8, offsetY + 1, 3, 12);
      graphics.fillRect(offsetX + 12, offsetY + 2, 3, 12);
      graphics.fillRect(offsetX + 16, offsetY + 5, 3, 10);
      graphics.fillRect(offsetX + 4, offsetY + 7, 3, 10);
      graphics.fillRect(offsetX + 2, offsetY + 12, 5, 4);
      graphics.fillRect(offsetX + 5, offsetY + 13, 16, 7);
      graphics.fillRect(offsetX + 7, offsetY + 20, 12, 3);
      graphics.fillRect(offsetX + 19, offsetY + 11, 3, 7);
    };

    drawGrabHand(1, 1, 0x10251e, 0.24);
    drawGrabHand(0, 0, 0xffffff, 1);

    graphics.generateTexture(key, ICON_SIZE, ICON_SIZE);
    graphics.destroy();
  }

  createResetArrowTexture() {
    const key = ICON_KEYS.reset;

    if (this.scene.textures.exists(key)) {
      this.scene.textures.remove(key);
    }

    const graphics = this.scene.add.graphics();
    const drawResetArrow = (offsetX, offsetY, color, alpha) => {
      graphics.fillStyle(color, alpha);
      graphics.fillRect(offsetX + 10, offsetY + 3, 6, 3);
      graphics.fillRect(offsetX + 15, offsetY + 4, 3, 3);
      graphics.fillRect(offsetX + 17, offsetY + 6, 3, 3);
      graphics.fillRect(offsetX + 19, offsetY + 9, 3, 6);
      graphics.fillRect(offsetX + 17, offsetY + 15, 3, 3);
      graphics.fillRect(offsetX + 15, offsetY + 17, 3, 3);
      graphics.fillRect(offsetX + 8, offsetY + 18, 8, 3);
      graphics.fillRect(offsetX + 5, offsetY + 16, 4, 3);
      graphics.fillRect(offsetX + 3, offsetY + 13, 3, 4);
      graphics.fillRect(offsetX + 3, offsetY + 3, 5, 3);
      graphics.fillRect(offsetX + 3, offsetY + 6, 3, 3);
      graphics.fillRect(offsetX + 3, offsetY + 9, 7, 3);
    };

    drawResetArrow(1, 1, 0x10251e, 0.24);
    drawResetArrow(0, 0, 0xffffff, 1);

    graphics.generateTexture(key, ICON_SIZE, ICON_SIZE);
    graphics.destroy();
  }

  createFlipFishTexture() {
    const key = ICON_KEYS.flip;

    if (this.scene.textures.exists(key)) {
      this.scene.textures.remove(key);
    }

    const graphics = this.scene.add.graphics();
    const drawFlipFish = (offsetX, offsetY, color, alpha) => {
      graphics.fillStyle(color, alpha);
      graphics.fillRect(offsetX + 6, offsetY + 9, 12, 5);
      graphics.fillRect(offsetX + 8, offsetY + 7, 8, 2);
      graphics.fillRect(offsetX + 8, offsetY + 14, 8, 2);
      graphics.fillRect(offsetX + 18, offsetY + 10, 3, 3);
      graphics.fillRect(offsetX + 3, offsetY + 10, 3, 3);
      graphics.fillRect(offsetX + 11, offsetY + 4, 6, 2);
      graphics.fillRect(offsetX + 16, offsetY + 5, 2, 2);
      graphics.fillRect(offsetX + 18, offsetY + 6, 2, 4);
      graphics.fillRect(offsetX + 13, offsetY + 3, 2, 4);
      graphics.fillRect(offsetX + 6, offsetY + 18, 6, 2);
      graphics.fillRect(offsetX + 5, offsetY + 16, 2, 2);
      graphics.fillRect(offsetX + 4, offsetY + 14, 2, 3);
      graphics.fillRect(offsetX + 10, offsetY + 17, 2, 4);
    };

    drawFlipFish(1, 1, 0x10251e, 0.24);
    drawFlipFish(0, 0, 0xffffff, 1);

    graphics.generateTexture(key, ICON_SIZE, ICON_SIZE);
    graphics.destroy();
  }
}
