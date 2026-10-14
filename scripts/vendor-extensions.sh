#!/usr/bin/env bash
# Copies the bundled hydra extensions into public/extensions/, the community
# extension catalog into public/hydra-extensions/ and the editor translations into
# public/l10n/ from their upstream repositories, pinned to the commits below, so the
# editor works offline. Files are copied unmodified.
#
# To update: change a commit hash, run `npm run vendor-extensions`, then check that
# src/extensions/registry.js still lists the right function names.
set -euo pipefail

HYPER_HYDRA_REPO="https://github.com/geikha/hyper-hydra"
HYPER_HYDRA_COMMIT="e48aacbe775cd6731c50cc327ed86cd7e7beab6c"

EXTRA_SHADERS_REPO="https://gitlab.com/metagrowing/extra-shaders-for-hydra.git"
EXTRA_SHADERS_COMMIT="a0a2898b2a4048ae78b671a006f1fbd64c92a9ee"

CATALOG_REPO="https://github.com/hydra-synth/hydra-extensions"
CATALOG_COMMIT="c8bb1b6f71d3abcfc8beb583b7e2d169eb23e612"

L10N_REPO="https://github.com/hydra-synth/l10n"
L10N_COMMIT="0a91e4bc9c75834b453b574acfeb8ff88d815232"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/public/extensions"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

fetch() { # repo commit dir
  git init -q "$3"
  git -C "$3" fetch -q --depth 1 "$1" "$2"
  git -C "$3" checkout -q FETCH_HEAD
}

fetch "$HYPER_HYDRA_REPO" "$HYPER_HYDRA_COMMIT" "$TMP/hyper-hydra"
rm -rf "$DEST/hyper-hydra" && mkdir -p "$DEST/hyper-hydra"
cp "$TMP"/hyper-hydra/hydra-*.js "$TMP/hyper-hydra/LICENSE" "$DEST/hyper-hydra/"
echo "$HYPER_HYDRA_REPO/tree/$HYPER_HYDRA_COMMIT" > "$DEST/hyper-hydra/SOURCE"

fetch "$EXTRA_SHADERS_REPO" "$EXTRA_SHADERS_COMMIT" "$TMP/extra-shaders"
rm -rf "$DEST/extra-shaders" && mkdir -p "$DEST/extra-shaders"
cp "$TMP"/extra-shaders/lib/lib-*.js "$TMP/extra-shaders/LICENSE" "$DEST/extra-shaders/"
echo "${EXTRA_SHADERS_REPO%.git}/-/tree/$EXTRA_SHADERS_COMMIT" > "$DEST/extra-shaders/SOURCE"

fetch "$CATALOG_REPO" "$CATALOG_COMMIT" "$TMP/catalog"
CATALOG_DEST="$ROOT/public/hydra-extensions"
rm -rf "$CATALOG_DEST" && mkdir -p "$CATALOG_DEST"
cp "$TMP"/catalog/{extensions,external-libraries,examples}.json "$CATALOG_DEST/"
cp -r "$TMP/catalog/thumbnails" "$CATALOG_DEST/"
echo "$CATALOG_REPO/tree/$CATALOG_COMMIT" > "$CATALOG_DEST/SOURCE"

fetch "$L10N_REPO" "$L10N_COMMIT" "$TMP/l10n"
L10N_DEST="$ROOT/public/l10n"
rm -rf "$L10N_DEST" && mkdir -p "$L10N_DEST"
for file in "$TMP"/l10n/*/editor.json; do
  lang="$(basename "$(dirname "$file")")"
  mkdir -p "$L10N_DEST/$lang" && cp "$file" "$L10N_DEST/$lang/"
done
echo "$L10N_REPO/tree/$L10N_COMMIT" > "$L10N_DEST/SOURCE"

echo "vendored extensions into $DEST, catalog into $CATALOG_DEST, translations into $L10N_DEST"
