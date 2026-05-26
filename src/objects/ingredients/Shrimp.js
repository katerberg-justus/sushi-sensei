import { IngredientObject } from '../base/IngredientObject.js';
import { JAPANESE_NAMES } from '../JapaneseNames.js';
import { resolveVariantTexture, toHexColor } from '../ProceduralTexture.js';

const PIXEL = 1.782;
const SHRIMP_BASE_KEY = 'shrimp-pixel';
const SHRIMP_VARIANT_POOL = 6;
const SHRIMP_WIDTH = 31;
const SHRIMP_HEIGHT = 21;
const SHRIMP_WEIGHT_GRAMS = 18;

export const SHRIMP_STYLE = {
  displayName: 'Shrimp',
  japaneseName: JAPANESE_NAMES.shrimp,
  kind: 'shrimp',
  shell: 0xffd5c4,
  shellDark: 0xd88e7d,
  base: 0xfff4ed,
  shadow: 0xf6c4b5,
  highlight: 0xffffff,
  tail: 0xf0825d,
  unpeeledShell: 0xf08b63,
  unpeeledShellDark: 0xbb523b,
  unpeeledBase: 0xf6a178,
  unpeeledShadow: 0xd96f4e,
  unpeeledHighlight: 0xffc2a4,
  unpeeledTail: 0xb84d37,
  subtypes: [
    {
      key: 'ebi-vannamei-black-tiger',
      displayName: 'Ebi (Vannamei / Black Tiger)',
      palette: {
        base: 0xfff2ea,
        shadow: 0xf2bba9,
        highlight: 0xffffff,
        tail: 0xed7752,
        shell: 0xffd0bd,
        shellDark: 0xd57f70,
        unpeeledShell: 0xef855e,
        unpeeledShellDark: 0xb44a34,
        unpeeledBase: 0xf5a176,
        unpeeledShadow: 0xd36b4a,
        unpeeledHighlight: 0xffc2a4,
        unpeeledTail: 0xae4732,
      },
    },
    {
      key: 'ebi-kuruma-boiled',
      displayName: 'Ebi (Boiled Kuruma Ebi)',
      palette: {
        base: 0xffeadf,
        shadow: 0xeaa690,
        highlight: 0xfffbf7,
        tail: 0xd95f45,
        shell: 0xffc1aa,
        shellDark: 0xc66655,
        unpeeledShell: 0xdf6547,
        unpeeledShellDark: 0x9e3c2d,
        unpeeledBase: 0xee8b66,
        unpeeledShadow: 0xc7563e,
        unpeeledHighlight: 0xffb796,
        unpeeledTail: 0x9c3829,
      },
    },
    {
      key: 'amaebi',
      displayName: 'Amaebi',
      palette: {
        base: 0xffe4e7,
        shadow: 0xf4b8bf,
        highlight: 0xffffff,
        tail: 0xf0919d,
        shell: 0xffcbd2,
        shellDark: 0xd67d87,
        unpeeledShell: 0xee8f9c,
        unpeeledShellDark: 0xb95768,
        unpeeledBase: 0xf5aeb8,
        unpeeledShadow: 0xd77a86,
        unpeeledHighlight: 0xffcbd2,
        unpeeledTail: 0xb75363,
      },
    },
    {
      key: 'botan-ebi',
      displayName: 'Botan Ebi',
      palette: {
        base: 0xffd8dd,
        shadow: 0xe794a4,
        highlight: 0xfff8fa,
        tail: 0xcf5068,
        shell: 0xffb8c2,
        shellDark: 0xb94d62,
        unpeeledShell: 0xd15e72,
        unpeeledShellDark: 0x8c3242,
        unpeeledBase: 0xe58796,
        unpeeledShadow: 0xb94d62,
        unpeeledHighlight: 0xffbdc5,
        unpeeledTail: 0x8a2e3e,
      },
    },
    {
      key: 'kuruma-ebi',
      displayName: 'Kuruma Ebi',
      palette: {
        base: 0xffeee2,
        shadow: 0xdf9b82,
        highlight: 0xffffff,
        tail: 0xc95a3f,
        shell: 0xffc3ad,
        shellDark: 0xa75545,
        unpeeledShell: 0xb85a42,
        unpeeledShellDark: 0x743528,
        unpeeledBase: 0xd47d5f,
        unpeeledShadow: 0x9e4b39,
        unpeeledHighlight: 0xf4aa8e,
        unpeeledTail: 0x743528,
      },
    },
    {
      key: 'shima-ebi-tenaga-ebi',
      displayName: 'Shima Ebi / Tenaga Ebi',
      palette: {
        base: 0xffefe6,
        shadow: 0xe9ac94,
        highlight: 0xffffff,
        tail: 0xda6b48,
        shell: 0xffccb8,
        shellDark: 0xb96d55,
        unpeeledShell: 0xd86d4b,
        unpeeledShellDark: 0x8d3f2f,
        unpeeledBase: 0xea9871,
        unpeeledShadow: 0xbb5d40,
        unpeeledHighlight: 0xffbd9e,
        unpeeledTail: 0x8b3a2b,
      },
    },
  ],
};

export class Shrimp extends IngredientObject {
  constructor(scene, x, y, options = {}) {
    const isPeeled = options.isPeeled ?? false;
    const fishSubtype = Shrimp.resolveShrimpSubtype(options.fishSubtype);
    const shrimpSubtypeStyle = Shrimp.getShrimpSubtypeStyle(fishSubtype);
    const mergedStyle = Shrimp.mergeSubtypeStyle(SHRIMP_STYLE, shrimpSubtypeStyle);
    const { textureKey, variantIndex } = Shrimp.resolveTexture(scene, isPeeled, {
      ...options,
      fishSubtype,
      shrimpStyle: mergedStyle,
    });
    const displayWidth = SHRIMP_WIDTH * PIXEL;
    const displayHeight = SHRIMP_HEIGHT * PIXEL;

    super(scene, x, y, displayWidth, displayHeight, {
      ...options,
      japaneseName: options.japaneseName ?? Shrimp.getJapaneseName(isPeeled, shrimpSubtypeStyle),
    });
    this.setCenteredHitbox(displayWidth, displayHeight);
    this.textureKey = textureKey;
    this.ownWeightGrams = options.weightGrams ?? SHRIMP_WEIGHT_GRAMS;
    this.restDepth = 20;
    this.variantIndex = variantIndex;
    this.isPeeled = Boolean(isPeeled);

    this.stackCategory = 'fish';
    this.fishType = 'shrimp';
    this.fishSubtype = fishSubtype;
    this.fishDisplayName = SHRIMP_STYLE.displayName;
    this.fishSubtypeDisplayName = shrimpSubtypeStyle?.displayName ?? null;
    this.fishJapaneseName = SHRIMP_STYLE.japaneseName;
    this.fishSubtypeJapaneseName = shrimpSubtypeStyle?.japaneseName ?? null;
    this.shrimpStyle = mergedStyle;
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
    const fishSubtype = Shrimp.resolveShrimpSubtype(options.fishSubtype);
    const baseKey = fishSubtype
      ? `${SHRIMP_BASE_KEY}-${fishSubtype}-${isPeeled ? 'peeled' : 'unpeeled'}`
      : `${SHRIMP_BASE_KEY}-${isPeeled ? 'peeled' : 'unpeeled'}`;
    const shrimpStyle = options.shrimpStyle
      ?? Shrimp.mergeSubtypeStyle(SHRIMP_STYLE, Shrimp.getShrimpSubtypeStyle(fishSubtype));

    return resolveVariantTexture(scene, baseKey, options, {
      width: SHRIMP_WIDTH,
      height: SHRIMP_HEIGHT,
      pool: SHRIMP_VARIANT_POOL,
      paint: (context, rng) => Shrimp.paintTexture(context, rng, Boolean(isPeeled), shrimpStyle),
      shapeNoise: { chipChance: 0.006, bumpChance: 0.004 },
    });
  }

  static resolveShrimpSubtype(fishSubtype = null) {
    if (typeof fishSubtype !== 'string') {
      return null;
    }

    const normalizedSubtype = fishSubtype.trim().toLowerCase();

    return Shrimp.getShrimpSubtypeStyle(normalizedSubtype)
      ? normalizedSubtype
      : null;
  }

  static getShrimpSubtypeStyle(fishSubtype) {
    if (!fishSubtype) {
      return null;
    }

    return SHRIMP_STYLE.subtypes.find((subtype) => subtype.key === fishSubtype) ?? null;
  }

  static mergeSubtypeStyle(shrimpStyle, subtypeStyle) {
    if (!subtypeStyle) {
      return shrimpStyle;
    }

    return {
      ...shrimpStyle,
      ...(subtypeStyle.palette ?? {}),
    };
  }

  getDisplayName() {
    const shrimpName = this.fishSubtypeDisplayName ?? this.fishDisplayName;

    return this.isPeeled ? `Peeled ${shrimpName}` : `Unpeeled ${shrimpName}`;
  }

  static getJapaneseName(isPeeled, shrimpSubtypeStyle = null) {
    return shrimpSubtypeStyle?.japaneseName
      ?? (isPeeled ? JAPANESE_NAMES.peeledShrimp : JAPANESE_NAMES.unpeeledShrimp);
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
    this.setJapaneseName(Shrimp.getJapaneseName(this.isPeeled, Shrimp.getShrimpSubtypeStyle(this.fishSubtype)));

    const { textureKey } = Shrimp.resolveTexture(this.scene, this.isPeeled, {
      variant: this.variantIndex,
      fishSubtype: this.fishSubtype,
      shrimpStyle: this.shrimpStyle,
    });

    this.textureKey = textureKey;
    this.sprite?.setTexture(textureKey);
    this.refreshComputedShade?.();
    this.refreshCompositionShadow?.();
    return this;
  }

  static paintTexture(context, rng, isPeeled, shrimpStyle = SHRIMP_STYLE) {
    const jitter = (range) => Math.floor(rng() * (range * 2 + 1)) - range;
    const chance = (probability) => rng() < probability;

    const shell = isPeeled ? shrimpStyle.shell : shrimpStyle.unpeeledShell;
    const shellDark = isPeeled ? shrimpStyle.shellDark : shrimpStyle.unpeeledShellDark;
    const body = isPeeled ? shrimpStyle.base : shrimpStyle.unpeeledBase;
    const bodyShade = isPeeled ? shrimpStyle.shadow : shrimpStyle.unpeeledShadow;
    const highlight = isPeeled ? shrimpStyle.highlight : shrimpStyle.unpeeledHighlight;
    const tail = isPeeled ? shrimpStyle.tail : shrimpStyle.unpeeledTail;

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
