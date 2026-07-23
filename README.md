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
