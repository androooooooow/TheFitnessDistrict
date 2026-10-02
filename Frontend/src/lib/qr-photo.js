import {
  BinaryBitmap,
  DecodeHintType,
  GlobalHistogramBinarizer,
  HybridBinarizer,
  QRCodeReader,
  RGBLuminanceSource,
} from '@zxing/library';
import jsQR from 'jsqr';

const hints = new Map([[DecodeHintType.TRY_HARDER, true]]);
const unreadable = new Set(['NotFoundException', 'ChecksumException', 'FormatException']);

// Accept the same pixel buffer from a canvas or a test fixture.
export function decodeQrPixels(pixels, width, height) {
  const quickResult = jsQR(pixels, width, height, { inversionAttempts: 'attemptBoth' });
  if (quickResult) return quickResult.data;
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0; i < gray.length; i++) {
    const offset = i * 4;
    const alpha = pixels[offset + 3] / 255;
    gray[i] =
      alpha * ((pixels[offset] + 2 * pixels[offset + 1] + pixels[offset + 2]) / 4) +
      (1 - alpha) * 255;
  }
  const source = new RGBLuminanceSource(gray, width, height);
  const reader = new QRCodeReader();
  for (const luminance of [source, source.invert()]) {
    for (const Binarizer of [HybridBinarizer, GlobalHistogramBinarizer]) {
      try {
        return reader.decode(new BinaryBitmap(new Binarizer(luminance)), hints).getText();
      } catch (error) {
        if (!unreadable.has(error.getKind?.())) throw error;
      } finally {
        reader.reset();
      }
    }
  }
  return null;
}

export async function readQrPhoto(file) {
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () =>
        reject(new Error('This image could not be opened. Choose a PNG, JPG, or WebP photo.'));
      image.src = url;
    });
    const width = image.naturalWidth,
      height = image.naturalHeight;
    if (!width || !height) throw new Error('This image is empty. Choose another QR photo.');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('The QR reader could not start. Reload this page and try again.');
    const regions = [[0, 0, width, height]];
    // Overlapping crops also find a small QR inside an entire dashboard screenshot.
    for (const x of [0, 0.2, 0.4])
      for (const y of [0, 0.2, 0.4])
        regions.push([x * width, y * height, width * 0.6, height * 0.6]);
    for (const [x, y, w, h] of regions) {
      const edge = Math.max(w, h);
      const scales =
        w === width
          ? [
              ...new Set([
                Math.min(2048 / edge, 1),
                Math.min(1280 / edge, 2),
                Math.min(800 / edge, 2),
              ]),
            ]
          : [Math.min(1280 / edge, 2)];
      for (const scale of scales) {
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.imageSmoothingEnabled = scale < 1;
        context.drawImage(image, x, y, w, h, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        const text = decodeQrPixels(pixels.data, canvas.width, canvas.height);
        if (text) return text;
        // Let the browser paint the reading state between attempts.
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    throw new Error(
      'No readable QR found. Include the whole current gym QR and its white border in the photo.',
    );
  } finally {
    image.onload = null;
    image.onerror = null;
    URL.revokeObjectURL(url);
  }
}
