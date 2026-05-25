import { BITMAP_FONT_PIXEL } from '../game/constants.js';
import { UI_DEPTHS } from './constants.js';

const COLORS = {
  shadow: 0x10251e,
  outer: 0x8c5a3d,
  inner: 0xf1d3a4,
  text: 0x5a3427,
};

export class CurrencyDisplay {
  constructor(scene, initialAmount = 0) {
    this.scene = scene;
    this.amount = initialAmount;
    this.paddingX = 8;
    this.paddingY = 5;

    this.container = scene.add.container(0, 0);
    this.container.setDepth(UI_DEPTHS.overlay);

    this.graphics = scene.add.graphics();
    this.container.add(this.graphics);

    this.text = scene.add.bitmapText(0, 0, BITMAP_FONT_PIXEL, '', 8);
    this.text.setOrigin(1, 0.5);
    this.text.setTint(COLORS.text);
    this.container.add(this.text);

    this.setAmount(initialAmount);
  }

  position(visibleArea) {
    const margin = 10;

    this.container.setPosition(
      Math.round(visibleArea.right - margin),
      Math.round(visibleArea.top + margin),
    );
    this.draw();
  }

  setAmount(amount = 0) {
    this.amount = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
    this.text.setText(`YEN ${this.amount.toLocaleString('en-US')}`);
    this.draw();
  }

  draw() {
    const textWidth = Math.ceil(this.text.width || 0);
    const textHeight = Math.ceil(this.text.height || 8);
    const width = textWidth + this.paddingX * 2;
    const height = textHeight + this.paddingY * 2;
    const x = -width;
    const y = 0;

    this.graphics.clear();
    this.graphics.fillStyle(COLORS.shadow, 0.2);
    this.graphics.fillRect(x + 1, y + 2, width, height);
    this.graphics.fillStyle(COLORS.outer, 1);
    this.graphics.fillRect(x, y, width, height);
    this.graphics.fillStyle(COLORS.inner, 1);
    this.graphics.fillRect(x + 2, y + 2, width - 4, height - 4);

    this.text.setPosition(-this.paddingX, Math.round(y + height / 2) + 1);
  }

  destroy() {
    this.container.destroy();
  }
}
