// Regenerates the raster icons from the committed SVG sources.
// macOS only: uses Quick Look to rasterise and sips to crop, so the raster
// assets stay derivable rather than being unexplained binaries in the tree.
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const assets = path.join(root, 'src', 'assets');
const work = await mkdtemp(path.join(tmpdir(), 'c9r-icons-'));

async function rasterise(svg, size) {
  await exec('qlmanage', ['-t', '-s', String(size), '-o', work, svg]);
  return path.join(work, `${path.basename(svg)}.png`);
}

// ICO with a single embedded PNG frame: understood by every browser that still
// asks for /favicon.ico, and avoids hand-rolling a BMP encoder.
function wrapIco(png, size) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(size >= 256 ? 0 : size, 6);
  header.writeUInt8(size >= 256 ? 0 : size, 7);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, png]);
}

const icon = path.join(assets, 'icon.svg');
await exec('cp', [await rasterise(icon, 180), path.join(assets, 'icon-180.png')]);
await writeFile(path.join(root, 'src', 'favicon.ico'), wrapIco(await readFile(await rasterise(icon, 32)), 32));

// Quick Look pads to a square canvas, so crop the 1200x1200 render back to the
// 1200x630 the Open Graph spec expects.
const og = path.join(assets, 'og.png');
await exec('cp', [await rasterise(path.join(here, 'og.svg'), 1200), og]);
await exec('sips', ['-c', '630', '1200', og]);

await rm(work, { recursive: true, force: true });
console.log('Regenerated favicon.ico, icon-180.png, og.png');
