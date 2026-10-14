# Bundled extensions

Third-party hydra extensions served by the editor. Files are copied unmodified from
upstream by `scripts/vendor-extensions.sh`; each folder's `SOURCE` names the exact
commit and its `LICENSE` is the upstream license.

| folder | upstream | author | license |
| --- | --- | --- | --- |
| `hyper-hydra/` | https://github.com/geikha/hyper-hydra | geikha | GPL-3.0 |
| `extra-shaders/` | https://gitlab.com/metagrowing/extra-shaders-for-hydra | Thomas Jourdan | AGPL-3.0 |

`effects/` is not vendored: it holds interactive effects written for this editor,
such as `hydra-ink.js` (drag to push the colours around like ink on water).

Do not edit the vendored files here; fix things upstream and re-run
`npm run vendor-extensions`. Which function names load which file is defined in
`src/extensions/registry.js`.
