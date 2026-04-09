import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

/**
 * 生成 Marketplace 用 128×128 PNG 图标：
 * - 透明背景
 * - 像素风 APL 字样（3×5 点阵字形），放大为 8px 方块
 *
 * 不依赖任何第三方库，便于在任意环境中重建产物。
 */

const OUT_PATH = path.resolve(process.cwd(), "media", "icon.png");
const W = 128;
const H = 128;

// 3×5 点阵字形（1=填充）
const GLYPHS = {
  A: [
    [0, 1, 0],
    [1, 0, 1],
    [1, 1, 1],
    [1, 0, 1],
    [1, 0, 1],
  ],
  P: [
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1],
    [1, 0, 0],
    [1, 0, 0],
  ],
  L: [
    [1, 0, 0],
    [1, 0, 0],
    [1, 0, 0],
    [1, 0, 0],
    [1, 1, 1],
  ],
};

const LETTERS = ["A", "P", "L"];
const cell = 8; // 像素块大小
const spacingCols = 1; // 字母之间空 1 列
const glyphCols = 3;
const glyphRows = 5;

const totalCols = glyphCols * LETTERS.length + spacingCols * (LETTERS.length - 1);
const totalW = totalCols * cell;
const totalH = glyphRows * cell;
const x0 = Math.floor((W - totalW) / 2);
const y0 = Math.floor((H - totalH) / 2);

// RGBA buffer，透明底
const pixels = Buffer.alloc(W * H * 4, 0);

function setPixel(x, y, r, g, b, a) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 4;
  pixels[i] = r;
  pixels[i + 1] = g;
  pixels[i + 2] = b;
  pixels[i + 3] = a;
}

function fillRect(x, y, w, h, r, g, b, a) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      setPixel(xx, yy, r, g, b, a);
    }
  }
}

// 画字：用纯黑色，交给 Marketplace/主题背景对比
const fg = { r: 0, g: 0, b: 0, a: 255 };
let colCursor = 0;
for (let li = 0; li < LETTERS.length; li++) {
  const ch = LETTERS[li];
  const g = GLYPHS[ch];
  for (let r = 0; r < glyphRows; r++) {
    for (let c = 0; c < glyphCols; c++) {
      if (g[r][c]) {
        const x = x0 + (colCursor + c) * cell;
        const y = y0 + r * cell;
        fillRect(x, y, cell, cell, fg.r, fg.g, fg.b, fg.a);
      }
    }
  }
  colCursor += glyphCols + (li === LETTERS.length - 1 ? 0 : spacingCols);
}

// -------- PNG encoder (RGBA, 8-bit, no interlace) --------

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let k = 0; k < 8; k++) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

// IDAT: each row prefixed by filter byte 0
const raw = Buffer.alloc(H * (1 + W * 4));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 4)] = 0;
  pixels.copy(raw, y * (1 + W * 4) + 1, y * W * 4, (y + 1) * W * 4);
}
const compressed = zlib.deflateSync(raw, { level: 9 });

const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const png = Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", compressed), chunk("IEND", Buffer.alloc(0))]);

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, png);
console.log(`Wrote ${OUT_PATH}`);

