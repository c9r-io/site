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

async function rasteriseClean(svg, size) {
  return stripPng(await readFile(await rasterise(svg, size)));
}

// Quick Look and sips leave EXIF and Adobe XMP behind, and sips writes the
// pre-crop dimensions into them, so the metadata is both unnecessary and wrong.
// Keeping only the chunks that carry pixels means the assets say nothing about
// the machine that produced them. Chunk CRCs are per-chunk, so dropping whole
// chunks needs no recalculation.
const KEEP = new Set(['IHDR', 'PLTE', 'tRNS', 'sRGB', 'IDAT', 'IEND']);

function stripPng(png) {
  const signature = png.subarray(0, 8);
  const kept = [signature];
  let at = 8;
  while (at < png.length) {
    const length = png.readUInt32BE(at);
    const type = png.toString('latin1', at + 4, at + 8);
    const end = at + 12 + length;
    if (KEEP.has(type)) kept.push(png.subarray(at, end));
    at = end;
    if (type === 'IEND') break;
  }
  return Buffer.concat(kept);
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
await writeFile(path.join(assets, 'icon-180.png'), await rasteriseClean(icon, 180));
await writeFile(path.join(root, 'src', 'favicon.ico'), wrapIco(await rasteriseClean(icon, 32), 32));

// Quick Look pads to a square canvas, so crop the 1200x1200 render back to the
// 1200x630 the Open Graph spec expects. sips only works on a file, and it is
// what adds the stale XMP, so the strip has to happen after the crop.
const og = path.join(assets, 'og.png');
await exec('cp', [await rasterise(path.join(here, 'og.svg'), 1200), og]);
await exec('sips', ['-c', '630', '1200', og]);
await writeFile(og, stripPng(await readFile(og)));

await rm(work, { recursive: true, force: true });
console.log('Regenerated favicon.ico, icon-180.png, og.png');
