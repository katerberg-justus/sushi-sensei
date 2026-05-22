import * as Phaser from 'phaser/dist/phaser.esm.js';
import { COLORS } from '../game/constants.js';
import { IngredientObject } from './IngredientObject.js';
import { resolveVariantTexture, toHexColor } from './ProceduralTexture.js';

const PIXEL = 2.25;
const RICE_BALL_BASE_KEY = 'rice-ball-pixel';
const RICE_BALL_SHADOW_KEY = 'rice-ball-shadow-pixel';
const RICE_BALL_VARIANT_POOL = 6;
const RICE_BALL_WIDTH = 30;
const RICE_BALL_HEIGHT = 26;

export class RiceBall extends IngredientObject {
  constructor(scene, x, y, options = {}) {
    const { textureKey, variantIndex } = resolveVariantTexture(scene, RICE_BALL_BASE_KEY, options, {
      width: RICE_BALL_WIDTH,
      height: RICE_BALL_HEIGHT,
      pool: RICE_BALL_VARIANT_POOL,
      paint: RiceBall.paintTexture,
    });
    RiceBall.createShadowTexture(scene);

    super(scene, x, y, 68, 58);
    this.setCenteredHitbox(68, 58, 0, 4);
    this.variantIndex = variantIndex;

    const shadowEdge = scene.add.image(0, 0, RICE_BALL_SHADOW_KEY);
    shadowEdge.setScale(PIXEL * this.shadowEdgeScaleX, PIXEL * this.shadowEdgeScaleY);
    shadowEdge.setOrigin(0.5);
    shadowEdge.setTint(0x9a8064);

    const shadowCore = scene.add.image(0, 0, RICE_BALL_SHADOW_KEY);
    shadowCore.setScale(PIXEL * this.shadowCoreScaleX, PIXEL * this.shadowCoreScaleY);
    shadowCore.setOrigin(0.5);
    shadowCore.setTint(0x6f5d48);

    const shadow = scene.add.container(0, this.restShadowOffset, [shadowEdge, shadowCore]);
    shadow.compositionOffsetX = 0;
    shadow.compositionOffsetY = 14;
    shadow.setPixelBlurProgress = (progress) => {
      shadowEdge.setAlpha(Phaser.Math.Linear(0, this.shadowEdgeAlpha, progress));
      shadowCore.setAlpha(Phaser.Math.Linear(0, this.shadowCoreAlpha, progress));
      shadowEdge.setScale(
        Phaser.Math.Linear(PIXEL * this.shadowEdgeScaleX, PIXEL * this.shadowEdgeDragScaleX, progress),
        Phaser.Math.Linear(PIXEL * this.shadowEdgeScaleY, PIXEL * this.shadowEdgeDragScaleY, progress),
      );
    };
    shadow.setPixelBlurProgress(0);
    this.setPixelShadow(shadow);

    this.sprite = scene.add.image(0, 0, textureKey);
    this.sprite.setScale(PIXEL);
    this.sprite.setOrigin(0.5);

    this.addDraggablePart(this.sprite);
    this.setDepth(this.restDepth);
  }

  static paintTexture(context, rng) {
    const jitter = (range) => Math.floor(rng() * (range * 2 + 1)) - range;

    context.fillStyle = toHexColor(COLORS.riceStroke);
    context.fillRect(10, 4, 10, 3);
    context.fillRect(7, 6, 17, 3);
    context.fillRect(5, 8, 21, 4);
    context.fillRect(3, 11, 25, 7);
    context.fillRect(4, 18, 23, 3);
    context.fillRect(7, 21, 17, 2);
    context.fillRect(11, 23, 9, 1);

    context.fillRect(8, 5, 13, 3);
    context.fillRect(6, 8, 18, 4);
    context.fillRect(5, 12, 20, 6);
    context.fillRect(7, 18, 15, 3);

    context.fillStyle = toHexColor(COLORS.riceWhite);
    context.fillRect(9, 6, 11, 3);
    context.fillRect(7, 9, 17, 5);
    context.fillRect(6, 13, 18, 5);
    context.fillRect(8, 18, 13, 2);

    context.fillStyle = toHexColor(0xf9f4e6);
    context.fillRect(10, 6, 8, 2);
    context.fillRect(8, 9, 13, 4);
    context.fillRect(7, 13, 14, 4);

    context.fillStyle = toHexColor(COLORS.riceWhite);
    context.fillRect(11, 6, 6, 1);
    context.fillRect(9, 10, 6, 2);
    context.fillRect(16, 11, 5, 2);

    context.fillStyle = toHexColor(COLORS.riceLight);
    context.fillRect(24, 10, 2, 7);
    context.fillRect(22, 17, 3, 3);
    context.fillRect(17, 20, 6, 2);
    context.fillRect(10, 22, 10, 1);

    const grainAnchors = [
      { x: 10, y: 8 },
      { x: 18, y: 9 },
      { x: 13, y: 14 },
      { x: 20, y: 15 },
      { x: 9, y: 18 },
    ];
    grainAnchors.forEach((anchor) => {
      if (rng() < 0.15) {
        return;
      }
      const ox = jitter(1);
      const oy = jitter(1);

      context.fillStyle = toHexColor(COLORS.riceGrain);
      context.fillRect(anchor.x + ox, anchor.y + oy, 2, 1);
    });

    context.fillStyle = toHexColor(0xfffaef);
    for (let i = 0; i < 4; i += 1) {
      if (rng() < 0.5) {
        continue;
      }
      const sx = 8 + Math.floor(rng() * 14);
      const sy = 8 + Math.floor(rng() * 10);

      context.fillRect(sx, sy, 1, 1);
    }
  }

  static createShadowTexture(scene) {
    if (scene.textures.exists(RICE_BALL_SHADOW_KEY)) {
      return;
    }

    const width = 32;
    const height = 24;
    const texture = scene.textures.createCanvas(RICE_BALL_SHADOW_KEY, width, height);
    const context = texture.getContext();

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);

    context.fillStyle = toHexColor(0xdddddd);
    context.fillRect(10, 3, 12, 3);
    context.fillRect(7, 5, 18, 3);
    context.fillRect(5, 7, 22, 4);
    context.fillRect(3, 10, 26, 7);
    context.fillRect(5, 17, 22, 3);
    context.fillRect(8, 20, 16, 2);

    context.fillStyle = toHexColor(0xffffff);
    context.fillRect(9, 5, 14, 3);
    context.fillRect(7, 8, 18, 4);
    context.fillRect(5, 12, 21, 5);
    context.fillRect(8, 17, 15, 2);

    texture.refresh();
  }
}
