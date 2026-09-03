# c9r.io

Source for the entry page at `https://c9r.io`. It routes people to the
individual projects and says what they have in common; each project keeps its
own site, docs and release channel.

The page uses no framework, no runtime JavaScript, no analytics, cookies,
forms, third-party fonts or remote assets. Common external URLs live in
`site.config.json`; English is at the root and Simplified Chinese under `/zh/`.

## Local review

```sh
npm test        # builds, then asserts routes, links, privacy and headers
npm run build
npm run preview # http://127.0.0.1:4173, override with PORT
```

## Icons

`src/assets/icon.svg` and `scripts/og.svg` are the sources of truth. The raster
files beside them are generated, not hand-edited:

```sh
npm run icons   # macOS only: Quick Look to rasterise, sips to crop
```

## Deployment

Do not publish from a developer shell. The reviewed path is the manual
`deploy` workflow, which runs the tests and then uploads to the Cloudflare
Pages project `c9r-site` behind the `website-production` environment.

## Related sites

| Host | Project | Pages project | State |
| --- | --- | --- | --- |
| `c9r.io` | this entry page | `c9r-site` | active |
| `www.c9r.io` | 301 to the apex | — | active |
| `deck.c9r.io` | [deck](https://github.com/c9r-io/deck) | `deck-site` | active |
| `docs.c9r.io` | [orchestrator](https://github.com/c9r-io/orchestrator) | `orchestrator-docs` | frozen, read-only |

`docs.c9r.io` is kept online deliberately: the archived README, the changelog
and outside links still point at it, and an archived repository's README cannot
be edited to say otherwise.

Its content is final, but not because archiving disables CI — it does not.
Archiving blocks pushes and pull requests; Actions stays enabled and scheduled
workflows keep firing. The `Docs` workflow simply has nothing left to trigger
it: it runs on `push` to `main`, which archiving does block, and on
`workflow_dispatch`. Its Cloudflare token has since been deleted, so a manual
dispatch would fail at the deploy step rather than republish.

## Zone state this site depends on

Two zone-level rules are load-bearing. Neither lives in this repository, so
they are recorded here; the account id and owner are not, because this file is
public and deck learned that the hard way.

- Configuration Rule `c9r.io — no Web Analytics RUM injection`, matching
  `http.host eq "c9r.io" or http.host eq "www.c9r.io"`, disables RUM. The zone
  has an account-level Web Analytics site configured on the apex with automatic
  injection, created years ago for the orchestrator docs. Without this rule
  Cloudflare injects `static.cloudflareinsights.com/beacon.min.js` into these
  responses the moment the hostname goes live, and the footer's "requests
  nothing from a third party" becomes false. deck carries the same rule for its
  own hostname; `docs.c9r.io` still serves its beacon, which is why the rule is
  scoped rather than zone-wide.
- Redirect Rule `www.c9r.io → c9r.io`, a 301 preserving path and query, so the
  two hostnames do not serve the same page. `rel=canonical` points at the apex
  independently.

Both hostnames are Pages custom domains on `c9r-site`; Cloudflare created the
`CNAME @` and `CNAME www` records when they were attached.

Verify after any change, with a browser `Accept` and `User-Agent` — Cloudflare
only injects for browser-shaped requests, and a passing CSP is not evidence:

```sh
curl -s -H 'Accept: text/html' -A 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' \
  https://c9r.io/ | grep -c '<script'   # expect 0
```
