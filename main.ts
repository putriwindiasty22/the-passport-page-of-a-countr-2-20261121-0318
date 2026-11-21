// The Passport Page of a Country That Isn't There
// main.ts — Node 22, no network, no external assets.
// Draws one invented passport spread (Republic of Meridia) as a 1024x1024 PNG
// to /output/entry.png using a raw pixel buffer and Node's built-in zlib.
//
// Document facts (kept mutually consistent):
//   Country: Republic of Meridia — small windswept island nation, capital Port Tern
//   Bearer: Elin Mara Halloran, born 14 MAR 1994 in Port Tern
//   Passport No. MER-482913, issued 12 JAN 2026 in Port Tern, expires 11 JAN 2036
//   Travel (all AFTER the issue date, in order):
//     Nordmark  ENTRY 03 MAR 2026 -> EXIT 10 MAR 2026
//     Caldoria  ENTRY 12 MAR 2026 -> EXIT 28 MAR 2026
//     Isle of Tern ENTRY 02 APR 2026 -> EXIT 09 APR 2026
//   Telling detail: visa condition "BEARER MUST CARRY ONE SPARE COMPASS AT ALL TIMES"
//   plus a fee stamp (12 Meridian crowns) and the observation that the holder is
//   a licensed lighthouse keeper.

import * as fs from "node:fs";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;
const img = Buffer.alloc(W * H * 3);

type RGB = [number, number, number];

// ---------- palette ----------
const DESK: RGB = [58, 56, 52];
const PAGE: RGB = [246, 241, 227];
const PAGE_EDGE: RGB = [226, 219, 198];
const INK: RGB = [28, 40, 74];
const NAVY: RGB = [22, 41, 77];
const GOLD: RGB = [168, 132, 44];
const FAINT: RGB = [196, 188, 164];
const GUILLOCHE: RGB = [203, 211, 219];
const STAMP_BLUE: RGB = [31, 78, 156];
const STAMP_RED: RGB = [165, 42, 42];
const STAMP_GREEN: RGB = [46, 107, 52];
const PORTRAIT_BG: RGB = [185, 207, 224];
const SILHOUETTE: RGB = [34, 48, 79];
const MRZ_BG: RGB = [238, 234, 220];
const GREY: RGB = [110, 108, 100];

// ---------- pixel primitives ----------
function px(x: number, y: number, c: RGB): void {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  img[i] = c[0];
  img[i + 1] = c[1];
  img[i + 2] = c[2];
}
function fillRect(x0: number, y0: number, w: number, h: number, c: RGB): void {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) px(x, y, c);
}
function rect(x0: number, y0: number, w: number, h: number, c: RGB, t = 1): void {
  for (let k = 0; k < t; k++) {
    for (let x = x0 + k; x < x0 + w - k; x++) {
      px(x, y0 + k, c);
      px(x, y0 + h - 1 - k, c);
    }
    for (let y = y0 + k; y < y0 + h - k; y++) {
      px(x0 + k, y, c);
      px(x0 + w - 1 - k, y, c);
    }
  }
}
function hline(x0: number, x1: number, y: number, c: RGB, t = 1): void {
  for (let k = 0; k < t; k++) for (let x = x0; x <= x1; x++) px(x, y + k, c);
}
function vline(x: number, y0: number, y1: number, c: RGB, t = 1): void {
  for (let k = 0; k < t; k++) for (let y = y0; y <= y1; y++) px(x + k, y, c);
}
function line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    px(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}
function circle(cx: number, cy: number, r: number, c: RGB): void {
  for (let a = 0; a < 360; a += 1) {
    const t = (a * Math.PI) / 180;
    px(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), c);
  }
}
function filledCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++)
      if (x * x + y * y <= r * r) px(cx + x, cy + y, c);
}
function polyFill(points: Array<[number, number]>, c: RGB): void {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of points) {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[(i + 1) % points.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
        xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) px(x, y, c);
    }
  }
}

// ---------- 5x7 bitmap font ----------
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "00100", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "<": ["00010", "00100", "01000", "10000", "01000", "00100", "00010"],
  ">": ["01000", "00100", "00010", "00001", "00010", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "+": ["00000", "00100", "00100", "01110", "00100", "00100", "00000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "=": ["00000", "00000", "01110", "00000", "01110", "00000", "00000"],
  "*": ["00000", "00100", "10101", "01110", "10101", "00100", "00000"],
};

function textWidth(s: string, scale: number, spacing = 1): number {
  return s.length * (5 * scale + spacing) - spacing;
}
function drawText(
  x: number,
  y: number,
  s: string,
  scale: number,
  c: RGB,
  spacing = 1,
): void {
  let cx = x;
  for (const ch of s.toUpperCase()) {
    const g = FONT[ch] ?? FONT[" "];
    for (let r = 0; r < 7; r++)
      for (let col = 0; col < 5; col++)
        if (g[r][col] === "1")
          fillRect(cx + col * scale, y + r * scale, scale, scale, c);
    cx += 5 * scale + spacing;
  }
}
function drawTextCentered(
  cx: number,
  y: number,
  s: string,
  scale: number,
  c: RGB,
  spacing = 1,
): void {
  drawText(cx - Math.floor(textWidth(s, scale, spacing) / 2), y, s, scale, c, spacing);
}

// ---------- PNG encoder (filter 0, zlib deflate) ----------
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    img.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- MRZ (ICAO 9303 check digits) ----------
function mrzCheck(s: string): number {
  const w = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    let v: number;
    if (ch >= "0" && ch <= "9") v = ch.charCodeAt(0) - 48;
    else if (ch >= "A" && ch <= "Z") v = ch.charCodeAt(0) - 55;
    else v = 0;
    sum += v * w[i % 3];
  }
  return sum % 10;
}
function mrzLines(): [string, string] {
  let l1 = "P<MERHALLORAN<<ELIN<MARA";
  l1 = l1 + "<".repeat(44 - l1.length);
  const doc = "MER482913";
  const dob = "940314";
  const exp = "360111";
  const pers = "<".repeat(14);
  const body =
    doc +
    mrzCheck(doc) +
    "MER" +
    dob +
    mrzCheck(dob) +
    "F" +
    exp +
    mrzCheck(exp) +
    pers +
    mrzCheck(pers);
  const l2 = body + mrzCheck(body);
  return [l1, l2];
}

// ---------- page furniture ----------
function guilloche(x0: number, x1: number, y0: number, y1: number): void {
  for (let y = y0; y < y1; y += 9) {
    for (let x = x0; x < x1; x += 2) {
      const yy = y + Math.round(2 * Math.sin(x / 26 + y / 7));
      px(x, yy, GUILLOCHE);
    }
  }
}
function compassRose(cx: number, cy: number, r: number, c: RGB, label = true): void {
  circle(cx, cy, r, c);
  circle(cx, cy, Math.round(r * 0.72), c);
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    const len = k % 2 === 0 ? r : Math.round(r * 0.62);
    line(
      cx,
      cy,
      Math.round(cx + len * Math.cos(a)),
      Math.round(cy + len * Math.sin(a)),
      c,
    );
  }
  filledCircle(cx, cy, 3, c);
  if (label) drawTextCentered(cx, cy - r - 16, "N", 1, c);
}

function field(x: number, y: number, label: string, value: string, vscale = 2): void {
  drawText(x, y, label, 1, GREY);
  drawText(x, y + 10, value, vscale, INK);
}

// ---------- build the spread ----------
function build(): void {
  fillRect(0, 0, W, H, DESK);
  // two pages
  fillRect(8, 8, 496, 1008, PAGE);
  fillRect(520, 8, 496, 1008, PAGE);
  // gutter shadow
  fillRect(500, 8, 8, 1008, PAGE_EDGE);
  fillRect(512, 8, 8, 1008, PAGE_EDGE);
  // page edge rules
  rect(8, 8, 496, 1008, PAGE_EDGE, 2);
  rect(520, 8, 496, 1008, PAGE_EDGE, 2);
  guilloche(20, 492, 20, 1004);
  guilloche(532, 1004, 20, 1004);

  // ================= LEFT PAGE — data page =================
  const L = 256; // left page centre x
  compassRose(L, 62, 26, NAVY);
  drawTextCentered(L, 104, "REPUBLIC OF MERIDIA", 3, NAVY, 2);
  drawTextCentered(L, 132, "PASSPORT", 4, INK, 3);
  drawTextCentered(L, 168, "REPUBLIK MERIDIA  -  PASPORT", 1, GREY, 1);
  hline(60, 452, 188, GOLD, 2);
  hline(60, 452, 192, GOLD, 1);

  // Type / Code / Number row
  field(36, 208, "TYPE / JENIS", "P", 2);
  field(120, 208, "CODE / KODE", "MER", 2);
  field(240, 208, "PASSPORT NO. / NO. PASPOR", "MER-482913", 2);

  // Portrait box
  const px0 = 36;
  const py0 = 252;
  const pw = 138;
  const ph = 168;
  fillRect(px0, py0, pw, ph, PORTRAIT_BG);
  rect(px0, py0, pw, ph, NAVY, 2);
  rect(px0 + 4, py0 + 4, pw - 8, ph - 8, NAVY, 1);
  // faint horizontal security lines inside the photo
  for (let y = py0 + 12; y < py0 + ph; y += 8) hline(px0 + 5, px0 + pw - 6, y, [168, 192, 210]);
  // stylised silhouette: shoulders, neck, head, windswept hair, bun
  const cxp = px0 + pw / 2;
  polyFill(
    [
      [cxp - 52, py0 + ph - 5],
      [cxp - 46, py0 + 128],
      [cxp - 20, py0 + 112],
      [cxp + 20, py0 + 112],
      [cxp + 46, py0 + 128],
      [cxp + 52, py0 + ph - 5],
    ],
    SILHOUETTE,
  );
  fillRect(cxp - 9, py0 + 96, 18, 20, SILHOUETTE);
  filledCircle(cxp, py0 + 66, 27, SILHOUETTE);
  // hair: swept fringe + bun, wind-blown to the right
  polyFill(
    [
      [cxp - 27, py0 + 66],
      [cxp - 24, py0 + 38],
      [cxp + 4, py0 + 30],
      [cxp + 26, py0 + 44],
      [cxp + 30, py0 + 62],
      [cxp + 22, py0 + 48],
      [cxp - 6, py0 + 42],
      [cxp - 20, py0 + 52],
    ],
    SILHOUETTE,
  );
  filledCircle(cxp + 2, py0 + 30, 9, SILHOUETTE);
  // photo caption
  drawTextCentered(cxp, py0 + ph + 8, "PHOTOGRAPH / FOTO", 1, GREY);

  // Data fields right of the portrait
  field(196, 252, "SURNAME / NAMA KELUARGA", "HALLORAN", 2);
  field(196, 292, "GIVEN NAMES / NAMA DEPAN", "ELIN MARA", 2);
  field(196, 332, "NATIONALITY / KEWARGANEGARAAN", "MERIDIAN", 2);
  field(196, 372, "DATE OF BIRTH / TGL LAHIR", "14 MAR 1994", 2);
  field(356, 372, "SEX / JENIS KELAMIN", "F", 2);
  field(196, 412, "PLACE OF BIRTH / TEMPAT LAHIR", "PORT TERN, MERIDIA", 2);

  hline(36, 476, 452, FAINT, 1);
  // Issue block
  field(36, 468, "DATE OF ISSUE / TGL TERBIT", "12 JAN 2026", 2);
  field(268, 468, "DATE OF EXPIRY / TGL BERAKHIR", "11 JAN 2036", 2);
  field(36, 508, "AUTHORITY / OTORITAS", "MERIDIA PASSPORT OFFICE - PORT TERN", 2);
  field(36, 548, "OBSERVATIONS / CATATAN", "HOLDER IS A LICENSED LIGHTHOUSE KEEPER", 2);

  // Signature
  drawText(36, 606, "SIGNATURE OF BEARER / TANDATANGAN", 1, GREY);
  hline(36, 300, 640, INK, 1);
  // a handwritten-style scribble
  let sx = 44;
  let sy = 632;
  const scribble: Array<[number, number]> = [];
  for (let i = 0; i < 40; i++) {
    scribble.push([sx, sy]);
    sx += 5;
    sy += i % 4 === 0 ? -4 : i % 4 === 2 ? 3 : 0;
  }
  for (let i = 0; i + 1 < scribble.length; i++)
    line(scribble[i][0], scribble[i][1], scribble[i + 1][0], scribble[i + 1][1], INK);
  line(44, 636, 250, 628, INK);
  drawText(320, 606, "PORT TERN", 2, INK);
  drawText(320, 626, "12 JAN 2026", 1, GREY);

  // MRZ zone
  fillRect(28, 690, 456, 96, MRZ_BG);
  rect(28, 690, 456, 96, NAVY, 1);
  const [m1, m2] = mrzLines();
  drawText(40, 712, m1, 2, INK, 0);
  drawText(40, 748, m2, 2, INK, 0);
  drawTextCentered(L, 800, "MER-482913  -  REPUBLIC OF MERIDIA", 1, GREY);
  drawTextCentered(L, 980, "THIS PASSPORT CONTAINS 32 PAGES  -  PASPOR INI BERISI 32 HALAMAN", 1, GREY);

  // ================= RIGHT PAGE — visas & stamps =================
  const R = 768; // right page centre x
  drawTextCentered(R, 40, "VISAS", 3, NAVY, 2);
  drawTextCentered(R, 68, "VISA  -  CAP STEMPEL", 1, GREY, 1);
  hline(572, 964, 92, GOLD, 2);

  // --- stamp helper: rectangular entry/exit stamp ---
  function stampRect(
    x: number,
    y: number,
    w: number,
    h: number,
    c: RGB,
    country: string,
    kind: string,
    date: string,
    place: string,
  ): void {
    rect(x, y, w, h, c, 2);
    rect(x + 5, y + 5, w - 10, h - 10, c, 1);
    drawTextCentered(x + w / 2, y + 12, country, 2, c, 1);
    drawTextCentered(x + w / 2, y + 34, kind, 2, c, 1);
    drawTextCentered(x + w / 2, y + 56, date, 2, c, 1);
    drawTextCentered(x + w / 2, y + 78, place, 1, c, 1);
  }

  // Nordmark — first trip, 03 MAR 2026 in, 10 MAR 2026 out
  stampRect(544, 116, 216, 104, STAMP_BLUE, "NORDMARK", "ENTRY", "03 MAR 2026", "HARBOUR GATE 2");
  stampRect(776, 116, 216, 104, STAMP_BLUE, "NORDMARK", "EXIT", "10 MAR 2026", "HARBOUR GATE 2");
  // Caldoria — second trip, 12 MAR 2026 in, 28 MAR 2026 out
  stampRect(544, 244, 216, 104, STAMP_GREEN, "CALDORIA", "ENTRY", "12 MAR 2026", "PORT SAREL");
  stampRect(776, 244, 216, 104, STAMP_GREEN, "CALDORIA", "EXIT", "28 MAR 2026", "PORT SAREL");
  // Isle of Tern — circular stamp, 02 APR 2026 in, 09 APR 2026 out
  // (larger ring, text kept inside the chord at each line's height)
  const tcx = 648;
  const tcy = 452;
  circle(tcx, tcy, 86, STAMP_RED);
  circle(tcx, tcy, 78, STAMP_RED);
  drawTextCentered(tcx, tcy - 56, "ISLE OF TERN", 2, STAMP_RED, 0);
  drawTextCentered(tcx, tcy - 30, "ENTRY", 2, STAMP_RED, 0);
  drawTextCentered(tcx, tcy - 6, "02 APR 2026", 2, STAMP_RED, 0);
  drawTextCentered(tcx, tcy + 18, "EXIT", 2, STAMP_RED, 0);
  drawTextCentered(tcx, tcy + 42, "09 APR 2026", 2, STAMP_RED, 0);
  // Fee stamp
  stampRect(776, 396, 216, 104, STAMP_RED, "FEE PAID", "12 CROWNS", "02 APR 2026", "MERIDIAN CROWNS");

  // --- the telling detail: visa condition ---
  fillRect(544, 560, 448, 150, [250, 244, 232]);
  rect(544, 560, 448, 150, STAMP_RED, 2);
  rect(549, 565, 438, 140, STAMP_RED, 1);
  drawTextCentered(R, 576, "CONDITION OF ENTRY", 2, STAMP_RED, 1);
  hline(580, 956, 600, STAMP_RED, 1);
  drawTextCentered(R, 616, "BEARER MUST CARRY ONE", 2, STAMP_RED, 1);
  drawTextCentered(R, 640, "SPARE COMPASS", 2, STAMP_RED, 1);
  drawTextCentered(R, 664, "AT ALL TIMES", 2, STAMP_RED, 1);
  drawTextCentered(R, 688, "MERIDIA BORDER SERVICE", 1, STAMP_RED, 1);

  // small compass watermark on the right page (no N label: it would
  // collide with the ferry note above it)
  compassRose(900, 872, 38, [190, 196, 204], false);
  drawTextCentered(R, 760, "BEARER TRAVELLED BY FERRY FROM PORT TERN", 1, GREY);
  drawTextCentered(R, 780, "TO NORDMARK, CALDORIA AND THE ISLE OF TERN", 1, GREY);
  drawTextCentered(R, 980, "PAGE 12  -  HALAMAN 12", 1, GREY);
}

build();
fs.mkdirSync("/output", { recursive: true });
const png = encodePNG();
fs.writeFileSync("/output/entry.png", png);
console.log(`wrote /output/entry.png ${png.length} bytes`);
