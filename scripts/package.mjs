// Deterministic ZIP, fixed DOS timestamp, sorted paths, no dependencies or private files.
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { crc32 } from './bytes.mjs';

const root = path.resolve('dist/basis-inspector');
const version = JSON.parse(await readFile(`${root}/manifest.json`, 'utf8')).version;
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid version.');
async function files(dir, prefix = '') {
  const output = [];
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (entry.isSymbolicLink()) throw new Error('Symlinks may not be packaged.');
    const name = prefix + entry.name;
    if (entry.isDirectory()) output.push(...await files(path.join(dir, entry.name), `${name}/`));
    else if (entry.isFile()) output.push(name);
  }
  return output;
}
const entries = await files(root);
const payloads = [], directory = [];
let offset = 0;
for (const name of entries) {
  const filename = Buffer.from(name);
  const data = await readFile(path.join(root, name));
  const packed = deflateRawSync(data, { level: 9 });
  const crc = crc32(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6); local.writeUInt16LE(8, 8); local.writeUInt16LE(33, 12);
  local.writeUInt32LE(crc, 14); local.writeUInt32LE(packed.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(filename.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x800, 8); central.writeUInt16LE(8, 10); central.writeUInt16LE(33, 14);
  central.writeUInt32LE(crc, 16); central.writeUInt32LE(packed.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(filename.length, 28); central.writeUInt32LE(offset, 42);
  payloads.push(local, filename, packed); directory.push(central, filename); offset += local.length + filename.length + packed.length;
}
const central = Buffer.concat(directory);
const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(central.length, 12); end.writeUInt32LE(offset, 16);
await mkdir('artifacts', { recursive: true });
const output = `artifacts/bcf-basis-inspector-${version}.zip`;
await writeFile(output, Buffer.concat([...payloads, central, end]));
console.log(`${output} — ${entries.length} packaged files. Extract, then load the folder in Chrome.`);
