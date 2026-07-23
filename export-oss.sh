#!/usr/bin/env bash
set -euo pipefail

#
# Copies the open-source-worthy subset of this repo (Docent: viewer/ + tools/)
# into a second local checkout, stripping everything specific to the
# Processity platform: real doc content, internal CI/deploy config, personal
# path-scanning scripts, and the real generate-docs.config.json (real
# repo/module names).
#
# This repo stays as-is; re-run any time to refresh the OSS mirror.
#
# Usage: bash export-oss.sh [destination-dir]
#

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEST="${1:-$SCRIPT_DIR/../docent}"

echo "Exporting Docent (OSS subset) to: $DEST"
mkdir -p "$DEST"

# --- viewer/ and tools/: the actual product, copied wholesale -----------
rsync -a --delete \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude 'dist-server' \
  "$SCRIPT_DIR/viewer/" "$DEST/viewer/"

rsync -a --delete \
  "$SCRIPT_DIR/tools/" "$DEST/tools/"

# The running Processity instance's own site title doesn't belong in the
# OSS default - give the exported copy a neutral one.
sed -i.bak 's/^siteTitle:.*/siteTitle: Docent/' "$DEST/viewer/viewer.config.yaml"
rm -f "$DEST/viewer/viewer.config.yaml.bak"

# --- Deployment: Dockerfile + generic compose sample, not the internal
# UAT/local compose files (private registry, internal hostnames) ---------
mkdir -p "$DEST/.docker"
cp "$SCRIPT_DIR/.docker/Dockerfile" "$DEST/.docker/Dockerfile"
cp "$SCRIPT_DIR/.docker/docker-compose.example.yml" "$DEST/.docker/docker-compose.example.yml"
[ -f "$SCRIPT_DIR/.dockerignore" ] && cp "$SCRIPT_DIR/.dockerignore" "$DEST/.dockerignore"

# --- Project docs: LICENSE + CONTRIBUTING carry over as-is, README is
# OSS-specific (the internal one documents Processity's own deployment) --
cp "$SCRIPT_DIR/LICENSE" "$DEST/LICENSE"
cp "$SCRIPT_DIR/CONTRIBUTING.md" "$DEST/CONTRIBUTING.md"

cat > "$DEST/README.md" <<'MD'
# Docent

A documentation viewer (`viewer/`) plus a generator pipeline (`tools/`)
that mines your own repos for cross-service flow diagrams — controller
→ command/query → handler → event → downstream consumer — and renders
everything as a searchable, taggable docs site.

## Viewer

```
cd viewer
npm install
npm run dev     # http://localhost:5173
```

Configure in `viewer/viewer.config.yaml`: `docsDir`, excluded globs, and
`docTypes` (glob patterns that assign each doc a tab). The nav tree and
search index rebuild from `docs/` every time the server starts — nothing
to regenerate or cache ahead of time.

## Flow-doc generation

`tools/generate-docs.mjs` scans sibling repos on disk for cross-service
flows and writes markdown pages under `docs/flows/`. It needs a
`generate-docs.config.json` at the repo root (see the template shipped
here) pointing at your own repos:

```json
{
  "projectsRoot": "/absolute/path/to/your/projects",
  "repoNames": ["YourOrg.Backend", "YourOrg.ApiGateway"],
  "apiGatewayConfigDir": "YourOrg.ApiGateway/.docker/local/config",
  "angularSrcDir": "YourOrg.WebApp.Angular/src",
  "monolithRepoName": "YourOrg.Backend"
}
```

```
node tools/generate-docs.mjs
```

Regenerating wipes and rewrites `docs/flows/` wholesale - don't hand-edit
files there.

## Deployment

`.docker/Dockerfile` builds and serves the viewer only. See
`.docker/docker-compose.example.yml` for a minimal local setup.

## Contributing

See `CONTRIBUTING.md`.

## License

Apache-2.0 - see `LICENSE`.
MD

# --- Minimal example docs/ so the viewer has something to render on first run
mkdir -p "$DEST/docs"
cat > "$DEST/docs/index.md" <<'MD'
# Welcome to Docent

This is an example docs/ tree. Point viewer/viewer.config.yaml's `docsDir`
at your own documentation, or run `node tools/generate-docs.mjs` to derive
flow docs from your own repos (see generate-docs.config.json first).
MD

# --- Config: ship a template, never the real repo/path names ------------
cat > "$DEST/generate-docs.config.json" <<'JSON'
{
  "projectsRoot": "/absolute/path/to/your/projects",
  "repoNames": ["YourOrg.Backend", "YourOrg.ApiGateway"],
  "apiGatewayConfigDir": "YourOrg.ApiGateway/.docker/local/config",
  "angularSrcDir": "YourOrg.WebApp.Angular/src",
  "monolithRepoName": "YourOrg.Backend"
}
JSON

echo ""
echo "Done."
echo ""
echo "NOT copied (Processity-internal): docs/ content, .gitea/, .docker/local,"
echo ".docker/uat, generate-ports.sh, push-types.sh, assets/, real generate-docs.config.json values."
echo ""
echo "Still needed before publishing: pick a license year/copyright holder in LICENSE,"
echo "review tools/ comments for any remaining Processity-specific wording, set up CI."
