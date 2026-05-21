import { RotatableObject } from './RotatableObject.js';

let computedShadeTextureId = 0;

export class IngredientObject extends RotatableObject {
  constructor(scene, x, y, width, height) {
    super(scene, x, y, width, height);

    this.isIngredient = true;
    this.softness = 0.9;
    this.restShadowOffset = 12;
    this.dragShadowOffset = 18;
    this.computedShadeParts = new Map();
    this.computedShadeDarkAlpha = 0.68;
    this.computedShadeLightAlpha = 0.16;
    this.computedShadePixelSize = 2;
    this.computedShadeBottomCoverage = 0.25;
    this.computedShadeDarken = 0.5;
  }

  addDraggablePart(part) {
    const addedPart = super.addDraggablePart(part);

    if (!part.excludeFromComputedShade) {
      this.addComputedShadePart(addedPart);
    }

    return addedPart;
  }

  setObjectRotation(angle) {
    super.setObjectRotation(angle);
    this.refreshComputedShade();

    return this;
  }

  addComputedShadePart(part) {
    if (!this.computedShadeParts || this.computedShadeParts.has(part)) {
      return null;
    }

    const shade = this.scene.add.image(part.x, part.y, part.texture.key);

    shade.setOrigin(part.originX ?? 0.5, part.originY ?? 0.5);
    shade.setScale(part.scaleX ?? 1, part.scaleY ?? 1);
    shade.setRotation(part.rotation ?? 0);
    shade.setAlpha(0);
    shade.excludeFromComputedShade = true;
    shade.excludeFromCompositionShadow = true;
    shade.computedShadeSourcePart = part;

    this.copyComputedShadeCrop(part, shade);
    this.computedShadeParts.set(part, shade);
    super.addDraggablePart(shade);
    this.syncComputedShadePart(part, shade);
    this.refreshComputedShade();

    return shade;
  }

  refreshComputedShade() {
    if (!this.computedShadeParts?.size) {
      return this;
    }

    const profile = this.getComputedShadeProfile();

    if (!profile) {
      return this;
    }

    this.computedShadeParts.forEach((shade, part) => {
      if (!part.active || !shade.active) {
        return;
      }

      this.updateComputedShadePart(part, shade, profile);
    });

    return this;
  }

  getComputedShadeProfile() {
    let minY = Infinity;
    let maxY = -Infinity;

    this.computedShadeParts.forEach((_shade, part) => {
      const sourceData = this.getPartShadowSourceData(part);

      if (!sourceData) {
        return;
      }

      this.forEachVisibleSourcePixel(part, sourceData, (_x, _y, screenY) => {
        minY = Math.min(minY, screenY);
        maxY = Math.max(maxY, screenY);
      });
    });

    if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
      return null;
    }

    return {
      minY,
      maxY,
      spanY: Math.max(1, maxY - minY),
    };
  }

  updateComputedShadePart(part, shade, profile) {
    const sourceData = this.getPartShadowSourceData(part);

    if (!sourceData) {
      shade.setAlpha(0);
      return;
    }

    const {
      frameWidth,
      frameHeight,
      cropX,
      cropY,
    } = sourceData;
    const key = `computed-ingredient-shade-${computedShadeTextureId}`;
    const texture = this.scene.textures.createCanvas(key, frameWidth, frameHeight);

    computedShadeTextureId += 1;

    if (!texture) {
      shade.setAlpha(0);
      return;
    }

    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, frameWidth, frameHeight);

    this.paintComputedShadeBlocks(context, sourceData, cropX, cropY, profile);

    texture.refresh();
    this.replaceComputedShadeTexture(shade, key);
    this.copyComputedShadeCrop(part, shade);
    this.syncComputedShadePart(part, shade);
    shade.setAlpha(1);
  }

  paintComputedShadeBlocks(context, sourceData, cropX, cropY, profile) {
    const blockSize = Math.max(1, this.computedShadePixelSize);

    for (let blockY = 0; blockY < sourceData.sourceHeight; blockY += blockSize) {
      for (let blockX = 0; blockX < sourceData.sourceWidth; blockX += blockSize) {
        const block = this.getComputedShadeBlock(sourceData, blockX, blockY, blockSize);

        if (!block) {
          continue;
        }

        const shadeProgress = (block.screenY - profile.minY) / profile.spanY;
        const lightAlpha = Math.max(0, (0.28 - shadeProgress) / 0.28) * this.computedShadeLightAlpha;
        const darkStart = 1 - this.computedShadeBottomCoverage;
        const darkProgress = Math.max(0, Math.min(1, (shadeProgress - darkStart) / this.computedShadeBottomCoverage));
        const darkAlpha = darkProgress * this.computedShadeDarkAlpha;

        if (lightAlpha > darkAlpha && lightAlpha > 0.015) {
          context.fillStyle = `rgba(255,255,255,${lightAlpha.toFixed(3)})`;
          context.fillRect(cropX + blockX, cropY + blockY, block.width, block.height);
          continue;
        }

        if (darkAlpha > 0.015) {
          const shadeColor = this.getDarkenedComputedShadeColor(block.color);

          context.fillStyle = `rgba(${shadeColor.r},${shadeColor.g},${shadeColor.b},${darkAlpha.toFixed(3)})`;
          context.fillRect(cropX + blockX, cropY + blockY, block.width, block.height);
        }
      }
    }
  }

  getComputedShadeBlock(sourceData, blockX, blockY, blockSize) {
    const {
      imageData,
      sourceWidth,
      sourceHeight,
    } = sourceData;
    const width = Math.min(blockSize, sourceWidth - blockX);
    const height = Math.min(blockSize, sourceHeight - blockY);
    let screenYTotal = 0;
    let redTotal = 0;
    let greenTotal = 0;
    let blueTotal = 0;
    let visiblePixels = 0;

    for (let y = blockY; y < blockY + height; y += 1) {
      for (let x = blockX; x < blockX + width; x += 1) {
        const pixelIndex = (y * sourceWidth + x) * 4;
        const alpha = imageData.data[pixelIndex + 3];

        if (alpha === 0) {
          continue;
        }

        screenYTotal += this.getComputedShadeScreenY(sourceData, x, y);
        redTotal += imageData.data[pixelIndex];
        greenTotal += imageData.data[pixelIndex + 1];
        blueTotal += imageData.data[pixelIndex + 2];
        visiblePixels += 1;
      }
    }

    if (visiblePixels === 0) {
      return null;
    }

    return {
      width,
      height,
      screenY: screenYTotal / visiblePixels,
      color: {
        r: redTotal / visiblePixels,
        g: greenTotal / visiblePixels,
        b: blueTotal / visiblePixels,
      },
    };
  }

  getDarkenedComputedShadeColor(color) {
    return {
      r: Math.round(color.r * this.computedShadeDarken),
      g: Math.round(color.g * this.computedShadeDarken),
      b: Math.round(color.b * this.computedShadeDarken),
    };
  }

  forEachVisibleSourcePixel(part, sourceData, callback) {
    const {
      imageData,
      sourceWidth,
      sourceHeight,
      cropX,
      cropY,
      frameWidth,
      frameHeight,
    } = sourceData;
    const originX = part.originX ?? 0.5;
    const originY = part.originY ?? 0.5;
    const scaleX = part.scaleX ?? 1;
    const scaleY = part.scaleY ?? 1;
    const partRotation = part.rotation ?? 0;
    const objectRotation = this.rotation ?? 0;
    const partSin = Math.sin(partRotation);
    const partCos = Math.cos(partRotation);
    const objectSin = Math.sin(objectRotation);
    const objectCos = Math.cos(objectRotation);

    for (let y = 0; y < sourceHeight; y += 1) {
      for (let x = 0; x < sourceWidth; x += 1) {
        const alpha = imageData.data[(y * sourceWidth + x) * 4 + 3];

        if (alpha === 0) {
          continue;
        }

        const screenY = this.getComputedShadeScreenY(sourceData, x, y, {
          part,
          originX,
          originY,
          scaleX,
          scaleY,
          partSin,
          partCos,
          objectSin,
          objectCos,
        });

        callback(x, y, screenY);
      }
    }
  }

  getComputedShadeScreenY(sourceData, x, y, transforms = null) {
    const {
      cropX,
      cropY,
      frameWidth,
      frameHeight,
    } = sourceData;
    const part = transforms?.part ?? sourceData.part;
    const originX = transforms?.originX ?? part?.originX ?? 0.5;
    const originY = transforms?.originY ?? part?.originY ?? 0.5;
    const scaleX = transforms?.scaleX ?? part?.scaleX ?? 1;
    const scaleY = transforms?.scaleY ?? part?.scaleY ?? 1;
    const partRotation = part?.rotation ?? 0;
    const objectRotation = this.rotation ?? 0;
    const partSin = transforms?.partSin ?? Math.sin(partRotation);
    const partCos = transforms?.partCos ?? Math.cos(partRotation);
    const objectSin = transforms?.objectSin ?? Math.sin(objectRotation);
    const objectCos = transforms?.objectCos ?? Math.cos(objectRotation);
    const localTextureX = cropX + x + 0.5 - frameWidth * originX;
    const localTextureY = cropY + y + 0.5 - frameHeight * originY;
    const localPartX = localTextureX * scaleX;
    const localPartY = localTextureY * scaleY;
    const objectX = (part?.x ?? 0) + localPartX * partCos - localPartY * partSin;
    const objectY = (part?.y ?? 0) + localPartX * partSin + localPartY * partCos;

    return objectX * objectSin + objectY * objectCos;
  }

  syncComputedShadePart(part, shade) {
    const basePosition = this.draggablePartBasePositions?.get(part) ?? { x: part.x, y: part.y };
    const baseScale = this.draggablePartBaseScales?.get(part) ?? { scaleX: part.scaleX, scaleY: part.scaleY };

    shade.setOrigin(part.originX ?? 0.5, part.originY ?? 0.5);
    shade.setPosition(part.x, part.y);
    shade.setScale(part.scaleX ?? 1, part.scaleY ?? 1);
    shade.setRotation(part.rotation ?? 0);

    this.draggablePartBasePositions?.set(shade, {
      x: basePosition.x,
      y: basePosition.y,
    });
    this.draggablePartBaseScales?.set(shade, {
      scaleX: baseScale.scaleX,
      scaleY: baseScale.scaleY,
    });
  }

  copyComputedShadeCrop(part, shade) {
    if (part.isCropped && part._crop) {
      shade.setCrop(part._crop.cx, part._crop.cy, part._crop.cw, part._crop.ch);
      return;
    }

    shade.setCrop();
  }

  replaceComputedShadeTexture(shade, key) {
    const previousKey = shade.computedShadeTextureKey;

    shade.setTexture(key);
    shade.computedShadeTextureKey = key;

    if (previousKey && previousKey !== key && this.scene.textures.exists(previousKey)) {
      this.scene.textures.remove(previousKey);
    }
  }

  clearComputedShadeParts() {
    if (!this.computedShadeParts) {
      return;
    }

    this.computedShadeParts.forEach((shade) => {
      const key = shade.computedShadeTextureKey;

      shade.destroy();

      if (key && this.scene.textures.exists(key)) {
        this.scene.textures.remove(key);
      }
    });

    this.computedShadeParts.clear();
  }

  destroy(fromScene) {
    this.clearComputedShadeParts();
    super.destroy(fromScene);
  }
}
