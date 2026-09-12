import { inflateRawSync } from 'node:zlib';

export function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}

/** Read the central directory of a ZIP written by scripts/package.mjs without extra dependencies. */
export function zipEntries(buffer) {
  let end = -1;
  for (let i = buffer.length - 22; i >= 0 && i > buffer.length - 66_000; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new Error('Not a readable ZIP archive: no end-of-central-directory record.');
  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  const entries = [];
  for (let index = 0; index < count; index++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('Corrupt ZIP central directory.');
    const method = buffer.readUInt16LE(offset + 10);
    const crc = buffer.readUInt32LE(offset + 16);
    const compressed = buffer.readUInt32LE(offset + 20);
    const size = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
    entries.push({ name, method, crc, size, compressed, local: buffer.readUInt32LE(offset + 42) });
    offset += 46 + nameLength + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);
  }
  return entries;
}

/** Inflate one entry and verify its recorded CRC-32. Throws on any mismatch. */
export function zipData(buffer, entry) {
  if (entry.method !== 8 && entry.method !== 0) throw new Error(`Unsupported ZIP compression method ${entry.method} in ${entry.name}.`);
  const nameLength = buffer.readUInt16LE(entry.local + 26);
  const extraLength = buffer.readUInt16LE(entry.local + 28);
  const start = entry.local + 30 + nameLength + extraLength;
  const packed = buffer.subarray(start, start + entry.compressed);
  const data = entry.method === 8 ? inflateRawSync(packed) : packed;
  if (data.byteLength !== entry.size || crc32(data) !== entry.crc) throw new Error(`Corrupt or mismatched ZIP entry: ${entry.name}.`);
  return data;
}
