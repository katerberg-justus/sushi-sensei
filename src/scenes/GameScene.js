import * as Phaser from 'phaser/dist/phaser.esm.js';
import { BITMAP_FONT_PIXEL, COLORS, SCENE_KEYS } from '../game/constants.js';
import { Bowl } from '../objects/Bowl.js';
import { CuttableFish } from '../objects/CuttableFish.js';
import { CuttableSalmon } from '../objects/CuttableSalmon.js';
import { CuttableTamago } from '../objects/CuttableTamago.js';
import { Knife } from '../objects/Knife.js';
import { Nigiri } from '../objects/Nigiri.js';
import { NoriSheet } from '../objects/NoriSheet.js';
import { RiceBall } from '../objects/RiceBall.js';
import { RollingMat } from '../objects/RollingMat.js';

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

    this.riceBalls = Array.from({ length: 10 }, (_value, index) => {
      const columns = 2;
      const column = index % columns;
      const row = Math.floor(index / columns);
      const inwardLean = row * -8;
      const riceBall = new RiceBall(
        this,
        width * 0.12 + column * 54 + inwardLean,
        height * 0.26 + row * 45,
      );

      riceBall.displayName = 'Rice Ball';
      return riceBall;
    });
    [this.riceBall] = this.riceBalls;
    this.cuttableSalmon = new CuttableSalmon(this, width * 0.32, height * 0.42);
    this.cuttableMaguro = new CuttableFish(this, width * 0.45, height * 0.42, { fishType: 'maguro' });
    this.cuttableHamachi = new CuttableFish(this, width * 0.58, height * 0.42, { fishType: 'hamachi' });
    this.cuttableTai = new CuttableFish(this, width * 0.71, height * 0.42, { fishType: 'tai' });
    this.cuttableUnagi = new CuttableFish(this, width * 0.84, height * 0.42, { fishType: 'unagi' });
    this.cuttableTamago = new CuttableTamago(this, width * 0.45, height * 0.58);
    this.cuttableTamago.displayName = 'Tamago';
    this.rollingMat = new RollingMat(this, width * 0.61, height * 0.7);
    this.noriSheet = new NoriSheet(this, width * 0.6, height * 0.58);
    this.nigiri = new Nigiri(this, width * 0.76, height * 0.58, { fishType: 'salmon' });
    this.bowls = [
      new Bowl(this, width * 0.23, height * 0.6, { color: 'blue' }),
      new Bowl(this, width * 0.34, height * 0.6, { color: 'red' }),
      new Bowl(this, width * 0.43, height * 0.65, {
        preset: 'smallBowl',
        displayName: 'Wasabi Bowl',
        color: 'green',
        acceptedStackCategories: [],
        contents: { style: 'wasabi', fullness: 0.72 },
      }),
      new Bowl(this, width * 0.5, height * 0.64, {
        preset: 'tinyCup',
        displayName: 'Nikiri Sauce',
        color: 'black',
        acceptedStackCategories: [],
        contents: { style: 'nikiri', fullness: 0.62 },
      }),
    ];
    this.cuttableObjects = [
      this.cuttableSalmon,
      this.cuttableMaguro,
      this.cuttableHamachi,
      this.cuttableTai,
      this.cuttableUnagi,
      this.cuttableTamago,
      this.noriSheet,
    ];
    this.knife = new Knife(this, width * 0.5, height * 0.72);
    this.knife.displayName = 'Knife';
    this.knife.on('cutstroke', this.handleCutStroke, this);

    this.createNameSignboard();
    this.positionNameSignboard();
    this.createDragDebugPanel();
    this.positionDragDebugPanel();
    this.createFpsCounter();
    this.positionFpsCounter();
    this.scale.on('resize', this.positionNameSignboard, this);
    this.scale.on('resize', this.positionDragDebugPanel, this);
    this.scale.on('resize', this.positionFpsCounter, this);
    this.input.keyboard.on('keydown-R', this.resetScene, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.positionNameSignboard, this);
      this.scale.off('resize', this.positionDragDebugPanel, this);
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

    const restX = Math.round(visibleArea.left + visibleArea.width / 2);
    const restY = Math.round(visibleArea.bottom - margin - this.nameSignboard.signboardHeight / 2);

    this.nameSignboard.restX = restX;
    this.nameSignboard.restY = restY;
    this.nameSignboard.setX(restX);

    if (!this.nameSignboard.visible) {
      this.nameSignboard.setY(restY);
    }
  }

  createNameSignboard() {
    const labelHeight = 8;

    const container = this.add.container(0, 0);
    container.setDepth(500);
    container.setVisible(false);
    container.signboardHeight = labelHeight;

    const text = this.add.bitmapText(
      0,
      0,
      BITMAP_FONT_PIXEL,
      '',
      labelHeight,
    );

    text.setOrigin(0.5);
    text.setTint(0xffffff);
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

  createDragDebugPanel() {
    this.dragDebugText = this.add.bitmapText(0, 0, BITMAP_FONT_PIXEL, 'DRAG DEBUG\nidle', 8);
    this.dragDebugText.setOrigin(0, 0);
    this.dragDebugText.setTint(0x173027);
    this.dragDebugText.setDepth(1000);
  }

  positionDragDebugPanel() {
    if (!this.dragDebugText) {
      return;
    }

    const visibleArea = this.getVisibleGameArea();

    this.dragDebugText.setPosition(
      Math.round(visibleArea.left + 10),
      Math.round(visibleArea.top + 10),
    );
  }

  setDragDebugInfo(lines = []) {
    if (!this.dragDebugText) {
      return;
    }

    this.dragDebugText.setText(['DRAG DEBUG', ...lines].slice(0, 8).join('\n'));
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

    this.nameSignboardObject = gameObject;
    this.nameSignboardText.setText(this.getIngredientSignboardText(gameObject));
    this.showNameSignboard();
  }

  handleObjectOut(_pointer, gameObject) {
    if (!this.nameSignboard) {
      return;
    }

    if (gameObject && !gameObject.isIngredient) {
      return;
    }

    if (gameObject && this.nameSignboardObject !== gameObject) {
      return;
    }

    this.nameSignboardObject = null;
    this.hideNameSignboard();
  }

  getIngredientSignboardText(gameObject) {
    const name = this.getStackedIngredientName(gameObject);
    const weightGrams = gameObject?.weightGrams;

    if (!Number.isFinite(weightGrams) || weightGrams <= 0) {
      return name;
    }

    const roundedWeight = Number.isInteger(weightGrams)
      ? weightGrams.toString()
      : weightGrams.toFixed(1);

    return `${name} ${roundedWeight}g`;
  }

  getStackedIngredientName(gameObject) {
    const names = this.getStackedIngredientNames(gameObject);
    const counts = new Map();

    for (const name of names) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([name, count]) => (count > 1 ? `${name} ×${count}` : name))
      .join(' + ');
  }

  getStackedIngredientNames(gameObject) {
    if (!gameObject) {
      return [];
    }

    const names = gameObject.displayName ? [gameObject.displayName] : [];
    const childNames = (gameObject.stackChildren ?? []).flatMap((child) => (
      this.getStackedIngredientNames(child)
    ));

    return [...names, ...childNames];
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
