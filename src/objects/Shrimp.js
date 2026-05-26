import { IngredientObject } from './IngredientObject.js';
import { JAPANESE_NAMES } from './JapaneseNames.js';
import { resolveVariantTexture, toHexColor } from './ProceduralTexture.js';

const PIXEL = 1.782;
const SHRIMP_BASE_KEY = 'shrimp-pixel';
const SHRIMP_VARIANT_POOL = 6;
const SHRIMP_WIDTH = 31;
const SHRIMP_HEIGHT = 21;
const SHRIMP_WEIGHT_GRAMS = 18;

export class Shrimp extends IngredientObject {
  constructor(scene, x, y, options = {}) {
    const isPeeled = options.isPeeled ?? false;
    const { textureKey, variantIndex } = Shrimp.resolveTexture(scene, isPeeled, options);
    const displayWidth = SHRIMP_WIDTH * PIXEL;
    const displayHeight = SHRIMP_HEIGHT * PIXEL;

    super(scene, x, y, displayWidth, displayHeight, {
      ...options,
      japaneseName: options.japaneseName ?? Shrimp.getJapaneseName(isPeeled),
    });
    this.setCenteredHitbox(displayWidth, displayHeight);
    this.textureKey = textureKey;
    this.ownWeightGrams = options.weightGrams ?? SHRIMP_WEIGHT_GRAMS;
    this.restDepth = 20;
    this.variantIndex = variantIndex;
    this.isPeeled = Boolean(isPeeled);

    this.stackCategory = 'fish';
    this.fishType = 'shrimp';
    this.fishDisplayName = 'Shrimp';
    this.fishJapaneseName = JAPANESE_NAMES.shrimp;
    this.acceptedStackCategories = ['wasabi'];
    this.maxStackedItems = 1;
    this.stackOffsetX = 0;
    this.displayName = this.getDisplayName();

    this.sprite = scene.add.image(0, 0, textureKey);
    this.sprite.setScale(PIXEL);
    this.sprite.setOrigin(0.5);
    this.addDraggablePart(this.sprite);

    this.on('pointerdown', this.handlePeelPointerDown, this);
    this.refreshCompositionShadow();
    this.applyRestingDepth();
  }

  static resolveTexture(scene, isPeeled, options = {}) {
    const baseKey = `${SHRIMP_BASE_KEY}-${isPeeled ? 'peeled' : 'unpeeled'}`;

    return resolveVariantTexture(scene, baseKey, options, {
      width: SHRIMP_WIDTH,
      height: SHRIMP_HEIGHT,
      pool: SHRIMP_VARIANT_POOL,
      paint: (context, rng) => Shrimp.paintTexture(context, rng, Boolean(isPeeled)),
      shapeNoise: { chipChance: 0.006, bumpChance: 0.004 },
    });
  }

  getDisplayName() {
    return this.isPeeled ? 'Peeled Shrimp' : 'Unpeeled Shrimp';
  }

  static getJapaneseName(isPeeled) {
    return isPeeled ? JAPANESE_NAMES.peeledShrimp : JAPANESE_NAMES.unpeeledShrimp;
  }

  handlePeelPointerDown(pointer) {
    if (!this.canPeelWithPointer(pointer)) {
      return;
    }

    pointer.event?.preventDefault?.();
    this.cancelStackLongPress?.();
    this.scene?.clearPendingIngredientTraitClick?.();
    this.scene?.ui?.hideIngredientTraits?.();
    this.suppressedDragPointerId = this.getDragPointerId(pointer);
    this.togglePeeled();
  }

  canPeelWithPointer(pointer) {
    if (this.isDragging || this.rotationTween || this.isSpreading || this.isKneading) {
      return false;
    }

    return this.isRightButtonPointer(pointer)
      || pointer?.rightButtonDown?.()
      || pointer?.button === 2
      || pointer?.event?.button === 2
      || this.isTwoFingerTouchPointer(pointer);
  }

  togglePeeled() {
    return this.setPeeled(!this.isPeeled);
  }

  setPeeled(isPeeled) {
    const nextValue = Boolean(isPeeled);

    if (this.isPeeled === nextValue) {
      return this;
    }

    this.isPeeled = nextValue;
    this.displayName = this.getDisplayName();
    this.setJapaneseName(Shrimp.getJapaneseName(this.isPeeled));

    const { textureKey } = Shrimp.resolveTexture(this.scene, this.isPeeled, {
      variant: this.variantIndex,
    });

    this.textureKey = textureKey;
    this.sprite?.setTexture(textureKey);
    this.refreshComputedShade?.();
    this.refreshCompositionShadow?.();
    return this;
  }

  static paintTexture(context, rng, isPeeled) {
    const jitter = (range) => Math.floor(rng() * (range * 2 + 1)) - range;
    const chance = (probability) => rng() < probability;

    const shell = isPeeled ? 0xffd5c4 : 0xf08b63;
    const shellDark = isPeeled ? 0xd88e7d : 0xbb523b;
    const body = isPeeled ? 0xfff4ed : 0xf6a178;
    const bodyShade = isPeeled ? 0xf6c4b5 : 0xd96f4e;
    const highlight = isPeeled ? 0xffffff : 0xffc2a4;
    const tail = isPeeled ? 0xf0825d : 0xb84d37;

    // Butterflied body silhouette: fat rounded head on the left, taper to tail on the right
    const silhouette = [
      [5, 6, 18],
      [6, 4, 21],
      [7, 3, 22],
      [8, 2, 23],
      [9, 2, 23],
      [10, 2, 23],
      [11, 2, 23],
      [12, 2, 23],
      [13, 3, 22],
      [14, 4, 21],
      [15, 6, 18],
    ];
    context.fillStyle = toHexColor(body);
    silhouette.forEach(([y, x0, x1]) => context.fillRect(x0, y, x1 - x0 + 1, 1));

    // Inner body (one pixel inside the silhouette)
    const inner = [
      [6, 7, 17],
      [7, 5, 20],
      [8, 4, 21],
      [9, 3, 22],
      [10, 3, 22],
      [11, 3, 22],
      [12, 3, 22],
      [13, 4, 21],
      [14, 5, 20],
    ];
    context.fillStyle = toHexColor(body);
    inner.forEach(([y, x0, x1]) => context.fillRect(x0, y, x1 - x0 + 1, 1));

    // Segment dividers — alternating shell stripes characteristic of ebi nigiri
    const segments = [
      [7, 6, 13],
      [10, 5, 14],
      [13, 5, 14],
      [16, 6, 13],
      [19, 7, 12],
    ];
    context.fillStyle = toHexColor(bodyShade);
    segments.forEach(([x, y0, y1]) => context.fillRect(x, y0, 1, y1 - y0 + 1));

    // Small splayed tail fan on the right
    context.fillStyle = toHexColor(tail);
    context.fillRect(23, 9, 2, 4);   // base
    context.fillRect(24, 8, 2, 2);   // upper inner
    context.fillRect(24, 12, 2, 2);  // lower inner
    context.fillRect(25, 7, 2, 3);   // upper blade
    context.fillRect(25, 12, 2, 3);  // lower blade
    context.fillRect(25, 10, 3, 2);  // center blade

    context.fillStyle = toHexColor(shellDark);
    context.fillRect(26, 6, 1, 2);   // upper tip
    context.fillRect(28, 10, 1, 2);  // center tip
    context.fillRect(26, 14, 1, 2);  // lower tip

    // Subtle highlights along the back
    context.fillStyle = toHexColor(highlight);
    if (chance(0.85)) context.fillRect(12 + jitter(1), 7, 3, 1);
    if (chance(0.8)) context.fillRect(15 + jitter(1), 8, 4, 1);
    if (chance(0.75)) context.fillRect(8 + jitter(1), 9, 3, 1);
    if (chance(0.5)) context.fillRect(18 + jitter(1), 10, 2, 1);
    if (chance(0.45)) context.fillRect(10 + jitter(1), 11 + jitter(1), 1, 1);

    // Sparse body speckles for subtle variation
    context.fillStyle = toHexColor(bodyShade);
    if (chance(0.55)) context.fillRect(9 + jitter(2), 10 + jitter(1), 1, 1);
    if (chance(0.5)) context.fillRect(14 + jitter(2), 12 + jitter(1), 1, 1);
    if (chance(0.4)) context.fillRect(17 + jitter(1), 9 + jitter(1), 1, 1);

    if (!isPeeled) {
      // Shell ridge accents above each segment
      context.fillStyle = toHexColor(shellDark);
      segments.forEach(([x, y0]) => {
        if (chance(0.7)) context.fillRect(x, y0 - 1, 1, 1);
        if (chance(0.35)) context.fillRect(x, y0 + jitter(1), 1, 1);
      });
    }
  }
}
