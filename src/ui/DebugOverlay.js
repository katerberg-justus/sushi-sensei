import { BITMAP_FONT_PIXEL } from '../game/constants.js';
import { UI_DEPTHS } from './constants.js';

export class DebugOverlay {
  constructor(scene) {
    this.scene = scene;
    this.nextFpsUpdateAt = 0;

    this.dragDebugText = scene.add.bitmapText(0, 0, BITMAP_FONT_PIXEL, 'DRAG DEBUG\nidle', 8);
    this.dragDebugText.setOrigin(0, 0);
    this.dragDebugText.setTint(0x173027);
    this.dragDebugText.setDepth(UI_DEPTHS.overlay);

    this.fpsCounter = scene.add.bitmapText(0, 0, BITMAP_FONT_PIXEL, '-- FPS', 8);
    this.fpsCounter.setOrigin(1, 0);
    this.fpsCounter.setTint(0xf8f4ef);
    this.fpsCounter.setDepth(UI_DEPTHS.overlay);

    this.frameDeltaCounter = scene.add.bitmapText(0, 0, BITMAP_FONT_PIXEL, '--.- MS', 8);
    this.frameDeltaCounter.setOrigin(1, 0);
    this.frameDeltaCounter.setTint(0xf8f4ef);
    this.frameDeltaCounter.setDepth(UI_DEPTHS.overlay);
  }

  position(visibleArea) {
    const margin = 10;
    const rightX = Math.round(visibleArea.right - margin);
    const topY = Math.round(visibleArea.top + margin);

    this.dragDebugText.setPosition(
      Math.round(visibleArea.left + margin),
      topY,
    );
    this.fpsCounter.setPosition(rightX, topY);
    this.frameDeltaCounter.setPosition(rightX, topY + 12);
  }

  update(time) {
    if (time < this.nextFpsUpdateAt) {
      return;
    }

    const fps = Math.round(this.scene.game.loop.actualFps || 0);
    const rawDelta = this.scene.game.loop.rawDelta || 0;

    this.fpsCounter.setText(`${fps} FPS`);
    this.frameDeltaCounter.setText(`${rawDelta.toFixed(1)} MS`);
    this.nextFpsUpdateAt = time + 250;
  }

  setDragInfo(lines = []) {
    this.dragDebugText.setText(['DRAG DEBUG', ...lines].slice(0, 8).join('\n'));
  }

  destroy() {
    this.dragDebugText.destroy();
    this.fpsCounter.destroy();
    this.frameDeltaCounter.destroy();
  }
}

