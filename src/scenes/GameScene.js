import * as Phaser from 'phaser/dist/phaser.esm.js';
import { BITMAP_FONT_PIXEL, COLORS, SCENE_KEYS } from '../game/constants.js';
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

    this.input.mouse?.disableContextMenu();
    this.cameras.main.setBackgroundColor(COLORS.boardSideB);
    this.createPixelBoardTexture();

    const board = this.add.image(0, 0, 'pixel-cutting-board').setOrigin(0);
    board.setDisplaySize(width, height);

    this.riceBall = new RiceBall(this, width * 0.34, height * 0.48);
    this.riceBall.displayName = 'Rice Ball';
    this.cuttableSalmon = new CuttableSalmon(this, width * 0.51, height * 0.47);
    this.cuttableSalmon.displayName = 'Salmon';
    this.cuttableTamago = new CuttableTamago(this, width * 0.67, height * 0.48);
    this.cuttableTamago.displayName = 'Tamago';
    this.cuttableObjects = [this.cuttableSalmon, this.cuttableTamago];
    this.knife = new Knife(this, width * 0.5, height * 0.72);
    this.knife.displayName = 'Knife';
    this.knife.on('cutstroke', this.handleCutStroke, this);

    this.createNameSignboard();
    this.positionNameSignboard();
    this.createFpsCounter();
    this.positionFpsCounter();
    this.scale.on('resize', this.positionNameSignboard, this);
    this.scale.on('resize', this.positionFpsCounter, this);
    this.input.keyboard.on('keydown-R', this.resetScene, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.positionNameSignboard, this);
      this.scale.off('resize', this.positionFpsCounter, this);
      this.input.keyboard.off('keydown-R', this.resetScene, this);
    });
    this.input.on('gameobjectover', this.handleObjectOver, this);
    this.input.on('gameobjectout', this.handleObjectOut, this);
  }

  update(time) {
    if (!this.fpsCounter || time < this.nextFpsUpdateAt) {
      return;
    }

    const fps = Math.round(this.game.loop.actualFps || 0);
    const rawDelta = this.game.loop.rawDelta || 0;

    this.fpsCounter.setText(`${fps} FPS`);
    this.frameDeltaCounter.setText(`${rawDelta.toFixed(1)} MS`);
    this.nextFpsUpdateAt = time + 250;
  }

  resetScene() {
    this.scene.restart();
  }

  getVisibleGameArea() {
    const sm = this.scale;
    const gameWidth = sm.gameSize.width;
    const gameHeight = sm.gameSize.height;
    const parentWidth = sm.parentSize?.width || gameWidth;
    const parentHeight = sm.parentSize?.height || gameHeight;
    const zoom = Math.max(parentWidth / gameWidth, parentHeight / gameHeight) || 1;
    const visibleWidth = Math.min(gameWidth, parentWidth / zoom);
    const visibleHeight = Math.min(gameHeight, parentHeight / zoom);

    return {
      left: (gameWidth - visibleWidth) / 2,
      top: (gameHeight - visibleHeight) / 2,
      right: (gameWidth + visibleWidth) / 2,
      bottom: (gameHeight + visibleHeight) / 2,
      width: visibleWidth,
      height: visibleHeight,
    };
  }

  positionNameSignboard() {
    if (!this.nameSignboard) {
      return;
    }

    const visibleArea = this.getVisibleGameArea();
    const margin = 12;

    const restX = Math.round(visibleArea.left + margin);
    const restY = Math.round(visibleArea.bottom - margin - this.nameSignboard.signboardHeight);

    this.nameSignboard.restX = restX;
    this.nameSignboard.restY = restY;
    this.nameSignboard.setX(restX);

    if (!this.nameSignboard.visible) {
      this.nameSignboard.setY(restY);
    }
  }

  createNameSignboard() {
    const PX = 4;
    const boardCols = 44;
    const boardRows = 10;
    const boardWidth = boardCols * PX;
    const boardHeight = boardRows * PX;

    const container = this.add.container(0, 0);
    container.setDepth(500);
    container.setVisible(false);
    container.signboardWidth = boardWidth;
    container.signboardHeight = boardHeight;

    const graphics = this.add.graphics();
    const px = (col, row, w = 1, h = 1) => graphics.fillRect(col * PX, row * PX, w * PX, h * PX);

    const outline = 0x6b4a32;
    const plankDark = 0x8a5a3a;
    const plankBase = 0xa67148;
    const plankMid = 0xb9835a;
    const plankHighlight = 0xd6a075;
    const grainShadow = 0x6e4327;
    const ironDark = 0x5a3a22;
    const ironLight = 0xd8c0a0;

    graphics.fillStyle(outline, 1);
    px(0, 1, boardCols, boardRows - 2);
    px(1, 0, boardCols - 2, 1);
    px(1, boardRows - 1, boardCols - 2, 1);

    graphics.fillStyle(plankDark, 1);
    px(1, 1, boardCols - 2, boardRows - 2);

    graphics.fillStyle(plankBase, 1);
    px(2, 2, boardCols - 4, boardRows - 4);

    graphics.fillStyle(plankMid, 1);
    px(2, 3, boardCols - 4, boardRows - 6);

    graphics.fillStyle(plankHighlight, 1);
    px(2, 2, boardCols - 4, 1);

    graphics.fillStyle(grainShadow, 1);
    px(2, boardRows - 3, boardCols - 4, 1);

    graphics.fillStyle(ironDark, 1);
    px(3, 2, 2, 2);
    px(boardCols - 5, 2, 2, 2);
    px(3, boardRows - 4, 2, 2);
    px(boardCols - 5, boardRows - 4, 2, 2);

    graphics.fillStyle(ironLight, 1);
    px(3, 2, 1, 1);
    px(boardCols - 5, 2, 1, 1);
    px(3, boardRows - 4, 1, 1);
    px(boardCols - 5, boardRows - 4, 1, 1);

    container.add(graphics);

    const text = this.add.bitmapText(
      Math.round(boardWidth / 2),
      Math.round(boardHeight / 2) - 1,
      BITMAP_FONT_PIXEL,
      '',
      8,
    );

    text.setOrigin(0.5);
    text.setTint(0xf1d9a8);
    container.add(text);

    this.nameSignboard = container;
    this.nameSignboardText = text;
  }

  createFpsCounter() {
    this.fpsCounter = this.add.bitmapText(0, 0, BITMAP_FONT_PIXEL, '-- FPS', 8);
    this.fpsCounter.setOrigin(1, 0);
    this.fpsCounter.setTint(0xf8f4ef);
    this.fpsCounter.setDepth(1000);

    this.frameDeltaCounter = this.add.bitmapText(0, 0, BITMAP_FONT_PIXEL, '--.- MS', 8);
    this.frameDeltaCounter.setOrigin(1, 0);
    this.frameDeltaCounter.setTint(0xf8f4ef);
    this.frameDeltaCounter.setDepth(1000);

    this.nextFpsUpdateAt = 0;
  }

  positionFpsCounter() {
    if (!this.fpsCounter || !this.frameDeltaCounter) {
      return;
    }

    const visibleArea = this.getVisibleGameArea();
    const margin = 10;
    const x = Math.round(visibleArea.right - margin);
    const y = Math.round(visibleArea.top + margin);

    this.fpsCounter.setPosition(x, y);
    this.frameDeltaCounter.setPosition(x, y + 12);
  }

  handleObjectOver(_pointer, gameObject) {
    const name = gameObject?.displayName;

    if (!name || !gameObject.isIngredient || !this.nameSignboard) {
      return;
    }

    this.nameSignboardText.setText(name);
    this.showNameSignboard();
  }

  handleObjectOut(_pointer, gameObject) {
    if (!this.nameSignboard) {
      return;
    }

    if (gameObject && !gameObject.isIngredient) {
      return;
    }

    if (gameObject && this.nameSignboardText.text !== gameObject.displayName) {
      return;
    }

    this.hideNameSignboard();
  }

  showNameSignboard() {
    const board = this.nameSignboard;

    if (!board || board.isShowing) {
      return;
    }

    if (this.nameSignboardTween) {
      this.nameSignboardTween.stop();
    }

    const restY = board.restY ?? board.y;
    const slideOffset = 14;

    board.isShowing = true;
    board.setVisible(true);
    board.setAlpha(0);
    board.setY(restY + slideOffset);

    this.nameSignboardTween = this.tweens.add({
      targets: board,
      y: restY,
      alpha: 1,
      duration: 220,
      ease: 'Cubic.Out',
    });
  }

  hideNameSignboard() {
    const board = this.nameSignboard;

    if (!board || !board.isShowing) {
      return;
    }

    if (this.nameSignboardTween) {
      this.nameSignboardTween.stop();
    }

    const restY = board.restY ?? board.y;
    const slideOffset = 14;

    board.isShowing = false;

    this.nameSignboardTween = this.tweens.add({
      targets: board,
      y: restY + slideOffset,
      alpha: 0,
      duration: 160,
      ease: 'Cubic.In',
      onComplete: () => {
        board.setVisible(false);
        board.setY(restY);
      },
    });
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
