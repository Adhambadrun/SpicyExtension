import { build } from 'esbuild';
import { cp, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { generateIcons } from './icons.mjs';

await generateIcons();
const out = path.resolve('dist/spicyextension');
const manifest = JSON.parse(await readFile('extension/manifest.json', 'utf8'));
if (manifest.manifest_version !== 3 || manifest.description.length > 132) throw new Error('Invalid MV3 manifest or description length.');
if (JSON.stringify(manifest.host_permissions) !== JSON.stringify(['https://agentsearch.vercel.app/*'])) throw new Error('Unexpected host permission.');
if (manifest.permissions?.length || manifest.web_accessible_resources?.length || manifest.externally_connectable) throw new Error('Unexpected privileged or externally exposed capture panel surface.');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await Promise.all([
  build({ entryPoints: ['extension/src/background/index.ts'], outfile: `${out}/background.js`, bundle: true, format: 'esm', target: 'chrome120', minify: true, legalComments: 'none' }),
  build({ entryPoints: ['extension/src/content/index.ts'], outfile: `${out}/content.js`, bundle: true, format: 'iife', target: 'chrome120', minify: true, loader: { '.css': 'text', '.png': 'dataurl' }, legalComments: 'none' }),
  build({ entryPoints: ['extension/src/popup/index.ts'], outfile: `${out}/popup.js`, bundle: true, format: 'iife', target: 'chrome120', minify: true, legalComments: 'none' }),
]);
await cp('extension/manifest.json', `${out}/manifest.json`);
await cp('extension/src/styles/terminal.css', `${out}/terminal.css`);
await cp('extension/assets', `${out}/assets`, { recursive: true });
for (const file of await readdir('extension/pages')) await cp(`extension/pages/${file}`, `${out}/${file}`);
for (const file of ['background.js', 'content.js', 'popup.js']) {
  const code = await readFile(`${out}/${file}`, 'utf8');
  if (/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(|\.innerHTML\s*=|\beval\s*\(|new Function\s*\(/.test(code)) throw new Error(`Unexpected network or unsafe execution primitive in ${file}`);
}
console.log(`Built ${out}\nCapture tool only — not the finished flight assistant.`);
