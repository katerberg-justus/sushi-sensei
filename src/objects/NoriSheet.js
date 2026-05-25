import * as Phaser from 'phaser/dist/phaser.esm.js';
import { CuttableObject } from './CuttableObject.js';
import { IngredientObject } from './IngredientObject.js';
import { resolveVariantTexture, toHexColor } from './ProceduralTexture.js';

const PIXEL = 2;
const NORI_BASE_KEY = 'nori-sheet-pixel';
const RICE_ON_NORI_BASE_KEY = 'rice-on-nori-sheet-pixel';
const NORI_VARIANT_POOL = 6;
const NORI_WIDTH = 58;
const NORI_HEIGHT = 40;
const NORI_WEIGHT_GRAMS = 3;
const NORI_PERSPECTIVE_SQUASH = 0.66;
const RICE_SPREAD_TARGET = { left: 6, top: 6, right: 52, bottom: 34 };
const RICE_SPREAD_COMPLETE_COVERAGE = 0.97;
const ROLL_FILLING_REQUIRED_WIDTH_COVERAGE = 0.9;
const ROLL_FILLING_REQUIRED_COLUMN_COVERAGE = 0.1;
const ROLL_FILLING_EDGE_BAND_FRACTION = 0.25;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
let riceSpreadTextureId = 0;

export class NoriSheet extends IngredientObject {
  constructor(scene, x, y, options = {}) {
    const hasSpreadRice = options.hasSpreadRice === true;
    const wholeWeightGrams = options.wholeWeightGrams
      ?? NORI_WEIGHT_GRAMS + (hasSpreadRice ? (options.riceWeightGrams ?? 20) : 0);
    const { textureKey, variantIndex } = resolveVariantTexture(scene, hasSpreadRice ? RICE_ON_NORI_BASE_KEY : NORI_BASE_KEY, options, {
      width: NORI_WIDTH,
      height: NORI_HEIGHT,
      pool: NORI_VARIANT_POOL,
      paint: hasSpreadRice ? NoriSheet.paintRiceSpreadTexture : NoriSheet.paintTexture,
      shapeNoise: { chipChance: 0.018, bumpChance: 0.012 },
    });

    const cropX = options.cropX ?? 0;
    const cropY = options.cropY ?? 0;
    const cropWidth = options.cropWidth ?? NORI_WIDTH;
    const cropHeight = options.cropHeight ?? NORI_HEIGHT;
    const displayWidth = cropWidth * PIXEL;
    const displayHeight = cropHeight * PIXEL;

    super(scene, x, y, displayWidth, displayHeight, {
      ...options,
      visualVariation: false,
    });
    this.setCenteredHitbox(displayWidth, displayHeight);
    this.shadowEdgeScaleX = 1;
    this.shadowEdgeScaleY = 1;
    this.shadowEdgeDragScaleX = 1;
    this.shadowEdgeDragScaleY = 1;
    this.shadowCoreScaleX = 1;
    this.shadowCoreScaleY = 1;
    this.restShadowOffset = 0;
    this.ownWeightGrams = options.weightGrams
      ?? NoriSheet.getPieceWeightGrams(cropWidth, cropHeight, wholeWeightGrams);
    this.restDepth = 18;
    this.isFlat = true;
    this.softness = 0.05;
    this.footprintDepthFactor = 1;
    this.variantIndex = variantIndex;
    this.hasSpreadRice = hasSpreadRice;
    this.wholeWeightGrams = wholeWeightGrams;
    this.riceWeightGrams = options.riceWeightGrams ?? Math.max(0, wholeWeightGrams - NORI_WEIGHT_GRAMS);
    this.displayName = hasSpreadRice ? 'Rice on Nori' : 'Nori Sheet';
    this.stackCategory = 'nori';
    this.acceptedStackCategories = hasSpreadRice ? ['fish'] : ['rice'];
    this.maxStackedItems = hasSpreadRice ? 8 : 1;
    this.stackOffsetX = 0;
    this.stackOffsetY = hasSpreadRice ? -4 : -2;
    this.toppingRestOffsetY = -4;
    this.preserveStackChildRotation = hasSpreadRice;
    this.spreadableStackCategory = hasSpreadRice ? null : 'rice';
    this.spreadRequiresCoverage = true;
    this.spreadRequiredStrokes = 18;
    this.spreadStrokeDistance = 8;
    this.computedShadeDarkAlpha = 0.26;
    this.computedShadeLightAlpha = 0.1;
    this.computedShadeBottomCoverage = 0.18;
    this.riceSpreadCoverage = null;
    this.riceSpreadCoveredCells = 0;
    this.riceSpreadTargetCells = NoriSheet.getRiceSpreadTargetCellCount();
    this.riceSpreadTextureKey = null;
    this.riceSpreadOverlay = null;
    this.riceSpreadCompleted = false;

    CuttableObject.setupCuttable(this, textureKey, cropWidth, cropHeight, PIXEL, options);

    if (!options.skipInitialPiece && (cropX !== 0 || cropY !== 0)) {
      this.configureAsCutPiece({
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        visibleBounds: options.visibleBounds,
      }, options);
    }

    this.setScale(1, NORI_PERSPECTIVE_SQUASH);
    this.refreshCompositionShadow();
    this.applyRestingDepth();
  }

  createSpreadStackResult(rice) {
    if (rice?.stackCategory !== 'rice') {
      return null;
    }

    const result = new NoriSheet(this.scene, this.x, this.y, {
      hasSpreadRice: true,
      riceWeightGrams: rice.weightGrams,
      wholeWeightGrams: this.ownWeightGrams + rice.weightGrams,
      variant: this.variantIndex,
      visualVariation: this.getIngredientVisualVariation?.(),
    });

    result.setObjectRotation(this.rotation ?? 0);

    return result;
  }

  beginSpreadFeedback(position, rice) {
    if (this.hasSpreadRice || !rice) {
      return 0;
    }

    this.ensureRiceSpreadOverlay();

    if (this.riceSpreadOverlay) {
      this.bringToTop(this.riceSpreadOverlay);
    }

    rice.setAlpha?.(0.78);

    return this.paintRiceSpreadAt(position);
  }

  updateSpreadFeedback(position) {
    if (this.hasSpreadRice || !this.riceSpreadOverlay) {
      return null;
    }

    const positions = this.getRiceSpreadBrushPositions(position);
    let progress = this.getRiceSpreadCoverageProgress();

    positions.forEach((brushPosition) => {
      progress = Math.max(progress, this.paintRiceSpreadAt(brushPosition));
    });

    return progress >= RICE_SPREAD_COMPLETE_COVERAGE
      ? 1
      : progress / RICE_SPREAD_COMPLETE_COVERAGE;
  }

  completeSpreadFeedback() {
    this.riceSpreadCompleted = true;
  }

  finishSpreadFeedback() {
    if (this.riceSpreadCompleted) {
      return;
    }

    const rice = this.getSpreadIngredient?.();
    if (rice) {
      rice.setAlpha?.(1);
    }
  }

  ensureRiceSpreadOverlay() {
    if (this.riceSpreadOverlay || !this.scene?.textures) {
      return;
    }

    if (!this.riceSpreadCoverage) {
      this.riceSpreadCoverage = new Uint8Array(NORI_WIDTH * NORI_HEIGHT);
    }

    this.riceSpreadTextureKey = `nori-rice-spread-live-${riceSpreadTextureId}`;
    riceSpreadTextureId += 1;

    const texture = this.scene.textures.createCanvas(
      this.riceSpreadTextureKey,
      NORI_WIDTH,
      NORI_HEIGHT,
    );

    if (!texture) {
      return;
    }

    const overlay = this.scene.add.image(0, 0, this.riceSpreadTextureKey);
    const piece = this.pieces?.[0] ?? {
      cropX: 0,
      cropY: 0,
      cropWidth: NORI_WIDTH,
      cropHeight: NORI_HEIGHT,
    };
    const visibleBounds = piece.visibleBounds ?? {
      left: piece.cropX,
      right: piece.cropX + piece.cropWidth,
      top: piece.cropY,
      bottom: piece.cropY + piece.cropHeight,
    };
    const visibleWidth = (visibleBounds.right - visibleBounds.left) * PIXEL;
    const visibleHeight = (visibleBounds.bottom - visibleBounds.top) * PIXEL;
    const visibleLeft = (visibleBounds.left - this.anchorTextureX) * PIXEL;
    const visibleTop = (visibleBounds.top - this.anchorTextureY) * PIXEL;

    overlay.setOrigin(0.5);
    overlay.setCrop(piece.cropX, piece.cropY, piece.cropWidth, piece.cropHeight);
    overlay.setScale(PIXEL);
    overlay.setPosition(
      (NORI_WIDTH / 2 - this.anchorTextureX) * PIXEL,
      (NORI_HEIGHT / 2 - this.anchorTextureY) * PIXEL,
    );
    overlay.compositionWidth = visibleWidth;
    overlay.compositionHeight = visibleHeight;
    overlay.compositionOffsetX = visibleLeft + visibleWidth / 2 - overlay.x;
    overlay.compositionOffsetY = visibleTop + visibleHeight / 2 - overlay.y;
    overlay.excludeFromComputedShade = true;
    overlay.excludeFromCompositionShadow = true;

    this.riceSpreadOverlay = overlay;
    this.addDraggablePart(overlay);
    this.redrawRiceSpreadTexture();
  }

  getRiceSpreadBrushPositions(position) {
    if (!this.spreadUsesTouch) {
      return position ? [position] : [];
    }

    const touches = this.getActiveTouchPointers?.() ?? [];

    if (touches.length >= 2) {
      return touches.map((touch) => ({ x: touch.x, y: touch.y }));
    }

    return position ? [position] : [];
  }

  paintRiceSpreadAt(worldPosition) {
    const point = this.worldToRiceSpreadTexturePoint(worldPosition);

    if (!point) {
      return this.getRiceSpreadCompletionProgress();
    }

    this.paintRiceSpreadBrush(point.x, point.y);
    this.redrawRiceSpreadTexture();

    return this.getRiceSpreadCompletionProgress();
  }

  worldToRiceSpreadTexturePoint(worldPosition) {
    if (!worldPosition || !this.worldToCuttableLocalPoint) {
      return null;
    }

    const local = this.worldToCuttableLocalPoint(worldPosition);

    return {
      x: Math.round(local.x / PIXEL + this.anchorTextureX),
      y: Math.round(local.y / PIXEL + this.anchorTextureY),
    };
  }

  paintRiceSpreadBrush(centerX, centerY) {
    if (!this.riceSpreadCoverage) {
      this.riceSpreadCoverage = new Uint8Array(NORI_WIDTH * NORI_HEIGHT);
    }

    const radiusX = 6;
    const radiusY = 5;
    const left = Math.floor(centerX - radiusX);
    const right = Math.ceil(centerX + radiusX);
    const top = Math.floor(centerY - radiusY);
    const bottom = Math.ceil(centerY + radiusY);

    for (let y = top; y <= bottom; y += 1) {
      for (let x = left; x <= right; x += 1) {
        if (!NoriSheet.isRiceSpreadTargetCell(x, y)) {
          continue;
        }

        const nx = (x - centerX) / radiusX;
        const ny = (y - centerY) / radiusY;

        if (nx * nx + ny * ny > 1) {
          continue;
        }

        const index = y * NORI_WIDTH + x;

        if (!this.riceSpreadCoverage[index]) {
          this.riceSpreadCoverage[index] = 1;
          this.riceSpreadCoveredCells += 1;
        }
      }
    }
  }

  redrawRiceSpreadTexture() {
    if (!this.riceSpreadTextureKey || !this.scene?.textures?.exists(this.riceSpreadTextureKey)) {
      return;
    }

    const texture = this.scene.textures.get(this.riceSpreadTextureKey);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, NORI_WIDTH, NORI_HEIGHT);

    if (!this.riceSpreadCoverage) {
      texture.refresh();
      return;
    }

    for (let y = RICE_SPREAD_TARGET.top; y < RICE_SPREAD_TARGET.bottom; y += 1) {
      for (let x = RICE_SPREAD_TARGET.left; x < RICE_SPREAD_TARGET.right; x += 1) {
        if (!this.riceSpreadCoverage[y * NORI_WIDTH + x]) {
          continue;
        }

        const hash = NoriSheet.hashSpreadCell(x, y, this.variantIndex);
        const hasOpenNeighbor = !NoriSheet.isRiceSpreadTargetCell(x - 1, y)
          || !NoriSheet.isRiceSpreadTargetCell(x + 1, y)
          || !NoriSheet.isRiceSpreadTargetCell(x, y - 1)
          || !NoriSheet.isRiceSpreadTargetCell(x, y + 1)
          || !this.riceSpreadCoverage[y * NORI_WIDTH + x - 1]
          || !this.riceSpreadCoverage[y * NORI_WIDTH + x + 1]
          || !this.riceSpreadCoverage[(y - 1) * NORI_WIDTH + x]
          || !this.riceSpreadCoverage[(y + 1) * NORI_WIDTH + x];
        const color = NoriSheet.getRiceSpreadCellColor(hash, hasOpenNeighbor);

        context.fillStyle = toHexColor(color);
        context.fillRect(x, y, 1, 1);

        if (hash % 17 === 0 && x + 1 < RICE_SPREAD_TARGET.right) {
          context.fillStyle = toHexColor(0xcfc3ac);
          context.fillRect(x + 1, y, 1, 1);
        }
      }
    }

    context.fillStyle = 'rgba(207,195,172,0.5)';
    for (let x = RICE_SPREAD_TARGET.left; x < RICE_SPREAD_TARGET.right; x += 1) {
      for (let y = RICE_SPREAD_TARGET.top; y < RICE_SPREAD_TARGET.bottom; y += 1) {
        if (this.riceSpreadCoverage[y * NORI_WIDTH + x]
          && !this.riceSpreadCoverage[(y + 1) * NORI_WIDTH + x]
          && y + 1 < RICE_SPREAD_TARGET.bottom) {
          context.fillRect(x, y, 1, 1);
        }
      }
    }

    texture.refresh();
  }

  getRiceSpreadCoverageProgress() {
    if (!this.riceSpreadTargetCells) {
      return 0;
    }

    return this.riceSpreadCoveredCells / this.riceSpreadTargetCells;
  }

  getRiceSpreadCompletionProgress() {
    return this.getRiceSpreadCoverageProgress() >= RICE_SPREAD_COMPLETE_COVERAGE
      ? 1
      : this.getRiceSpreadCoverageProgress() / RICE_SPREAD_COMPLETE_COVERAGE;
  }

  getStackPlacementOffset(child, drop = {}) {
    if (!this.hasSpreadRice) {
      return null;
    }

    const halfWidth = (NORI_WIDTH * PIXEL) / 2;
    const halfHeight = (NORI_HEIGHT * PIXEL) / 2;
    const dropX = drop.x ?? child?.x ?? this.x;
    const dropY = drop.y ?? child?.y ?? this.y;
    const localDrop = this.worldToLocalPoint({ x: dropX, y: dropY });
    const localX = localDrop.x;
    const localY = localDrop.y;
    const childRect = child?.getWorldHitboxRect?.(dropX, dropY);
    const localHalfSize = childRect
      ? this.getWorldRectLocalHalfSize(childRect)
      : { x: 0, y: 0 };
    const childHalfW = localHalfSize.x;
    const childHalfH = localHalfSize.y;
    const clampedX = clamp(localX, -halfWidth + childHalfW, halfWidth - childHalfW);
    const clampedY = clamp(localY, -halfHeight + childHalfH, halfHeight - childHalfH);

    return { x: clampedX, y: clampedY + this.toppingRestOffsetY };
  }

  getWorldRectLocalHalfSize(rect) {
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    const points = [
      { x: rect.left, y: rect.top },
      { x: rect.right, y: rect.top },
      { x: rect.right, y: rect.bottom },
      { x: rect.left, y: rect.bottom },
    ].map((point) => this.worldVectorToLocal({
      x: point.x - centerX,
      y: point.y - centerY,
    }));

    return {
      x: Math.max(...points.map((point) => Math.abs(point.x))),
      y: Math.max(...points.map((point) => Math.abs(point.y))),
    };
  }

  getRollCoverage() {
    if (!this.hasSpreadRice || !this.stackChildren?.length) {
      return { fraction: 0, covered: false, segments: [] };
    }

    const riceLeftWorld = this.localToWorldPoint({
      x: (RICE_SPREAD_TARGET.left - NORI_WIDTH / 2) * PIXEL,
      y: 0,
    });
    const riceRightWorld = this.localToWorldPoint({
      x: (RICE_SPREAD_TARGET.right - NORI_WIDTH / 2) * PIXEL,
      y: 0,
    });
    const sheetLeft = Math.min(riceLeftWorld.x, riceRightWorld.x);
    const sheetRight = Math.max(riceLeftWorld.x, riceRightWorld.x);
    const intervals = [];

    this.stackChildren.forEach((child) => {
      const rect = child.getWorldHitboxRect?.();

      if (!rect) {
        return;
      }

      const left = Math.max(sheetLeft, rect.x);
      const right = Math.min(sheetRight, rect.x + rect.width);

      if (right > left) {
        intervals.push([left, right]);
      }
    });

    intervals.sort((a, b) => a[0] - b[0]);

    const merged = [];
    intervals.forEach(([l, r]) => {
      const last = merged[merged.length - 1];
      if (last && l <= last[1]) {
        last[1] = Math.max(last[1], r);
      } else {
        merged.push([l, r]);
      }
    });

    const coveredLength = merged.reduce((sum, [l, r]) => sum + (r - l), 0);
    const sheetLength = sheetRight - sheetLeft;
    const fraction = sheetLength > 0 ? coveredLength / sheetLength : 0;

    return {
      fraction,
      covered: fraction >= 0.999,
      segments: merged.map(([l, r]) => ({ left: l, right: r })),
    };
  }

  getRollFillingChildren() {
    return (this.stackChildren ?? []).filter((child) => child?.stackCategory === 'fish');
  }

  getRollFillingGroups() {
    const groups = new Map();

    this.getRollFillingChildren().forEach((child) => {
      const key = child.fishSubtype
        ? `${child.fishType ?? 'fish'}:${child.fishSubtype}`
        : child.fishType ?? child.displayName ?? child.constructor?.name ?? 'filling';
      const existing = groups.get(key);

      if (existing) {
        existing.children.push(child);
        return;
      }

      groups.set(key, {
        key,
        displayName: child.displayName ?? 'filling',
        children: [child],
      });
    });

    return [...groups.values()];
  }

  hasValidRollFillingPlacement() {
    const groups = this.getRollFillingGroups();

    return groups.length > 0 && groups.every((group) => this.isRollFillingGroupCentered(group).valid);
  }

  getRollFillingPlacementRejectionReason() {
    if (!this.hasSpreadRice) {
      return 'nori needs spread rice';
    }

    const fillings = this.getRollFillingGroups();

    if (!fillings.length) {
      return 'roll needs filling';
    }

    const invalidFilling = fillings.find((group) => !this.isRollFillingGroupCentered(group).valid);

    if (!invalidFilling) {
      return 'stack OK';
    }

    return `${invalidFilling.displayName ?? 'filling'} must run through the center without touching the outer bands`;
  }

  getRollFillingDebugLines() {
    if (!this.hasSpreadRice) {
      return ['spread rice: no'];
    }

    const fillings = this.getRollFillingGroups();

    if (!fillings.length) {
      return ['spread rice: yes', 'fillings: 0'];
    }

    return [
      'spread rice: yes',
      `fillings: ${fillings.length}`,
      ...fillings.map((group) => {
        const result = this.isRollFillingGroupCentered(group);
        const widthPercent = Math.round(result.widthCoverage * 100);
        const edgeText = result.touchesEdgeBand ? 'edge band hit' : 'center band only';
        const status = result.valid ? 'OK' : 'blocked';
        const countText = group.children.length > 1 ? ` x${group.children.length}` : '';

        return `${group.displayName}${countText}: ${widthPercent}% width, ${edgeText}, ${status}`;
      }),
    ];
  }

  isRollFillingGroupCentered(group) {
    const children = group?.children ?? [];

    if (!children.length) {
      return { valid: false, widthCoverage: 0, touchesEdgeBand: false };
    }

    const targetWidth = RICE_SPREAD_TARGET.right - RICE_SPREAD_TARGET.left;
    const targetHeight = RICE_SPREAD_TARGET.bottom - RICE_SPREAD_TARGET.top;
    const edgeBandHeight = targetHeight * ROLL_FILLING_EDGE_BAND_FRACTION;
    const centerTop = RICE_SPREAD_TARGET.top + edgeBandHeight;
    const centerBottom = RICE_SPREAD_TARGET.bottom - edgeBandHeight;
    const requiredCoveredRows = Math.ceil(targetHeight * ROLL_FILLING_REQUIRED_COLUMN_COVERAGE);
    const childBounds = new Map();
    let coveredColumns = 0;
    let touchesEdgeBand = false;

    children.forEach((child) => {
      childBounds.set(child, child.getLocalVisualBounds?.());
    });

    for (let x = RICE_SPREAD_TARGET.left; x < RICE_SPREAD_TARGET.right; x += 1) {
      let centerCoveredRows = 0;

      for (let y = RICE_SPREAD_TARGET.top; y < RICE_SPREAD_TARGET.bottom; y += 1) {
        const covered = children.some((child) => {
          const bounds = childBounds.get(child);

          if (!bounds || bounds.width <= 0 || bounds.height <= 0 || !child.worldToLocalPoint) {
            return false;
          }

          const point = this.textureCellToChildLocalPoint(child, x + 0.5, y + 0.5);

          return Phaser.Geom.Rectangle.Contains(bounds, point.x, point.y);
        });

        if (!covered) {
          continue;
        }

        if (y + 0.5 < centerTop || y + 0.5 >= centerBottom) {
          touchesEdgeBand = true;
        } else {
          centerCoveredRows += 1;
        }
      }

      if (centerCoveredRows >= requiredCoveredRows) {
        coveredColumns += 1;
      }
    }

    const widthCoverage = targetWidth > 0 ? coveredColumns / targetWidth : 0;

    return {
      valid: widthCoverage >= ROLL_FILLING_REQUIRED_WIDTH_COVERAGE && !touchesEdgeBand,
      widthCoverage,
      touchesEdgeBand,
    };
  }

  textureCellToChildLocalPoint(child, textureX, textureY) {
    const worldPoint = this.localToWorldPoint({
      x: (textureX - this.anchorTextureX) * PIXEL,
      y: (textureY - this.anchorTextureY) * PIXEL,
    });

    return child.worldToLocalPoint(worldPoint);
  }

  getCuttableReplacementOptions() {
    return {
      hasSpreadRice: this.hasSpreadRice,
      riceWeightGrams: this.riceWeightGrams,
      wholeWeightGrams: this.wholeWeightGrams,
    };
  }

  destroy(fromScene) {
    const textureKey = this.riceSpreadTextureKey;

    super.destroy(fromScene);

    if (textureKey && this.scene?.textures?.exists(textureKey)) {
      this.scene.textures.remove(textureKey);
    }
  }

  static getPieceWeightGrams(cropWidth, cropHeight, wholeWeightGrams = NORI_WEIGHT_GRAMS) {
    const wholeArea = NORI_WIDTH * NORI_HEIGHT;
    const pieceArea = cropWidth * cropHeight;

    return (pieceArea / wholeArea) * wholeWeightGrams;
  }

  static isRiceSpreadTargetCell(x, y) {
    return x >= RICE_SPREAD_TARGET.left
      && x < RICE_SPREAD_TARGET.right
      && y >= RICE_SPREAD_TARGET.top
      && y < RICE_SPREAD_TARGET.bottom;
  }

  static getRiceSpreadTargetCellCount() {
    return (RICE_SPREAD_TARGET.right - RICE_SPREAD_TARGET.left)
      * (RICE_SPREAD_TARGET.bottom - RICE_SPREAD_TARGET.top);
  }

  static hashSpreadCell(x, y, seed = 0) {
    let value = (x + 17) * 374761393 + (y + 23) * 668265263 + seed * 2246822519;

    value = Math.imul(value ^ (value >>> 13), 1274126177);
    return (value ^ (value >>> 16)) >>> 0;
  }

  static getRiceSpreadCellColor(hash, isEdge = false) {
    if (isEdge) {
      return hash % 5 === 0 ? 0xd6cab2 : 0xe6ddc7;
    }

    if (hash % 13 === 0) {
      return 0xfff8e8;
    }

    if (hash % 7 === 0) {
      return 0xd6cab2;
    }

    return hash % 5 === 0 ? 0xeee5cf : 0xf6f0df;
  }

  static paintTexture(context, rng) {
    const jitter = (range) => Math.floor(rng() * (range * 2 + 1)) - range;
    const chance = (probability) => rng() < probability;
    const fillSpeckles = (color, count, minX, minY, maxX, maxY, widthChance = 0.3, heightChance = 0.08) => {
      context.fillStyle = toHexColor(color);

      for (let i = 0; i < count; i += 1) {
        if (!chance(0.86)) {
          continue;
        }

        const x = minX + Math.floor(rng() * (maxX - minX + 1));
        const y = minY + Math.floor(rng() * (maxY - minY + 1));

        context.fillRect(
          x,
          y,
          chance(widthChance) ? 4 + Math.floor(rng() * 3) : 2,
          chance(heightChance) ? 2 + Math.floor(rng() * 2) : 2,
        );

        if (chance(0.32)) {
          context.fillRect(x + jitter(1), y + 1 + jitter(1), 3 + Math.floor(rng() * 3), 2);
        }
      }
    };

    context.fillStyle = toHexColor(0x17342b);
    context.fillRect(5, 3, 48, 2);
    context.fillRect(3, 5, 52, 31);
    context.fillRect(6, 36, 46, 2);

    context.fillStyle = toHexColor(0x21483b);
    context.fillRect(5, 6, 48, 28);
    context.fillRect(7, 4, 44, 2);
    context.fillRect(7, 34, 44, 2);

    context.fillStyle = toHexColor(0x1b3c32);
    for (let y = 7; y < 34; y += 3) {
      const offset = jitter(2);
      context.fillRect(6 + offset, y + jitter(1), 45 - Math.abs(offset), 1);
    }

    context.fillStyle = toHexColor(0x2b5a49);
    for (let i = 0; i < 18; i += 1) {
      const x = 7 + Math.floor(rng() * 42);
      const y = 7 + Math.floor(rng() * 25);
      const width = 7 + Math.floor(rng() * 12);

      context.fillRect(x, y, Math.min(width, 52 - x), 2);
    }

    context.fillStyle = toHexColor(0x153028);
    for (let i = 0; i < 14; i += 1) {
      const x = 6 + Math.floor(rng() * 44);
      const y = 8 + Math.floor(rng() * 24);
      const width = 6 + Math.floor(rng() * 10);

      context.fillRect(x, y, Math.min(width, 53 - x), 2);
    }

    context.fillStyle = toHexColor(0x10251f);
    context.fillRect(5, 5, 48, 1);
    context.fillRect(4, 7, 1, 27);
    context.fillRect(53, 7, 1, 27);
    context.fillRect(7, 35, 44, 1);

    context.fillStyle = toHexColor(0x367057);
    for (let y = 8; y < 33; y += 4) {
      if (chance(0.8)) {
        context.fillRect(7 + jitter(1), y + jitter(1), 12 + Math.floor(rng() * 12), 2);
        context.fillRect(30 + jitter(2), y + jitter(1), 10 + Math.floor(rng() * 11), 2);
      }
    }

    context.fillStyle = toHexColor(0x1b3d31);
    for (let x = 9; x < 51; x += 5) {
      if (chance(0.75)) {
        const y = 8 + Math.floor(rng() * 4);

        context.fillRect(x + jitter(1), y, 2, 8 + Math.floor(rng() * 10));
      }
    }

    fillSpeckles(0x4b8468, 22, 7, 6, 49, 33, 0.48, 0.2);
    fillSpeckles(0x356550, 28, 6, 7, 49, 34, 0.6, 0.22);
    fillSpeckles(0x10251f, 22, 6, 6, 50, 34, 0.4, 0.2);
    fillSpeckles(0x265140, 30, 7, 7, 49, 33, 0.7, 0.26);
  }

  static paintRiceSpreadTexture(context, rng) {
    const chance = (probability) => rng() < probability;

    NoriSheet.paintTexture(context, rng);

    for (let y = RICE_SPREAD_TARGET.top; y < RICE_SPREAD_TARGET.bottom; y += 1) {
      for (let x = RICE_SPREAD_TARGET.left; x < RICE_SPREAD_TARGET.right; x += 1) {
        const isEdge = x <= RICE_SPREAD_TARGET.left + 1
          || x >= RICE_SPREAD_TARGET.right - 2
          || y <= RICE_SPREAD_TARGET.top + 1
          || y >= RICE_SPREAD_TARGET.bottom - 2;
        const hash = NoriSheet.hashSpreadCell(x, y, 0);

        context.fillStyle = toHexColor(NoriSheet.getRiceSpreadCellColor(hash, isEdge));
        context.fillRect(x, y, 1, 1);

        if (!isEdge && hash % 17 === 0 && x + 1 < RICE_SPREAD_TARGET.right - 1) {
          context.fillStyle = toHexColor(0xcfc3ac);
          context.fillRect(x + 1, y, 1, 1);
        }
      }
    }

    context.fillStyle = toHexColor(0xfff8e8);
    context.fillRect(9, 8, 14, 2);
    context.fillRect(29, 8, 16, 2);
    context.fillRect(8, 15, 20, 2);
    context.fillRect(33, 17, 17, 2);
    context.fillRect(10, 25, 17, 2);
    context.fillRect(31, 28, 14, 2);

    context.fillStyle = toHexColor(0xcfc3ac);
    for (let i = 0; i < 36; i += 1) {
      if (!chance(0.7)) {
        continue;
      }

      const x = RICE_SPREAD_TARGET.left + 2 + Math.floor(rng() * (RICE_SPREAD_TARGET.right - RICE_SPREAD_TARGET.left - 4));
      const y = RICE_SPREAD_TARGET.top + 2 + Math.floor(rng() * (RICE_SPREAD_TARGET.bottom - RICE_SPREAD_TARGET.top - 4));

      context.fillRect(x, y, chance(0.4) ? 2 : 1, 1);
    }
  }
}

Object.getOwnPropertyNames(CuttableObject.prototype).forEach((name) => {
  if (name !== 'constructor') {
    NoriSheet.prototype[name] = CuttableObject.prototype[name];
  }
});
