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

function pixelIndex(width, x, y) {
  return (y * width + x) * 4;
}

function getOpaqueNeighbor(data, width, height, x, y) {
  const offsets = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];

  for (const offset of offsets) {
    const nx = x + offset.x;
    const ny = y + offset.y;

    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }

    const index = pixelIndex(width, nx, ny);

    if (data[index + 3] > 0) {
      return index;
    }
  }

  return null;
}

function isOpaque(data, width, height, x, y) {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return false;
  }

  return data[pixelIndex(width, x, y) + 3] > 0;
}

function isOnePixelNotch(data, width, height, x, y) {
  const hasHorizontalBracket = isOpaque(data, width, height, x - 1, y)
    && isOpaque(data, width, height, x + 1, y)
    && (
      isOpaque(data, width, height, x, y - 1)
      || isOpaque(data, width, height, x, y + 1)
    );
  const hasVerticalBracket = isOpaque(data, width, height, x, y - 1)
    && isOpaque(data, width, height, x, y + 1)
    && (
      isOpaque(data, width, height, x - 1, y)
      || isOpaque(data, width, height, x + 1, y)
    );

  return hasHorizontalBracket || hasVerticalBracket;
}

function isEdgePixel(data, width, height, x, y) {
  if (data[pixelIndex(width, x, y) + 3] === 0) {
    return false;
  }

  return (
    y === 0
    || x === width - 1
    || y === height - 1
    || x === 0
    || data[pixelIndex(width, x, y - 1) + 3] === 0
    || data[pixelIndex(width, x + 1, y) + 3] === 0
    || data[pixelIndex(width, x, y + 1) + 3] === 0
    || data[pixelIndex(width, x - 1, y) + 3] === 0
  );
}

function applyPixelShapeNoise(context, rng, width, height, options = {}) {
  const chipChance = options.chipChance ?? 0.02;
  const bumpChance = options.bumpChance ?? 0.014;
  const imageData = context.getImageData(0, 0, width, height);
  const source = imageData.data;
  const result = new Uint8ClampedArray(source);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = pixelIndex(width, x, y);

      if (source[index + 3] > 0) {
        if (isEdgePixel(source, width, height, x, y) && rng() < chipChance) {
          result[index + 3] = 0;
        }
        continue;
      }

      if (rng() >= bumpChance) {
        continue;
      }

      const neighborIndex = getOpaqueNeighbor(source, width, height, x, y);

      if (neighborIndex === null || !isOnePixelNotch(source, width, height, x, y)) {
        continue;
      }

      result[index] = source[neighborIndex];
      result[index + 1] = source[neighborIndex + 1];
      result[index + 2] = source[neighborIndex + 2];
      result[index + 3] = source[neighborIndex + 3];
    }
  }

  imageData.data.set(result);
  context.putImageData(imageData, 0, 0);
}

export function pickVariantIndex(pool = DEFAULT_POOL_SIZE, requested) {
  if (typeof requested === 'number' && Number.isFinite(requested)) {
    return ((requested % pool) + pool) % pool;
  }

  return Math.floor(Math.random() * pool);
}

export function ensureVariantTexture(scene, baseKey, variantIndex, width, height, paintFn, options = {}) {
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

  if (options.shapeNoise) {
    applyPixelShapeNoise(context, rng, width, height, options.shapeNoise);
  }

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
    { shapeNoise: config.shapeNoise },
  );

  return { textureKey, variantIndex };
}

export function toHexColor(color) {
  return `#${color.toString(16).padStart(6, '0')}`;
}
