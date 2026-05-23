import * as Phaser from 'phaser/dist/phaser.esm.js';
import { BITMAP_FONT_PIXEL, COLORS, SCENE_KEYS } from '../game/constants.js';
import { Bowl } from '../objects/Bowl.js';
import { CuttableFish } from '../objects/CuttableFish.js';
import { CuttableSalmon } from '../objects/CuttableSalmon.js';
import { CuttableTamago } from '../objects/CuttableTamago.js';
import { Knife } from '../objects/Knife.js';
import { Nigiri } from '../objects/Nigiri.js';
import { NoriSheet } from '../objects/NoriSheet.js';
import { Plate } from '../objects/Plate.js';
import { RiceBall } from '../objects/RiceBall.js';
import { RollingMat } from '../objects/RollingMat.js';
import { SushiRoll } from '../objects/SushiRoll.js';
import { DraggableObject } from '../objects/DraggableObject.js';
import { RotatableObject } from '../objects/RotatableObject.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.game);
  }

  create() {
    const { width, height } = this.scale;

    this.input.mouse?.disableContextMenu();
    this.input.setPollAlways();
    this.cameras.main.setBackgroundColor(COLORS.boardSideB);
    this.createPixelBoardTexture();

    this.boardBackground = this.add.image(0, 0, 'pixel-cutting-board').setOrigin(0);
    this.resizeBoardBackground();

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
    this.sushiRoll = new SushiRoll(this, width * 0.68, height * 0.48, { fillingType: 'salmon' });
    this.bowls = [
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
    this.plates = [
      new Plate(this, width * 0.79, height * 0.73, {
        size: 'medium',
        material: 'ceramic',
      }),
      new Plate(this, width * 0.91, height * 0.73, {
        size: 'small',
        material: 'slate',
        displayName: 'Sashimi Plate',
        maxFishWeightGrams: 12,
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
      this.sushiRoll,
    ];
    this.knife = new Knife(this, width * 0.5, height * 0.72);
    this.knife.displayName = 'Knife';
    this.knife.on('cutstroke', this.handleCutStroke, this);

    this.createNameSignboard();
    this.positionNameSignboard();
    this.createHoverActionIndicator();
    this.positionHoverActionIndicator();
    this.createDragDebugPanel();
    this.positionDragDebugPanel();
    this.createFpsCounter();
    this.positionFpsCounter();
    this.scale.on('resize', this.positionNameSignboard, this);
    this.scale.on('resize', this.positionHoverActionIndicator, this);
    this.scale.on('resize', this.positionDragDebugPanel, this);
    this.scale.on('resize', this.positionFpsCounter, this);
    this.scale.on('resize', this.resizeBoardBackground, this);
    this.input.keyboard.on('keydown-R', this.resetScene, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.positionNameSignboard, this);
      this.scale.off('resize', this.positionHoverActionIndicator, this);
      this.scale.off('resize', this.positionDragDebugPanel, this);
      this.scale.off('resize', this.positionFpsCounter, this);
      this.scale.off('resize', this.resizeBoardBackground, this);
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

  resizeBoardBackground() {
    if (!this.boardBackground) {
      return;
    }

    const { width, height } = this.scale;

    this.boardBackground.setDisplaySize(width, height);
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

  createHoverActionIndicator() {
    this.createHoverActionIconTextures();

    const iconSize = 24;
    const gap = 6;
    const grabIcon = this.add.image(iconSize / 2, iconSize / 2, 'hover-grab-hand-icon');
    const resetIcon = this.add.image(iconSize + gap + iconSize / 2, iconSize / 2, 'hover-reset-arrow-icon');
    grabIcon.setOrigin(0.5);
    resetIcon.setOrigin(0.5);
    resetIcon.setVisible(false);

    const container = this.add.container(0, 0, [grabIcon, resetIcon]);
    container.setDepth(1000);
    container.setVisible(false);
    container.setAlpha(0);
    container.iconSize = iconSize;
    container.iconGap = gap;
    container.indicatorWidth = iconSize;
    container.indicatorHeight = iconSize;
    container.icons = { grab: grabIcon, reset: resetIcon };

    this.hoverActionIndicator = container;
    this.hoverActionIndicatorObject = null;
    this.hoverActionIndicatorModes = [];
  }

  createHoverActionIconTextures() {
    this.createGrabHandIconTexture();
    this.createResetArrowIconTexture();
  }

  createGrabHandIconTexture() {
    const key = 'hover-grab-hand-icon';

    if (this.textures.exists(key)) {
      this.textures.remove(key);
    }

    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(8, 1, 4, 12);
    graphics.fillRect(13, 3, 4, 11);
    graphics.fillRect(18, 6, 4, 11);
    graphics.fillRect(4, 7, 4, 10);
    graphics.fillRect(1, 12, 6, 6);
    graphics.fillRect(4, 16, 18, 5);
    graphics.fillRect(7, 21, 12, 3);
    graphics.fillRect(21, 11, 3, 8);

    graphics.generateTexture(key, 24, 24);
    graphics.destroy();
  }

  createResetArrowIconTexture() {
    const key = 'hover-reset-arrow-icon';

    if (this.textures.exists(key)) {
      this.textures.remove(key);
    }

    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(8, 3, 8, 3);
    graphics.fillRect(15, 5, 4, 3);
    graphics.fillRect(18, 8, 3, 4);
    graphics.fillRect(19, 12, 3, 4);
    graphics.fillRect(17, 16, 3, 3);
    graphics.fillRect(14, 18, 4, 3);
    graphics.fillRect(9, 18, 5, 3);
    graphics.fillRect(5, 16, 4, 3);
    graphics.fillRect(3, 12, 3, 5);
    graphics.fillRect(4, 8, 3, 4);
    graphics.fillRect(6, 5, 5, 3);
    graphics.fillRect(2, 4, 8, 3);
    graphics.fillRect(2, 7, 5, 3);
    graphics.fillRect(2, 10, 8, 3);
    graphics.fillRect(0, 7, 3, 3);

    graphics.generateTexture(key, 24, 24);
    graphics.destroy();
  }

  positionHoverActionIndicator() {
    if (!this.hoverActionIndicator) {
      return;
    }

    const visibleArea = this.getVisibleGameArea();
    const margin = 10;

    this.hoverActionIndicator.setPosition(
      Math.round(visibleArea.left + margin),
      Math.round(visibleArea.bottom - margin - this.hoverActionIndicator.indicatorHeight),
    );
  }

  setHoverActionIndicator(modes, gameObject = null) {
    const indicator = this.hoverActionIndicator;

    if (!indicator) {
      return;
    }

    if (!modes?.length) {
      this.hoverActionIndicatorObject = null;
      this.hoverActionIndicatorModes = [];
      indicator.setVisible(false);
      indicator.setAlpha(0);
      return;
    }

    this.hoverActionIndicatorObject = gameObject;
    this.hoverActionIndicatorModes = modes;
    indicator.indicatorWidth = modes.length * indicator.iconSize
      + (modes.length - 1) * indicator.iconGap;

    const iconEntries = {
      grab: indicator.icons.grab,
      reset: indicator.icons.reset,
    };

    Object.values(iconEntries).forEach((icon) => icon.setVisible(false));
    modes.forEach((mode, index) => {
      const icon = iconEntries[mode];

      if (!icon) {
        return;
      }

      icon.setPosition(
        indicator.iconSize / 2 + index * (indicator.iconSize + indicator.iconGap),
        indicator.iconSize / 2,
      );
      icon.setVisible(true);
    });

    indicator.setVisible(true);
    indicator.setAlpha(1);
  }

  getHoverActionModes(gameObject) {
    const modes = [];

    if (gameObject instanceof DraggableObject) {
      modes.push('grab');
    }

    if (gameObject instanceof RotatableObject && gameObject.isRotatable) {
      modes.push('reset');
    }

    return modes;
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
    this.setHoverActionIndicator(this.getHoverActionModes(gameObject), gameObject);

    const name = gameObject?.displayName;

    if (!name || !gameObject.isIngredient || !this.nameSignboard) {
      return;
    }

    this.nameSignboardObject = gameObject;
    this.nameSignboardText.setText(this.getIngredientSignboardText(gameObject));
    this.showNameSignboard();
  }

  handleObjectOut(_pointer, gameObject) {
    if (gameObject && this.hoverActionIndicatorObject === gameObject) {
      this.setHoverActionIndicator(null);
    }

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
    const boardDepth = textureHeight;
    const graphics = this.add.graphics();

    graphics.fillStyle(COLORS.boardSideB, 1);
    graphics.fillRect(0, 0, textureWidth, textureHeight);

    const topLeft = new Phaser.Math.Vector2(-24, -38);
    const topRight = new Phaser.Math.Vector2(344, -38);
    const frontRight = new Phaser.Math.Vector2(380, boardDepth + 18);
    const frontLeft = new Phaser.Math.Vector2(-60, boardDepth + 18);
    const topPalette = [0xecc690, 0xe8bf86, 0xe5b87d];

    const lightX = textureWidth / 2;
    const lightY = textureHeight * 0.42;
    const lightRadiusX = textureWidth * 0.55;
    const lightRadiusY = textureHeight * 0.32;
    const lightLevels = [
      { brightness: 1.04, warmR: 6, warmG: 3, warmB: 0 },
      { brightness: 1.02, warmR: 3, warmG: 1, warmB: 0 },
      { brightness: 1.00, warmR: 0, warmG: 0, warmB: 0 },
      { brightness: 0.95, warmR: -2, warmG: -4, warmB: -6 },
      { brightness: 0.88, warmR: -4, warmG: -7, warmB: -10 },
    ];

    for (let y = 0; y < boardDepth; y += pixel) {
      for (let x = 0; x < 356; x += pixel) {
        const u0 = x / 356;
        const v0 = y / boardDepth;
        const u1 = Math.min((x + pixel) / 356, 1);
        const v1 = Math.min((y + pixel) / boardDepth, 1);
        const plank = Math.floor(x / 56);
        const grainBand = Math.floor(y / (pixel * 4));
        const baseColor = topPalette[(grainBand + plank) % topPalette.length];

        const a = this.pointOnBoard(topLeft, topRight, frontRight, frontLeft, u0, v0);
        const b = this.pointOnBoard(topLeft, topRight, frontRight, frontLeft, u1, v0);
        const c = this.pointOnBoard(topLeft, topRight, frontRight, frontLeft, u1, v1);
        const d = this.pointOnBoard(topLeft, topRight, frontRight, frontLeft, u0, v1);

        const centerScreenX = (a.x + c.x) / 2;
        const centerScreenY = (a.y + c.y) / 2;
        const dx = (centerScreenX - lightX) / lightRadiusX;
        const dy = (centerScreenY - lightY) / lightRadiusY;
        const t = Phaser.Math.Clamp(Math.hypot(dx, dy), 0, 1);
        const levelIndex = Math.min(lightLevels.length - 1, Math.floor(t * lightLevels.length));
        const color = this.applyLightLevel(baseColor, lightLevels[levelIndex]);

        this.fillPixelQuad(graphics, a, b, c, d, color);
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

  applyLightLevel(baseColor, level) {
    const r = (baseColor >> 16) & 0xff;
    const g = (baseColor >> 8) & 0xff;
    const b = baseColor & 0xff;
    const lr = Phaser.Math.Clamp(Math.round(r * level.brightness + level.warmR), 0, 255);
    const lg = Phaser.Math.Clamp(Math.round(g * level.brightness + level.warmG), 0, 255);
    const lb = Phaser.Math.Clamp(Math.round(b * level.brightness + level.warmB), 0, 255);

    return (lr << 16) | (lg << 8) | lb;
  }
}
