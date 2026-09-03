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
| `deck.c9r.io` | [deck](https://github.com/c9r-io/deck) | `deck-site` | active |
| `docs.c9r.io` | [orchestrator](https://github.com/c9r-io/orchestrator) | `orchestrator-docs` | frozen, read-only |

`docs.c9r.io` is kept online deliberately. The orchestrator repository is
archived, so its `Docs` workflow can no longer run and the last build is final;
the host stays up because the archived README, the changelog and outside links
still point at it.
