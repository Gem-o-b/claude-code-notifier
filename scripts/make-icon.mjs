// 의존성 없이 종(🔔) 모양 PNG 아이콘을 생성한다.
// 실행: node scripts/make-icon.mjs  → assets/bell.png
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SIZE = 256;
const GOLD = [255, 184, 0]; // 종 색
const OUTLINE = [120, 80, 0]; // 외곽선

/** 점 (x,y)가 종 실루엣 내부인지. */
function insideBell(x, y) {
  const cx = 128;
  const d = (px, py) => Math.hypot(x - px, y - py);
  // 손잡이 고리
  const handle = d(cx, 48) <= 15 && d(cx, 48) >= 7;
  // 돔(머리)
  const dome = d(cx, 118) <= 58 && y <= 176;
  // 몸통 플레어(아래로 벌어짐)
  const flareHalf = 58 + ((74 - 58) * (y - 118)) / (178 - 118);
  const flare = y >= 118 && y <= 178 && Math.abs(x - cx) <= flareHalf;
  // 입구 테(넓은 타원)
  const rim = ((x - cx) / 76) ** 2 + ((y - 178) / 13) ** 2 <= 1;
  // 추(클래퍼)
  const clapper = d(cx, 196) <= 12;
  return handle || dome || flare || rim || clapper;
}

/** 외곽선 판정용: 내부지만 가장자리에 가까운지(근처에 외부 점 존재). */
function isEdge(x, y) {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (!insideBell(x + dx, y + dy)) return true;
    }
  }
  return false;
}

/** 4-서브샘플 커버리지(안티앨리어싱). */
function coverage(x, y) {
  let hit = 0;
  const offs = [0.25, 0.75];
  for (const oy of offs) for (const ox of offs) if (insideBell(x + ox, y + oy)) hit++;
  return hit / 4;
}

// RGBA 래스터 생성
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1)); // 행마다 필터바이트 1 + RGBA
let p = 0;
for (let y = 0; y < SIZE; y++) {
  raw[p++] = 0; // 필터: None
  for (let x = 0; x < SIZE; x++) {
    const c = coverage(x, y);
    if (c === 0) {
      p += 4; // 투명
      continue;
    }
    const edge = isEdge(x, y);
    const [r, g, b] = edge ? OUTLINE : GOLD;
    raw[p++] = r;
    raw[p++] = g;
    raw[p++] = b;
    raw[p++] = Math.round(c * 255);
  }
}

// --- 최소 PNG 인코더 ---
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type: RGBA
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'bell.png');
writeFileSync(outPath, png);
console.log(`종 아이콘 생성 완료 → ${outPath} (${png.length} bytes)`);
