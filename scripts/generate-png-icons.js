/**
 * Génère icon-192.png et icon-512.png à partir d'un SVG, en utilisant uniquement
 * les modules natifs Node + zlib. On dessine pixel par pixel un motif déterministe
 * (fond foncé + cercle central + 4 nœuds + 4 liens) qui reflète le SVG.
 *
 * Les PNG produits sont valides selon la spec PNG (RFC 2083) :
 *   8 bytes magic + IHDR + IDAT (zlib-compressé) + IEND.
 *
 * Pourquoi pas sharp/canvas ? On veut zéro dépendance native et un install rapide.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const BG = [0x0b, 0x12, 0x20, 0xff]; // #0b1220
const ACCENT = [0x38, 0xbd, 0xf8, 0xff]; // sky-400

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function inCircle(x, y, cx, cy, r) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function inRing(x, y, cx, cy, rOuter, rInner) {
  const dx = x - cx;
  const dy = y - cy;
  const d2 = dx * dx + dy * dy;
  return d2 <= rOuter * rOuter && d2 >= rInner * rInner;
}

function distToSegment(x, y, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  const px = x1 + t * dx;
  const py = y1 + t * dy;
  return Math.hypot(x - px, y - py);
}

function generate(size) {
  // Coords proportionnelles au SVG 512x512.
  const s = size / 512;
  const cx = 256 * s;
  const cy = 256 * s;
  const rCenter = 56 * s;
  const corners = [
    [120 * s, 120 * s],
    [392 * s, 120 * s],
    [120 * s, 392 * s],
    [392 * s, 392 * s],
  ];
  const rCorner = 40 * s;
  const strokeR = 10 * s; // demi-épaisseur du trait
  const cornerStrokeOuter = rCorner;
  const cornerStrokeInner = rCorner - 20 * s;

  // Liens corner→centre (épaule, pas le centre exact, pour matcher le SVG)
  const links = [
    [152 * s, 152 * s, 216 * s, 216 * s],
    [360 * s, 152 * s, 296 * s, 216 * s],
    [152 * s, 360 * s, 216 * s, 296 * s],
    [360 * s, 360 * s, 296 * s, 296 * s],
  ];

  const radiusBg = (size - 8) / 2;
  const cornerRadius = 96 * s; // arrondi extérieur

  const data = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Coin arrondi : on simule un rect rx=96 par sommet de cercle dans les 4 coins.
      const inRoundedRect = (() => {
        if (x >= cornerRadius && x < size - cornerRadius) return true;
        if (y >= cornerRadius && y < size - cornerRadius) return true;
        const dx = Math.max(cornerRadius - x, x - (size - cornerRadius), 0);
        const dy = Math.max(cornerRadius - y, y - (size - cornerRadius), 0);
        return dx * dx + dy * dy <= cornerRadius * cornerRadius;
      })();
      if (!inRoundedRect) {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0; // transparent hors arrondi
        continue;
      }
      let color = BG;

      // Cercle central plein
      if (inCircle(x, y, cx, cy, rCenter)) color = ACCENT;

      // 4 cercles vides (anneaux) aux coins
      for (const [ccx, ccy] of corners) {
        if (inRing(x, y, ccx, ccy, cornerStrokeOuter, cornerStrokeInner)) color = ACCENT;
      }

      // 4 liens (segments épais)
      for (const [x1, y1, x2, y2] of links) {
        if (distToSegment(x, y, x1, y1, x2, y2) <= strokeR) color = ACCENT;
      }

      data[idx] = color[0];
      data[idx + 1] = color[1];
      data[idx + 2] = color[2];
      data[idx + 3] = color[3];
    }
  }
  return data;
}

function crc32(buf) {
  let c;
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function writeChunk(type, payload) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(payload.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, payload])), 0);
  return Buffer.concat([length, typeBuf, payload, crc]);
}

function encodePng(rgba, size) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Filtre type 0 (None) par scanline.
  const stride = size * 4;
  const filtered = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    filtered[y * (stride + 1)] = 0;
    rgba.copy(filtered, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idatPayload = zlib.deflateSync(filtered, { level: 9 });

  return Buffer.concat([
    sig,
    writeChunk("IHDR", ihdr),
    writeChunk("IDAT", idatPayload),
    writeChunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  const rgba = generate(size);
  const png = encodePng(rgba, size);
  const file = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(file, png);
  console.log(`Wrote ${file} (${png.length} bytes)`);
}
