import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const dist = path.join(root, 'dist');
const config = JSON.parse(await readFile(path.join(root, 'site.config.json'), 'utf8'));

await exec(process.execPath, ['scripts/build.mjs'], { cwd: root });

const pages = ['index.html', 'zh/index.html', '404.html'];
const localised = ['index.html', 'zh/index.html'];

test('build emits every public route and infrastructure file', async () => {
  const files = [...pages, 'assets/site.css', 'assets/icon.svg', 'assets/icon-180.png',
    'assets/og.png', 'favicon.ico', 'robots.txt', 'sitemap.xml', '_headers', '_redirects'];
  for (const file of files) {
    assert.equal((await stat(path.join(dist, file))).isFile(), true, file);
  }
});

test('pages declare language, metadata, and fully resolved config', async () => {
  const english = await readFile(path.join(dist, 'index.html'), 'utf8');
  const chinese = await readFile(path.join(dist, 'zh/index.html'), 'utf8');
  assert.match(english, /<html lang="en">/);
  assert.match(chinese, /<html lang="zh-Hans">/);
  for (const html of [english, chinese]) {
    assert.doesNotMatch(html, /\{\{[A-Z0-9_]+\}\}/);
    assert.match(html, /rel="canonical"/);
    assert.match(html, /hreflang="en"/);
    assert.match(html, /hreflang="zh-Hans"/);
    assert.ok(html.includes(`${config.siteUrl}/assets/og.png`));
  }
});

// The portal's only job is to route people onward, so a missing destination is
// a broken portal even when the page still renders.
test('both locales link to every project destination', async () => {
  const destinations = [config.githubUrl, config.deckUrl, config.deckRepoUrl,
    config.auth9RepoUrl, config.orchestratorDocsUrl, config.orchestratorRepoUrl];
  for (const route of localised) {
    const html = await readFile(path.join(dist, route), 'utf8');
    for (const destination of destinations) {
      assert.ok(html.includes(`href="${destination}"`), `${route} -> ${destination}`);
    }
  }
});

test('orchestrator is presented as archived and deck as active', async () => {
  const english = await readFile(path.join(dist, 'index.html'), 'utf8');
  const chinese = await readFile(path.join(dist, 'zh/index.html'), 'utf8');
  assert.match(english, /<span class="status">Archived<\/span>/);
  assert.match(chinese, /<span class="status">已归档<\/span>/);
  assert.match(english, /repository is\s+archived/);
  assert.match(chinese, /仓库已归档/);
});

test('no analytics, cookies, remote assets, or executable JavaScript', async () => {
  for (const route of pages) {
    const html = await readFile(path.join(dist, route), 'utf8');
    assert.doesNotMatch(html, /<script\b/i, route);
    assert.doesNotMatch(html, /google-analytics|googletagmanager|cloudflareinsights|plausible|posthog|segment\.com/i, route);
    assert.doesNotMatch(html, /<link[^>]+(?:font|preconnect)/i, route);
    assert.doesNotMatch(html, /https?:\/\/[^"']+\.(?:js|css|woff2?)/i, route);
  }
});

test('every page declares locally hosted icons', async () => {
  for (const route of pages) {
    const html = await readFile(path.join(dist, route), 'utf8');
    assert.match(html, /<link rel="icon" href="\/favicon\.ico"/, route);
    assert.match(html, /<link rel="icon" href="\/assets\/icon\.svg"/, route);
    assert.match(html, /<link rel="apple-touch-icon" href="\/assets\/icon-180\.png"/, route);
  }
});

test('security headers prohibit telemetry connections', async () => {
  const headers = await readFile(path.join(dist, '_headers'), 'utf8');
  assert.match(headers, /connect-src 'none'/);
  assert.match(headers, /frame-ancestors 'none'/);
  assert.match(headers, /form-action 'none'/);
});

test('every root-relative link resolves in the static build', async () => {
  for (const route of pages) {
    const html = await readFile(path.join(dist, route), 'utf8');
    for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (!href.startsWith('/') || href.startsWith('//')) continue;
      const pagePath = href.split('#', 1)[0];
      if (!pagePath) continue;
      const bare = pagePath.replace(/^\//, '').replace(/\/$/, '');
      const relative = pagePath === '/' ? 'index.html' : path.extname(bare) ? bare : `${bare}/index.html`;
      assert.equal((await stat(path.join(dist, relative))).isFile(), true, `${route} -> ${href}`);
    }
  }
});
