import { BITMAP_FONT_PIXEL } from '../game/constants.js';
import { UI_DEPTHS } from './constants.js';

export class DebugOverlay {
  constructor(scene) {
    this.scene = scene;
    this.nextFpsUpdateAt = 0;
    this.fps = 0;
    this.rawDelta = 0;
    this.dragLines = ['idle'];

    this.debugText = scene.add.bitmapText(0, 0, BITMAP_FONT_PIXEL, '', 8);
    this.debugText.setOrigin(0, 0);
    this.debugText.setTint(0x173027);
    this.debugText.setDepth(UI_DEPTHS.overlay);
    this.refreshText();
  }

  position(visibleArea) {
    const margin = 10;
    const topY = Math.round(visibleArea.top + margin);

    this.debugText.setPosition(
      Math.round(visibleArea.left + margin),
      topY,
    );
  }

  update(time) {
    if (time < this.nextFpsUpdateAt) {
      return;
    }

    const fps = Math.round(this.scene.game.loop.actualFps || 0);
    const rawDelta = this.scene.game.loop.rawDelta || 0;

    this.fps = fps;
    this.rawDelta = rawDelta;
    this.refreshText();
    this.nextFpsUpdateAt = time + 250;
  }

  setDragInfo(lines = []) {
    this.dragLines = lines.length ? lines : ['idle'];
    this.refreshText();
  }

  refreshText() {
    this.debugText.setText([
      'DEBUG',
      `${this.fps || '--'} FPS`,
      `${this.rawDelta ? this.rawDelta.toFixed(1) : '--.-'} MS`,
      'DRAG DEBUG',
      ...this.dragLines,
    ].slice(0, 10).join('\n'));
  }

  destroy() {
    this.debugText.destroy();
  }
}
