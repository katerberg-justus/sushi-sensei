import * as Phaser from 'phaser/dist/phaser.esm.js';
import { COLORS, SCENE_KEYS } from '../game/constants.js';
import { Bowl } from '../objects/Bowl.js';
import { Brush } from '../objects/Brush.js';
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
import { GameUi } from '../ui/GameUi.js';

const INGREDIENT_TRAIT_CLICK_MAX_DURATION = 220;
const INGREDIENT_TRAIT_CLICK_MOVE_TOLERANCE = 6;

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
        {
          quality: 2,
          freshness: 'fresh',
          flavorTags: ['Clean', 'Sweet'],
        },
      );

      riceBall.displayName = 'Rice Ball';
      return riceBall;
    });
    [this.riceBall] = this.riceBalls;
    this.cuttableSalmon = new CuttableSalmon(this, width * 0.32, height * 0.42, {
      quality: 3,
      freshness: 'pristine',
      flavorTags: ['Umami', 'Fatty', 'Buttery'],
    });
    this.cuttableMaguro = new CuttableFish(this, width * 0.45, height * 0.42, {
      fishType: 'maguro',
      quality: 3,
      freshness: 'fresh',
      flavorTags: ['Umami', 'Clean', 'Oceanic'],
    });
    this.cuttableHamachi = new CuttableFish(this, width * 0.58, height * 0.42, {
      fishType: 'hamachi',
      quality: 2,
      freshness: 'fresh',
      flavorTags: ['Buttery', 'Fatty', 'Delicate'],
    });
    this.cuttableTai = new CuttableFish(this, width * 0.71, height * 0.42, {
      fishType: 'tai',
      quality: 2,
      freshness: 'fresh',
      flavorTags: ['Clean', 'Delicate', 'Oceanic'],
    });
    this.cuttableUnagi = new CuttableFish(this, width * 0.84, height * 0.42, {
      fishType: 'unagi',
      quality: 2,
      freshness: 'good',
      flavorTags: ['Smoky', 'Sweet', 'Caramelized'],
    });
    this.cuttableTamago = new CuttableTamago(this, width * 0.45, height * 0.58, {
      quality: 2,
      freshness: 'good',
      flavorTags: ['Sweet', 'Umami', 'Delicate'],
    });
    this.cuttableTamago.displayName = 'Tamago';
    this.rollingMat = new RollingMat(this, width * 0.61, height * 0.7, { quality: 2 });
    this.noriSheet = new NoriSheet(this, width * 0.6, height * 0.58, {
      quality: 2,
      freshness: 'good',
      flavorTags: ['Briny', 'Oceanic', 'Toasty'],
    });
    this.nigiri = new Nigiri(this, width * 0.76, height * 0.58, {
      fishType: 'salmon',
      quality: 3,
      freshness: 'pristine',
      flavorTags: ['Umami', 'Fatty', 'Clean'],
    });
    this.sushiRoll = new SushiRoll(this, width * 0.68, height * 0.48, {
      fillingType: 'salmon',
      quality: 2,
      freshness: 'fresh',
      flavorTags: ['Umami', 'Oceanic', 'Clean'],
    });
    this.bowls = [
      new Bowl(this, width * 0.43, height * 0.65, {
        preset: 'smallBowl',
        displayName: 'Wasabi Bowl',
        color: 'black',
        acceptedStackCategories: [],
        contents: { style: 'wasabi', fullness: 0.72 },
        quality: 2,
      }),
      new Bowl(this, width * 0.5, height * 0.64, {
        preset: 'smallWideBowl',
        displayName: 'Nikiri Sauce',
        color: 'black',
        acceptedStackCategories: ['tool'],
        maxStackedItems: 1,
        contents: { style: 'nikiri', fullness: 0.62 },
        quality: 2,
      }),
    ];
    this.nikiriBowl = this.bowls[1];
    this.nigiriObjects = [this.nigiri];
    this.plates = [
      new Plate(this, width * 0.79, height * 0.73, {
        size: 'medium',
        material: 'ceramic',
        quality: 2,
      }),
      new Plate(this, width * 0.91, height * 0.73, {
        size: 'small',
        material: 'slate',
        displayName: 'Sashimi Plate',
        maxFishWeightGrams: 12,
        quality: 2,
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
    this.knife = new Knife(this, width * 0.5, height * 0.72, { quality: 2 });
    this.knife.displayName = 'Knife';
    this.knife.on('cutstroke', this.handleCutStroke, this);

    this.brush = new Brush(this, this.nikiriBowl.x, this.nikiriBowl.y - 11, { quality: 2 });
    this.brush.on('brushstroke', this.handleBrushStroke, this);
    this.brush.on('drag', this.handleBrushDragMove, this);
    this.brush.on('dragend', this.endBrushGlazeGesture, this);
    this.brush.attachToStackTarget(this.nikiriBowl);
    this.glazeKeyDown = false;
    this.glazeTouchDown = false;
    this.pendingIngredientTraitClick = null;
    this.input.keyboard.on('keydown-SPACE', this.handleGlazeKeyDown, this);
    this.input.keyboard.on('keyup-SPACE', this.handleGlazeKeyUp, this);
    this.input.on('pointerdown', this.handleGlazeTouchPointerDown, this);
    this.input.on('pointerup', this.handleGlazeTouchPointerUp, this);
    this.input.on('pointerupoutside', this.handleGlazeTouchPointerUp, this);

    this.ui = new GameUi(this);
    this.positionUi();
    this.ui.inventoryBar.storeObjectInSlot(0, this.cuttableSalmon);
    this.ui.inventoryBar.storeObjectInLargeSlot(0, 0, this.cuttableMaguro);
    this.scale.on('resize', this.positionUi, this);
    this.scale.on('resize', this.resizeBoardBackground, this);
    this.input.keyboard.on('keydown-R', this.resetScene, this);
    this.input.on('gameobjectdown', this.handleObjectDown, this);
    this.input.on('gameobjectup', this.handleObjectUp, this);
    this.input.on('pointerdown', this.handleScenePointerDown, this);
    this.input.on('dragstart', this.handleObjectDragStart, this);
    this.input.on('pointerupoutside', this.clearPendingIngredientTraitClick, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.positionUi, this);
      this.scale.off('resize', this.resizeBoardBackground, this);
      this.input.keyboard.off('keydown-R', this.resetScene, this);
      this.input.keyboard.off('keydown-SPACE', this.handleGlazeKeyDown, this);
      this.input.keyboard.off('keyup-SPACE', this.handleGlazeKeyUp, this);
      this.input.off('pointerdown', this.handleGlazeTouchPointerDown, this);
      this.input.off('pointerup', this.handleGlazeTouchPointerUp, this);
      this.input.off('pointerupoutside', this.handleGlazeTouchPointerUp, this);
      this.input.off('gameobjectdown', this.handleObjectDown, this);
      this.input.off('gameobjectup', this.handleObjectUp, this);
      this.input.off('pointerdown', this.handleScenePointerDown, this);
      this.input.off('dragstart', this.handleObjectDragStart, this);
      this.input.off('pointerupoutside', this.clearPendingIngredientTraitClick, this);
      this.ui?.destroy();
      this.ui = null;
    });
    this.input.on('gameobjectover', this.handleObjectOver, this);
    this.input.on('gameobjectout', this.handleObjectOut, this);
  }

  update(time) {
    this.ui?.update(time);
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

  setHoverActionIndicator(modes, gameObject = null) {
    this.ui?.setHoverActions(modes, gameObject);
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

  positionUi() {
    this.ui?.position();
  }

  setDragDebugInfo(lines = []) {
    this.ui?.setDragDebugInfo(lines);
  }

  handleObjectOver(_pointer, gameObject) {
    this.setHoverActionIndicator(this.getHoverActionModes(gameObject), gameObject);

    const name = gameObject?.displayName;

    if (!name || !gameObject.isIngredient || !this.ui) {
      return;
    }

    this.ui.showIngredientName(gameObject, this.getIngredientSignboardText(gameObject));
  }

  handleObjectDown(_pointer, gameObject) {
    if (!gameObject?.hasQuality || !this.ui) {
      this.pendingIngredientTraitClick = null;
      return;
    }

    this.pendingIngredientTraitClick = {
      gameObject,
      pointerId: this.getPointerClickId(_pointer),
      x: _pointer.x,
      y: _pointer.y,
      startedAt: this.time.now,
    };
  }

  handleObjectUp(pointer, gameObject) {
    const pendingClick = this.pendingIngredientTraitClick;

    if (!pendingClick || pendingClick.gameObject !== gameObject) {
      return;
    }

    this.pendingIngredientTraitClick = null;

    if (
      !gameObject?.hasQuality
      || pendingClick.pointerId !== this.getPointerClickId(pointer)
      || this.time.now - pendingClick.startedAt > INGREDIENT_TRAIT_CLICK_MAX_DURATION
      || this.getPointerDistanceFrom(pendingClick, pointer) > INGREDIENT_TRAIT_CLICK_MOVE_TOLERANCE
      || gameObject.isDragging
    ) {
      return;
    }

    if (this.ui?.isIngredientTraitObject(gameObject)) {
      this.ui.hideIngredientTraits();
      return;
    }

    this.ui?.showIngredientTraits(gameObject);
  }

  handleScenePointerDown(pointer, currentlyOver = []) {
    if (!this.ui || currentlyOver.some((gameObject) => gameObject?.hasQuality)) {
      return;
    }

    this.pendingIngredientTraitClick = null;
    this.ui.hideIngredientTraits();
  }

  handleObjectDragStart() {
    this.pendingIngredientTraitClick = null;
    this.ui?.hideIngredientTraits();
  }

  clearPendingIngredientTraitClick() {
    this.pendingIngredientTraitClick = null;
  }

  getPointerClickId(pointer) {
    return pointer?.id ?? pointer?.pointerId ?? null;
  }

  getPointerDistanceFrom(start, pointer) {
    const x = pointer?.x;
    const y = pointer?.y;

    if (![start?.x, start?.y, x, y].every(Number.isFinite)) {
      return 0;
    }

    return Phaser.Math.Distance.Between(start.x, start.y, x, y);
  }

  handleObjectOut(_pointer, gameObject) {
    if (gameObject && this.ui?.isHoverActionObject(gameObject)) {
      this.setHoverActionIndicator(null);
    }

    if (!this.ui) {
      return;
    }

    if (gameObject && !gameObject.isIngredient) {
      return;
    }

    if (gameObject && !this.ui.isIngredientNameObject(gameObject)) {
      return;
    }

    this.ui.hideIngredientName();
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

  handleGlazeKeyDown(event) {
    if (event?.repeat) {
      return;
    }

    this.glazeKeyDown = true;
    this.beginBrushGlazeGesture();
  }

  handleGlazeKeyUp() {
    this.glazeKeyDown = false;

    if (!this.isGlazeGestureActive()) {
      this.endBrushGlazeGesture();
    }
  }

  handleGlazeTouchPointerDown(pointer) {
    if (!this.isTouchPointer(pointer) || !this.brush?.isDragging) {
      return;
    }

    if (this.getActiveTouchPointers().length < 2 && pointer.event?.isPrimary !== false) {
      return;
    }

    this.glazeTouchDown = true;
    this.beginBrushGlazeGesture();
  }

  handleGlazeTouchPointerUp(pointer) {
    if (!this.isTouchPointer(pointer)) {
      return;
    }

    if (this.getActiveTouchPointers().length <= 1) {
      this.glazeTouchDown = false;

      if (!this.isGlazeGestureActive()) {
        this.endBrushGlazeGesture();
      }
    }
  }

  isGlazeGestureActive() {
    return Boolean(this.glazeKeyDown || this.glazeTouchDown);
  }

  isTouchPointer(pointer) {
    return pointer?.event?.pointerType === 'touch'
      || pointer?.pointerType === 'touch'
      || pointer?.wasTouch === true;
  }

  getActiveTouchPointers() {
    const managerPointers = this.input?.manager?.pointers;
    const pluginPointers = this.input?.pointers;
    const pointers = Array.isArray(managerPointers) ? managerPointers : pluginPointers;

    if (!Array.isArray(pointers)) {
      return [];
    }

    return pointers.filter((p) => p?.isDown && this.isTouchPointer(p));
  }

  beginBrushGlazeGesture() {
    if (!this.brush?.isDragging || !this.brush.isDipped) {
      return;
    }

    const brushRect = this.brush.getWorldHitboxRect();

    (this.nigiriObjects ?? []).forEach((nigiri) => {
      if (!nigiri || nigiri.isGlazed) {
        return;
      }

      nigiri.beginGlazeStroke(brushRect);
    });
  }

  endBrushGlazeGesture() {
    (this.nigiriObjects ?? []).forEach((nigiri) => nigiri?.endGlazeStroke?.());
  }

  handleBrushDragMove() {
    if (!this.isGlazeGestureActive() || !this.brush?.isDipped) {
      return;
    }

    const brushRect = this.brush.getWorldHitboxRect();
    let glazedAny = false;

    (this.nigiriObjects ?? []).forEach((nigiri) => {
      if (!nigiri || nigiri.isGlazed) {
        return;
      }

      const intersects = Phaser.Geom.Intersects.RectangleToRectangle(
        brushRect,
        nigiri.getGlazeTargetWorldRect(),
      );

      if (!intersects) {
        if (nigiri.glazeStroke) {
          nigiri.endGlazeStroke();
        }
        return;
      }

      if (nigiri.glazeStroke) {
        nigiri.extendGlazeStroke(brushRect);
      } else {
        nigiri.beginGlazeStroke(brushRect);
      }

      if (nigiri.isGlazed) {
        glazedAny = true;
      }
    });

    if (glazedAny) {
      this.brush.setDipped(false);
      this.endBrushGlazeGesture();
    }
  }

  handleBrushStroke(stroke) {
    if (!stroke?.end) {
      return;
    }

    (this.nigiriObjects ?? []).forEach((nigiri) => {
      if (!nigiri || nigiri.isGlazed) {
        return;
      }

      if (nigiri.containsFishPoint(stroke.end) || nigiri.containsFishPoint(stroke.start)) {
        nigiri.setGlazed(true);
      }
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
