console.log("START icon gen");
import * as fs from "fs";
import zlib from "zlib";
console.log("modules loaded");

const BRAND = [0x18, 0x68, 0xDB];
const WHITE = [0xFF, 0xFF, 0xFF];

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (0xEDB88320 ^ (crc >>> 1)) : crc >>> 1;
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function writePNG(path, w, h, px) {
  const rowBytes = w * 4;
  const raw = new Uint8Array(h * (1 + rowBytes));
  let ri = 0;
  for (let y = 0; y < h; y++) {
    raw[ri++] = 0;
    raw.set(px.subarray(y * rowBytes, (y + 1) * rowBytes), ri);
    ri += rowBytes;
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });
  const chunks = [];
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const head = Buffer.concat([len, Buffer.from(type), data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(head.subarray(4)), 0);
    chunks.push(Buffer.concat([head, crcBuf]));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  chunk("IHDR", ihdr);
  chunk("IDAT", compressed);
  chunk("IEND", Buffer.alloc(0));
  fs.writeFileSync(path, Buffer.concat(chunks));
  console.log("wrote", path, Buffer.concat(chunks).length, "bytes");
}

function makeIcon(size) {
  const px = new Uint8Array(size * size * 4);
  for (let i = 0; i < px.length; i += 4) {
    px[i] = BRAND[0]; px[i + 1] = BRAND[1]; px[i + 2] = BRAND[2]; px[i + 3] = 255;
  }
  const pad = Math.round(size * 0.07);
  const cx = size / 2, cy = size / 2, r = (size - pad * 2) / 2;
  for (let y = pad; y < size - pad; y++) {
    for (let x = pad; x < size - pad; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r * r) {
        const i = (y * size + x) * 4;
        px[i] = WHITE[0]; px[i + 1] = WHITE[1]; px[i + 2] = WHITE[2]; px[i + 3] = 255;
      }
    }
  }
  function line(x0, y0, x1, y1, color) {
    let x = x0, y = y0;
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      if (x >= 0 && x < size && y >= 0 && y < size) {
        const i = (y * size + x) * 4;
        px[i] = color[0]; px[i + 1] = color[1]; px[i + 2] = color[2]; px[i + 3] = 255;
      }
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }
  function thickLine(x0, y0, x1, y1, color, t) {
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / len, ny = dx / len;
    for (let k = 0; k < t; k++) {
      const off = (k - t / 2) * 2;
      line(x0 + nx * off, y0 + ny * off, x1 + nx * off, y1 + ny * off, color);
    }
  }
  const W = WHITE;
  const t = Math.max(4, Math.round(size * 0.05));
  const g = Math.round(size * 0.24);
  thickLine(g, Math.round(size * 0.22), g, Math.round(size * 0.78), W, t);
  thickLine(g, Math.round(size * 0.22), g + Math.round(size * 0.22), Math.round(size * 0.22), W, t);
  thickLine(g, Math.round(size * 0.5), g + Math.round(size * 0.22), Math.round(size * 0.5), W, t);
  thickLine(g + Math.round(size * 0.22), Math.round(size * 0.22), g + Math.round(size * 0.22), Math.round(size * 0.5), W, t);
  const x1 = g + Math.round(size * 0.36);
  const x2 = g + Math.round(size * 0.48);
  const x3 = g + Math.round(size * 0.60);
  thickLine(x1, Math.round(size * 0.78), x1 - Math.round(size * 0.08), Math.round(size * 0.22), W, t);
  thickLine(x1 - Math.round(size * 0.08), Math.round(size * 0.22), x2, Math.round(size * 0.5), W, t);
  thickLine(x2, Math.round(size * 0.5), x3, Math.round(size * 0.22), W, t);
  thickLine(x3, Math.round(size * 0.22), x3 + Math.round(size * 0.08), Math.round(size * 0.78), W, t);
  return px;
}

console.log("generating 192");
const p192 = makeIcon(192);
writePNG("frontend/public/icons/icon-192.png", 192, 192, p192);
console.log("generating 512");
const p512 = makeIcon(512);
writePNG("frontend/public/icons/icon-512.png", 512, 512, p512);
console.log("DONE");
