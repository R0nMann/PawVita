// Draws the PawVita app icons (a paw print on the brand green) and writes the
// PNGs the PWA manifest references. No dependencies: shapes are rasterised
// with 4×4 supersampling and encoded with Node's zlib.
//
//   node scripts/generate-icons.mjs
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const OUT = path.resolve(import.meta.dirname, "../public/icons");
const GREEN = [0x1b, 0x43, 0x32];
const AMBER = [0xf4, 0xa3, 0x00];

const PAD = { cx: 0.5, cy: 0.63, rx: 0.2, ry: 0.165 };
const TOES = [
  { cx: 0.29, cy: 0.42, rx: 0.075, ry: 0.098 },
  { cx: 0.415, cy: 0.305, rx: 0.078, ry: 0.102 },
  { cx: 0.585, cy: 0.305, rx: 0.078, ry: 0.102 },
  { cx: 0.71, cy: 0.42, rx: 0.075, ry: 0.098 },
];

function inEllipse(x, y, e) {
  const dx = (x - e.cx) / e.rx;
  const dy = (y - e.cy) / e.ry;
  return dx * dx + dy * dy <= 1;
}

function inRoundedSquare(x, y, radius) {
  const cx = Math.min(Math.max(x, radius), 1 - radius);
  const cy = Math.min(Math.max(y, radius), 1 - radius);
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius * radius;
}

/** RGBA pixels. `maskable` fills the whole square and shrinks the paw into the safe zone. */
function draw(size, maskable) {
  const px = Buffer.alloc(size * size * 4);
  const scale = maskable ? 0.72 : 1;
  const samples = 4;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let bg = 0;
      let paw = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = (i + (sx + 0.5) / samples) / size;
          const y = (j + (sy + 0.5) / samples) / size;
          if (maskable || inRoundedSquare(x, y, 0.22)) bg++;
          const px2 = 0.5 + (x - 0.5) / scale;
          const py2 = 0.5 + (y - 0.5) / scale;
          if (inEllipse(px2, py2, PAD) || TOES.some((t) => inEllipse(px2, py2, t))) paw++;
        }
      }
      const n = samples * samples;
      const a = bg / n;
      const p = Math.min(paw, bg) / n;
      const o = (j * size + i) * 4;
      for (let c = 0; c < 3; c++) {
        // Paw colour over green, weighted by coverage.
        const mixed = a ? (GREEN[c] * (a - p) + AMBER[c] * p) / a : 0;
        px[o + c] = Math.round(mixed);
      }
      px[o + 3] = Math.round(a * 255);
    }
  }
  return px;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const rows = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    rows[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.mkdirSync(OUT, { recursive: true });
for (const [name, size, maskable] of [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["icon-maskable-512.png", 512, true],
  ["apple-touch-icon.png", 180, true],
]) {
  fs.writeFileSync(path.join(OUT, name), png(size, draw(size, maskable)));
  console.log(`wrote public/icons/${name}`);
}
