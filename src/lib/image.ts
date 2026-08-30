/**
 * Photo preparation before OCR.
 *
 * A phone photo of a worksheet is usually good enough for Tesseract, but three
 * cheap canvas passes lift the recognition rate noticeably and cost no network,
 * no model and no AI: downscale to a sane width, convert to grey, then binarise
 * with Otsu's method so uneven classroom lighting stops mattering.
 */

/** Above this, OCR gets slower with no accuracy gain. */
const MAX_WIDTH = 2000;

export async function loadImage(source: Blob | string): Promise<HTMLImageElement> {
  const url = typeof source === 'string' ? source : URL.createObjectURL(source);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("L'image n'a pas pu être lue."));
      image.src = url;
    });
  } finally {
    if (typeof source !== 'string') {
      // Revoking immediately is safe: decoding is finished once onload fired.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  }
}

/** Otsu's threshold: the grey level that best separates ink from paper. */
function otsuThreshold(histogram: Uint32Array, total: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];

  let sumBackground = 0;
  let weightBackground = 0;
  let maxVariance = 0;
  let threshold = 127;

  for (let i = 0; i < 256; i++) {
    weightBackground += histogram[i];
    if (weightBackground === 0) continue;
    const weightForeground = total - weightBackground;
    if (weightForeground === 0) break;

    sumBackground += i * histogram[i];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const variance = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = i;
    }
  }

  return threshold;
}

export interface PrepareOptions {
  /** Quarter turns clockwise. Lets the teacher straighten a sideways photo. */
  rotationQuarters?: number;
  /** Skip binarisation — useful when the paper is coloured or the pen is faint. */
  binarise?: boolean;
}

/**
 * Returns a canvas ready for Tesseract. Kept as a canvas rather than a Blob so
 * the caller can show the very pixels the OCR will see.
 */
export async function prepareForOcr(
  source: Blob | string,
  { rotationQuarters = 0, binarise = true }: PrepareOptions = {}
): Promise<HTMLCanvasElement> {
  const image = await loadImage(source);

  const quarters = ((rotationQuarters % 4) + 4) % 4;
  const swapped = quarters % 2 === 1;
  const naturalWidth = swapped ? image.naturalHeight : image.naturalWidth;
  const naturalHeight = swapped ? image.naturalWidth : image.naturalHeight;

  const scale = Math.min(1, MAX_WIDTH / Math.max(1, naturalWidth));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error("Le navigateur n'autorise pas le traitement de l'image.");

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((quarters * Math.PI) / 2);
  const drawWidth = (swapped ? height : width) / 1;
  const drawHeight = (swapped ? width : height) / 1;
  ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  ctx.restore();

  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const histogram = new Uint32Array(256);

  // Pass 1 — luminance (Rec. 601), written back in place.
  for (let i = 0; i < pixels.length; i += 4) {
    const grey = (pixels[i] * 299 + pixels[i + 1] * 587 + pixels[i + 2] * 114) / 1000;
    const value = grey | 0;
    pixels[i] = value;
    pixels[i + 1] = value;
    pixels[i + 2] = value;
    histogram[value]++;
  }

  if (binarise) {
    const threshold = otsuThreshold(histogram, width * height);
    for (let i = 0; i < pixels.length; i += 4) {
      const value = pixels[i] > threshold ? 255 : 0;
      pixels[i] = value;
      pixels[i + 1] = value;
      pixels[i + 2] = value;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Export de l'image impossible."))),
      'image/jpeg',
      0.85
    );
  });
}
