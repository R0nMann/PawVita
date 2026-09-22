// Derives every shipped brand asset from the master artwork at Logo_1.png:
// the trimmed lockup, the square mark, and the PNGs the PWA manifest and the
// favicon reference. No dependencies — the PNG is decoded and re-encoded with
// Node's zlib, and resampling is done on premultiplied alpha so transparent
// edges do not pick up a dark halo.
//
//   node scripts/generate-icons.mjs
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "Logo_1.png");
const PUBLIC = path.join(ROOT, "public");
const ICONS = path.join(PUBLIC, "icons");

/**
 * The icon tile. The artwork is dark green on transparent, so it is set on the
 * app's own cream rather than the brand green — on green the shield outline
 * disappears into the background.
 */
const TILE = [0xfa, 0xf9, 0xf6];

// --- PNG ---------------------------------------------------------------------

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

/** Decode a non-interlaced PNG to straight RGBA8. */
function decode(file) {
  const buf = fs.readFileSync(file);
  if (buf.readBigUInt64BE(0) !== 0x89504e470d0a1a0an) throw new Error(`${file} is not a PNG`);
  let off = 8;
  let head;
  let palette;
  let alphaTable;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      head = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), depth: data[8], color: data[9], interlace: data[12] };
    } else if (type === "IDAT") idat.push(data);
    else if (type === "PLTE") palette = data;
    else if (type === "tRNS") alphaTable = data;
    off += 12 + len;
  }
  if (head.depth !== 8) throw new Error("only 8-bit PNGs are supported");
  if (head.interlace) throw new Error("interlaced PNGs are not supported");

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[head.color];
  const stride = head.w * channels;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const flat = Buffer.alloc(head.h * stride);
  for (let y = 0; y < head.h; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? flat[y * stride + x - channels] : 0;
      const up = y > 0 ? flat[(y - 1) * stride + x] : 0;
      const upLeft = y > 0 && x >= channels ? flat[(y - 1) * stride + x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += left;
      else if (filter === 2) v += up;
      else if (filter === 3) v += (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        v += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }
      flat[y * stride + x] = v & 0xff;
    }
  }

  const data = Buffer.alloc(head.w * head.h * 4);
  for (let i = 0; i < head.w * head.h; i++) {
    let r;
    let g;
    let b;
    let a = 255;
    if (head.color === 6) [r, g, b, a] = [flat[i * 4], flat[i * 4 + 1], flat[i * 4 + 2], flat[i * 4 + 3]];
    else if (head.color === 2) [r, g, b] = [flat[i * 3], flat[i * 3 + 1], flat[i * 3 + 2]];
    else if (head.color === 3) {
      const p = flat[i];
      [r, g, b] = [palette[p * 3], palette[p * 3 + 1], palette[p * 3 + 2]];
      a = alphaTable && p < alphaTable.length ? alphaTable[p] : 255;
    } else if (head.color === 4) [r, g, b, a] = [flat[i * 2], flat[i * 2], flat[i * 2], flat[i * 2 + 1]];
    else [r, g, b] = [flat[i], flat[i], flat[i]];
    data.set([r, g, b, a], i * 4);
  }
  return { width: head.w, height: head.h, data };
}

/**
 * Encode RGBA8. Each row is written with whichever of the five PNG filters
 * predicts it best (the standard sum-of-absolute-differences heuristic), which
 * roughly halves the file over filtering nothing — these assets are precached
 * by the service worker, so the bytes reach every install.
 */
function encode({ width, height, data }) {
  const head = Buffer.alloc(13);
  head.writeUInt32BE(width, 0);
  head.writeUInt32BE(height, 4);
  head[8] = 8; // bit depth
  head[9] = 6; // RGBA

  const bpp = 4;
  const stride = width * bpp;
  const rows = Buffer.alloc(height * (stride + 1));
  const candidate = Buffer.alloc(stride);
  let prev = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const line = data.subarray(y * stride, (y + 1) * stride);
    let bestFilter = 0;
    let bestScore = Infinity;
    let best = null;
    for (let filter = 0; filter < 5; filter++) {
      let score = 0;
      for (let x = 0; x < stride; x++) {
        const a = x >= bpp ? line[x - bpp] : 0;
        const b = prev[x];
        const c = x >= bpp ? prev[x - bpp] : 0;
        let predicted = 0;
        if (filter === 1) predicted = a;
        else if (filter === 2) predicted = b;
        else if (filter === 3) predicted = (a + b) >> 1;
        else if (filter === 4) {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          predicted = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        }
        const v = (line[x] - predicted) & 0xff;
        candidate[x] = v;
        score += v < 128 ? v : 256 - v;
      }
      if (score < bestScore) {
        bestScore = score;
        bestFilter = filter;
        best = Buffer.from(candidate);
      }
    }
    rows[y * (stride + 1)] = bestFilter;
    best.copy(rows, y * (stride + 1) + 1);
    prev = line;
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", head),
    chunk("IDAT", zlib.deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- Image operations ---------------------------------------------------------

function crop(img, x0, y0, w, h) {
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const from = ((y0 + y) * img.width + x0) * 4;
    img.data.copy(out, y * w * 4, from, from + w * 4);
  }
  return { width: w, height: h, data: out };
}

/** Tight bounding box of pixels above `threshold` alpha, within an x range. */
function bounds(img, { from = 0, to = img.width - 1, threshold = 8 } = {}) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = from; x <= to; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] > threshold) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error("no visible pixels in range");
  return { x0, y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/**
 * The column where the wordmark starts: the emptiest column in the middle
 * third, which is the gap between the shield and the "P" of PawVita.
 */
function wordmarkStart(img, box) {
  const from = box.x0 + Math.round(box.width * 0.25);
  const to = box.x0 + Math.round(box.width * 0.55);
  let best = from;
  let bestCount = Infinity;
  for (let x = from; x <= to; x++) {
    let count = 0;
    for (let y = box.y0; y < box.y0 + box.height; y++) {
      if (img.data[(y * img.width + x) * 4 + 3] > 8) count++;
    }
    if (count < bestCount) {
      bestCount = count;
      best = x;
    }
  }
  return best;
}

/** Bilinear resize over premultiplied alpha, so edges stay clean. */
function resize(img, w, h) {
  const src = new Float32Array(img.width * img.height * 4);
  for (let i = 0; i < img.width * img.height; i++) {
    const a = img.data[i * 4 + 3] / 255;
    src[i * 4] = img.data[i * 4] * a;
    src[i * 4 + 1] = img.data[i * 4 + 1] * a;
    src[i * 4 + 2] = img.data[i * 4 + 2] * a;
    src[i * 4 + 3] = a;
  }
  // Box-average when shrinking: bilinear alone aliases badly below ~50%.
  const stepX = img.width / w;
  const stepY = img.height / h;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy0 = y * stepY;
    const sy1 = Math.min((y + 1) * stepY, img.height);
    for (let x = 0; x < w; x++) {
      const sx0 = x * stepX;
      const sx1 = Math.min((x + 1) * stepX, img.width);
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let weight = 0;
      for (let sy = Math.floor(sy0); sy < Math.max(Math.ceil(sy1), Math.floor(sy0) + 1); sy++) {
        const wy = Math.min(sy + 1, sy1) - Math.max(sy, sy0);
        if (wy <= 0) continue;
        for (let sx = Math.floor(sx0); sx < Math.max(Math.ceil(sx1), Math.floor(sx0) + 1); sx++) {
          const wx = Math.min(sx + 1, sx1) - Math.max(sx, sx0);
          if (wx <= 0) continue;
          const i = (Math.min(sy, img.height - 1) * img.width + Math.min(sx, img.width - 1)) * 4;
          const f = wx * wy;
          r += src[i] * f;
          g += src[i + 1] * f;
          b += src[i + 2] * f;
          a += src[i + 3] * f;
          weight += f;
        }
      }
      const o = (y * w + x) * 4;
      const alpha = a / weight;
      out[o] = alpha > 0 ? Math.round(Math.min(r / weight / alpha, 255)) : 0;
      out[o + 1] = alpha > 0 ? Math.round(Math.min(g / weight / alpha, 255)) : 0;
      out[o + 2] = alpha > 0 ? Math.round(Math.min(b / weight / alpha, 255)) : 0;
      out[o + 3] = Math.round(alpha * 255);
    }
  }
  return { width: w, height: h, data: out };
}

function inRoundedSquare(x, y, radius) {
  const cx = Math.min(Math.max(x, radius), 1 - radius);
  const cy = Math.min(Math.max(y, radius), 1 - radius);
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius * radius;
}

/**
 * The mark on a brand-green tile. `maskable` fills the whole square and shrinks
 * the mark into the safe zone Android crops to; otherwise the tile is rounded.
 */
function tile(mark, size, maskable) {
  const scale = maskable ? 0.58 : 0.74;
  const inner = Math.round(size * scale);
  const art = resize(mark, inner, inner);
  const out = Buffer.alloc(size * size * 4);
  const samples = 4;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let cover = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const px = (x + (sx + 0.5) / samples) / size;
          const py = (y + (sy + 0.5) / samples) / size;
          if (maskable || inRoundedSquare(px, py, 0.22)) cover++;
        }
      }
      const bg = cover / (samples * samples);
      const o = (y * size + x) * 4;
      out[o] = TILE[0];
      out[o + 1] = TILE[1];
      out[o + 2] = TILE[2];
      out[o + 3] = Math.round(bg * 255);
    }
  }

  // Composite the mark over the tile (source-over, straight alpha).
  const offset = Math.round((size - inner) / 2);
  for (let y = 0; y < inner; y++) {
    for (let x = 0; x < inner; x++) {
      const s = (y * inner + x) * 4;
      const alpha = art.data[s + 3] / 255;
      if (alpha === 0) continue;
      const dx = x + offset;
      const dy = y + offset;
      if (dx < 0 || dy < 0 || dx >= size || dy >= size) continue;
      const d = (dy * size + dx) * 4;
      const under = out[d + 3] / 255;
      const outA = alpha + under * (1 - alpha);
      for (let c = 0; c < 3; c++) {
        out[d + c] = Math.round((art.data[s + c] * alpha + out[d + c] * under * (1 - alpha)) / outA);
      }
      out[d + 3] = Math.round(outA * 255);
    }
  }
  return { width: size, height: size, data: out };
}

/** Pad to a square, centred, keeping transparency. */
function square(img) {
  const size = Math.max(img.width, img.height);
  const out = Buffer.alloc(size * size * 4);
  const dx = Math.round((size - img.width) / 2);
  const dy = Math.round((size - img.height) / 2);
  for (let y = 0; y < img.height; y++) {
    img.data.copy(out, ((y + dy) * size + dx) * 4, y * img.width * 4, (y + 1) * img.width * 4);
  }
  return { width: size, height: size, data: out };
}

// --- Build --------------------------------------------------------------------

const source = decode(SOURCE);
const box = bounds(source);
const split = wordmarkStart(source, box);

const markBox = bounds(source, { to: split });
const mark = square(crop(source, markBox.x0, markBox.y0, markBox.width, markBox.height));

fs.mkdirSync(ICONS, { recursive: true });

const write = (file, img) => {
  fs.writeFileSync(file, encode(img));
  console.log(`wrote ${path.relative(ROOT, file).replace(/\\/g, "/")} (${img.width}×${img.height})`);
};

write(path.join(PUBLIC, "logo-mark.png"), mark);
for (const [name, size, maskable] of [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["icon-maskable-512.png", 512, true],
  ["apple-touch-icon.png", 180, false],
]) {
  write(path.join(ICONS, name), tile(mark, size, maskable));
}
