import * as Phaser from 'phaser/dist/phaser.esm.js';
import { COLORS, SCENE_KEYS } from '../game/constants.js';
import { CuttableSalmon } from '../objects/CuttableSalmon.js';
import { CuttableTamago } from '../objects/CuttableTamago.js';
import { Knife } from '../objects/Knife.js';
import { RiceBall } from '../objects/RiceBall.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.game);
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor(COLORS.boardSideB);
    this.createPixelBoardTexture();

    const board = this.add.image(0, 0, 'pixel-cutting-board').setOrigin(0);
    board.setDisplaySize(width, height);

    this.riceBall = new RiceBall(this, width * 0.34, height * 0.48);
    this.cuttableSalmon = new CuttableSalmon(this, width * 0.51, height * 0.47);
    this.cuttableTamago = new CuttableTamago(this, width * 0.67, height * 0.48);
    this.cuttableObjects = [this.cuttableSalmon, this.cuttableTamago];
    this.knife = new Knife(this, width * 0.5, height * 0.72);
    this.knife.on('cutstroke', this.handleCutStroke, this);
  }

  handleCutStroke(stroke) {
    [...this.cuttableObjects].forEach((object) => {
      const index = this.cuttableObjects.indexOf(object);

      if (index === -1) {
        return;
      }

      const replacements = object.tryCutWith(stroke.cutter, stroke.start, stroke.end);

      if (!replacements) {
        return;
      }

      this.cuttableObjects.splice(index, 1, ...replacements);
      object.destroy();
    });
  }

  createPixelBoardTexture() {
    if (this.textures.exists('pixel-cutting-board')) {
      this.textures.remove('pixel-cutting-board');
    }

    const textureWidth = 320;
    const textureHeight = 180;
    const pixel = 4;
    const boardDepth = 154;
    const graphics = this.add.graphics();

    graphics.fillStyle(COLORS.boardSideB, 1);
    graphics.fillRect(0, 0, textureWidth, textureHeight);

    const topLeft = new Phaser.Math.Vector2(28, 6);
    const topRight = new Phaser.Math.Vector2(292, 6);
    const frontRight = new Phaser.Math.Vector2(338, boardDepth);
    const frontLeft = new Phaser.Math.Vector2(-18, boardDepth);
    const sideDrop = new Phaser.Math.Vector2(0, textureHeight - boardDepth);
    const sideBands = [
      { offset: 0, color: 0xe6bd82 },
      { offset: 8, color: 0xe1b577 },
      { offset: 16, color: 0xdcaf70 },
    ];

    sideBands.forEach((band, index) => {
      const nextOffset = sideBands[index + 1]?.offset ?? sideDrop.y;
      this.fillPixelQuad(
        graphics,
        frontLeft.clone().add(new Phaser.Math.Vector2(0, band.offset)),
        frontRight.clone().add(new Phaser.Math.Vector2(0, band.offset)),
        frontRight.clone().add(new Phaser.Math.Vector2(0, nextOffset)),
        frontLeft.clone().add(new Phaser.Math.Vector2(0, nextOffset)),
        band.color,
      );
    });

    const topPalette = [0xecc690, 0xe8bf86, 0xe5b87d];

    for (let y = 0; y < boardDepth; y += pixel) {
      for (let x = 0; x < 356; x += pixel) {
        const u0 = x / 356;
        const v0 = y / boardDepth;
        const u1 = Math.min((x + pixel) / 356, 1);
        const v1 = Math.min((y + pixel) / boardDepth, 1);
        const plank = Math.floor(x / 56);
        const grainBand = Math.floor(y / (pixel * 4));
        const color = topPalette[(grainBand + plank) % topPalette.length];

        this.fillPixelQuad(
          graphics,
          this.pointOnBoard(topLeft, topRight, frontRight, frontLeft, u0, v0),
          this.pointOnBoard(topLeft, topRight, frontRight, frontLeft, u1, v0),
          this.pointOnBoard(topLeft, topRight, frontRight, frontLeft, u1, v1),
          this.pointOnBoard(topLeft, topRight, frontRight, frontLeft, u0, v1),
          color,
        );
      }
    }

    for (let i = 0; i < 14; i += 1) {
      const y = 18 + i * 9;
      const startU = (i % 5) * 0.05;
      const endU = 0.2 + (i % 4) * 0.07;
      const a = this.pointOnBoard(topLeft, topRight, frontRight, frontLeft, startU, y / boardDepth);
      const b = this.pointOnBoard(topLeft, topRight, frontRight, frontLeft, Math.min(startU + endU, 0.98), y / boardDepth);
      graphics.fillStyle(i % 2 === 0 ? COLORS.boardTopC : COLORS.boardTopD, 0.2);
      graphics.fillRect(a.x, a.y, Math.max(pixel, b.x - a.x), pixel);
    }

    this.fillPixelQuad(
      graphics,
      frontLeft,
      frontRight,
      frontRight.clone().add(new Phaser.Math.Vector2(0, pixel * 2)),
      frontLeft.clone().add(new Phaser.Math.Vector2(0, pixel * 2)),
      0xeac48b,
    );

    graphics.generateTexture('pixel-cutting-board', textureWidth, textureHeight);
    graphics.destroy();
  }

  pointOnBoard(topLeft, topRight, bottomRight, bottomLeft, u, v) {
    const top = this.lerpPoint(topLeft, topRight, u);
    const bottom = this.lerpPoint(bottomLeft, bottomRight, u);

    return this.lerpPoint(top, bottom, v);
  }

  lerpPoint(a, b, t) {
    return new Phaser.Math.Vector2(
      Phaser.Math.Linear(a.x, b.x, t),
      Phaser.Math.Linear(a.y, b.y, t),
    );
  }

  fillPixelQuad(graphics, a, b, c, d, color) {
    graphics.fillStyle(color, 1);
    graphics.fillPoints([a, b, c, d], true);
  }
}
