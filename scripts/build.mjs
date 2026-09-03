import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const source = path.join(root, 'src');
const output = path.join(root, 'dist');
const config = JSON.parse(await readFile(path.join(root, 'site.config.json'), 'utf8'));

const values = {
  SITE_URL: config.siteUrl.replace(/\/$/, ''),
  GITHUB_URL: config.githubUrl,
  DECK_URL: config.deckUrl,
  DECK_REPO_URL: config.deckRepoUrl,
  AUTH9_REPO_URL: config.auth9RepoUrl,
  ORCHESTRATOR_DOCS_URL: config.orchestratorDocsUrl,
  ORCHESTRATOR_REPO_URL: config.orchestratorRepoUrl,
};

const textExtensions = new Set(['.html', '.css', '.js', '.json', '.txt', '.xml', '.svg', '']);

async function renderDirectory(from, to) {
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from)) {
    const sourcePath = path.join(from, entry);
    const outputPath = path.join(to, entry);
    const info = await stat(sourcePath);
    if (info.isDirectory()) {
      await renderDirectory(sourcePath, outputPath);
      continue;
    }
    if (!textExtensions.has(path.extname(entry))) {
      await cp(sourcePath, outputPath);
      continue;
    }
    let contents = await readFile(sourcePath, 'utf8');
    for (const [key, value] of Object.entries(values)) {
      contents = contents.replaceAll(`{{${key}}}`, value);
    }
    const unresolved = contents.match(/\{\{[A-Z0-9_]+\}\}/g);
    if (unresolved) throw new Error(`${sourcePath} has unresolved placeholders: ${unresolved.join(', ')}`);
    await writeFile(outputPath, contents);
  }
}

await rm(output, { recursive: true, force: true });
await renderDirectory(source, output);
console.log(`Built c9r portal in ${output}`);
