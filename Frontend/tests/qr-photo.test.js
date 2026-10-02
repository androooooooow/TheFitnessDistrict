import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { decodeQrPixels } from '../src/lib/qr-photo.js';

const token =
  [
    { alg: 'HS256', typ: 'JWT' },
    {
      purpose: 'attendance',
      sid: '11111111-2222-4333-8444-555555555555',
      sub: '66666666-7777-4888-8999-000000000000',
      iss: 'fit-district',
      aud: 'fit-district-attendance',
      jti: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      iat: 1790900000,
      exp: 1790900090,
    },
  ]
    .map((part) => Buffer.from(JSON.stringify(part)).toString('base64url'))
    .join('.') +
  '.' +
  'a'.repeat(43);
const text = `fit-district:attendance:${token}`;
const svg = renderToStaticMarkup(
  createElement(QRCodeSVG, { value: text, marginSize: 4, level: 'M' }),
);
const cells = Number(svg.match(/viewBox="0 0 (\d+)/)[1]);
const path = [...svg.matchAll(/<path[^>]*d="([^"]+)"/g)].at(-1)[1];
function fixture({ size = 336, inverted = false, rotated = false, screenshot = false } = {}) {
  const width = screenshot ? 1400 : size,
    height = screenshot ? 900 : size;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  if (inverted) for (let i = 0; i < data.length; i += 4) data.fill(0, i, i + 3);
  for (const match of path.matchAll(/M(\d+)[ ,](\d+)\s*h(\d+)v1H\d+z/g)) {
    const [, x, y, run] = match.map(Number);
    for (let py = Math.ceil((y * size) / cells); py < Math.ceil(((y + 1) * size) / cells); py++) {
      for (
        let px = Math.ceil((x * size) / cells);
        px < Math.ceil(((x + run) * size) / cells);
        px++
      ) {
        const dx = (rotated ? size - py - 1 : px) + (screenshot ? 350 : 0);
        const dy = (rotated ? px : py) + (screenshot ? 250 : 0);
        const offset = (dy * width + dx) * 4;
        data.fill(inverted ? 255 : 0, offset, offset + 3);
      }
    }
  }
  return { data, width, height };
}
for (const [name, options] of [
  ['dense gym QR', {}],
  ['small gym QR from the previous screen', { size: 232 }],
  ['rotated gym QR photo', { rotated: true }],
  ['inverted gym QR photo', { inverted: true }],
  ['gym QR inside a full dashboard screenshot', { screenshot: true }],
]) {
  test(`photo reader decodes the full token from ${name}`, () => {
    const { data, width, height } = fixture(options);
    assert.equal(decodeQrPixels(data, width, height), text);
  });
}
test('an image without a QR returns no result rather than a scanner failure', () => {
  assert.equal(decodeQrPixels(new Uint8ClampedArray(100 * 100 * 4).fill(255), 100, 100), null);
});
