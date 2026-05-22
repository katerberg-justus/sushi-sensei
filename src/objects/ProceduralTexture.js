const DEFAULT_POOL_SIZE = 6;

const fullImageDataBySource = new WeakMap();

export function getCachedFullImageData(source) {
  if (!source) {
    return null;
  }

  return fullImageDataBySource.get(source) ?? null;
}

export function sliceCachedImageData(full, cropX, cropY, width, height) {
  const data = new Uint8ClampedArray(width * height * 4);
  const fullWidth = full.width;
  const rowBytes = width * 4;

  for (let y = 0; y < height; y += 1) {
    const srcStart = ((y + cropY) * fullWidth + cropX) * 4;

    data.set(full.data.subarray(srcStart, srcStart + rowBytes), y * rowBytes);
  }

  return { data, width, height };
}

export function createSeededRng(seed) {
  let state = (seed >>> 0) || 1;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStringToSeed(value) {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function variantTextureKey(baseKey, variantIndex) {
  return `${baseKey}-v${variantIndex}`;
}

export function pickVariantIndex(pool = DEFAULT_POOL_SIZE, requested) {
  if (typeof requested === 'number' && Number.isFinite(requested)) {
    return ((requested % pool) + pool) % pool;
  }

  return Math.floor(Math.random() * pool);
}

export function ensureVariantTexture(scene, baseKey, variantIndex, width, height, paintFn) {
  const key = variantTextureKey(baseKey, variantIndex);

  if (scene.textures.exists(key)) {
    return key;
  }

  const texture = scene.textures.createCanvas(key, width, height);
  const context = texture.getContext();
  const rng = createSeededRng(hashStringToSeed(`${baseKey}:${variantIndex}`));

  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, width, height);

  paintFn(context, rng, width, height, variantIndex);

  try {
    const fullImageData = context.getImageData(0, 0, width, height);
    const sourceImage = texture.getSourceImage?.();
    const canvas = sourceImage?.getContext ? sourceImage : sourceImage?.canvas ?? texture.canvas;

    if (canvas) {
      fullImageDataBySource.set(canvas, fullImageData);
    }
  } catch (error) {
    // Ignore — fall back to on-demand getImageData if snapshot fails.
  }

  texture.refresh();

  return key;
}

export function resolveVariantTexture(scene, baseKey, options, config) {
  const pool = config.pool ?? DEFAULT_POOL_SIZE;
  const variantIndex = pickVariantIndex(pool, options.variant);
  const textureKey = ensureVariantTexture(
    scene,
    baseKey,
    variantIndex,
    config.width,
    config.height,
    config.paint,
  );

  return { textureKey, variantIndex };
}

export function toHexColor(color) {
  return `#${color.toString(16).padStart(6, '0')}`;
}
