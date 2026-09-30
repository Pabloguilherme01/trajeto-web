import { mkdir, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";

const OUT = new URL("../client/public/", import.meta.url);
const BG = [199, 255, 60, 255];
const FG = [11, 16, 20, 255];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function makePng(size) {
  const rowBytes = size * 4;
  const raw = Buffer.alloc((rowBytes + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const offset = y * (rowBytes + 1);
    raw[offset] = 0;
    for (let x = 0; x < size; x += 1) {
      const p = offset + 1 + x * 4;
      raw[p] = BG[0]; raw[p + 1] = BG[1]; raw[p + 2] = BG[2]; raw[p + 3] = 255;
      const t = x / size;
      const u = y / size;
      const left = Math.abs(u - (0.66 - 0.35 * t)) < 0.035;
      const nodeA = (x - size * 0.27) ** 2 + (y - size * 0.66) ** 2 < (size * 0.075) ** 2;
      const nodeB = (x - size * 0.70) ** 2 + (y - size * 0.30) ** 2 < (size * 0.075) ** 2;
      if (left || nodeA || nodeB) { raw[p] = FG[0]; raw[p + 1] = FG[1]; raw[p + 2] = FG[2]; }
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4);
  header[8] = 8; header[9] = 6;
  const data = Buffer.concat([
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), data]);
}

await mkdir(OUT, { recursive: true });
for (const size of [192, 512, 1024]) {
  const png = makePng(size);
  await writeFile(new URL("./icon-" + size + ".png", OUT), png);
}
await writeFile(new URL("./icon-512-maskable.png", OUT), makePng(512));
console.log("PWA icons generated: 192, 512, 512 maskable, 1024");
