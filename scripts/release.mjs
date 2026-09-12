// The publishable Chrome Web Store package that lives in the repository.
//
//   npm run release:gen     # build, package, then copy the ZIP into release/ with its checksum
//   npm run release:check   # build, package, then prove release/ matches the fresh build exactly
//
// release/ is committed on purpose: this is the file a publisher uploads to the
// Chrome Web Store Developer Dashboard, so it must not depend on someone's local build.
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { zipData, zipEntries } from './bytes.mjs';

const root = path.resolve(import.meta.dirname, '..');
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

export async function releasePaths() {
  const { version } = JSON.parse(await readFile(path.join(root, 'extension/manifest.json'), 'utf8'));
  const filename = `spicyextension-${version}.zip`;
  return { version, filename, built: path.join(root, 'artifacts', filename), committed: path.join(root, 'release', filename) };
}

/** Prove the ZIP is exactly the built runtime folder: same files, same bytes, nothing extra. */
export async function verifyPackage(zipPath, distPath = path.join(root, 'dist/spicyextension')) {
  const buffer = await readFile(zipPath);
  const entries = zipEntries(buffer);
  const problems = [];
  for (const entry of entries) {
    if (entry.name.includes('..') || entry.name.startsWith('/')) { problems.push(`unsafe path ${entry.name}`); continue; }
    let expected;
    try { expected = await readFile(path.join(distPath, entry.name)); }
    catch { problems.push(`${entry.name} is not part of the built runtime`); continue; }
    if (!expected.equals(zipData(buffer, entry))) problems.push(`${entry.name} differs from the built file`);
  }
  const manifest = JSON.parse(await readFile(path.join(distPath, 'manifest.json'), 'utf8'));
  if (!entries.some((entry) => entry.name === 'manifest.json')) problems.push('manifest.json is missing from the archive root');
  if (manifest.name !== 'SpicyExtension') problems.push(`unexpected Chrome Web Store item name: ${manifest.name}`);
  const forbidden = /(?:^|\/)(?:tests?|fixtures?|node_modules|src|docs|\.env|package-lock\.json|.*\.map|.*\.ts)$/;
  for (const entry of entries) if (forbidden.test(entry.name)) problems.push(`${entry.name} must not be published`);
  if (problems.length) throw new Error(`${path.relative(root, zipPath)} is not publishable: ${problems.join('; ')}.`);
  return { buffer, names: entries.map((entry) => entry.name).sort((a, b) => a.localeCompare(b, 'en')), sha256: sha256(buffer) };
}

async function main(mode) {
  const pkg = await releasePaths();
  const built = await verifyPackage(pkg.built);
  if (mode === '--sync') {
    await mkdir(path.join(root, 'release'), { recursive: true });
    for (const entry of await readdir(path.join(root, 'release'))) {
      if (/\.zip$/.test(entry) && entry !== pkg.filename) await rm(path.join(root, 'release', entry));
    }
    await copyFile(pkg.built, pkg.committed);
    await writeFile(path.join(root, 'release', 'checksums.txt'), `${built.sha256}  ${pkg.filename}\n`);
    console.log(`release/${pkg.filename} written: ${built.buffer.byteLength} bytes, ${built.names.length} runtime files.`);
    console.log(`SHA-256 ${built.sha256}`);
    return;
  }
  let committed;
  try { committed = await readFile(pkg.committed); }
  catch { throw new Error(`Missing release/${pkg.filename}. Run npm run release:gen and commit the package.`); }
  if (!committed.equals(built.buffer)) throw new Error(`release/${pkg.filename} is stale: it differs from the freshly built package. Run npm run release:gen and commit the result.`);
  const record = (await readFile(path.join(root, 'release', 'checksums.txt'), 'utf8')).trim().split(/\s+/);
  if (record[0] !== built.sha256 || record[1] !== pkg.filename) throw new Error(`release/checksums.txt does not describe ${pkg.filename}.`);
  const checked = await verifyPackage(pkg.committed);
  console.log(`release/${pkg.filename} is current and publishable: ${checked.buffer.byteLength} bytes, ${checked.names.length} runtime files, no source, test or map files.`);
  console.log(`SHA-256 ${checked.sha256}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length !== 1 || (args[0] !== '--sync' && args[0] !== '--check')) throw new Error('Usage: node scripts/release.mjs --sync | --check');
  await main(args[0]);
}
