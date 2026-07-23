# Contributing to Docent

Thanks for considering a contribution. Docent is two pieces:

- `viewer/` — a self-contained Express + vanilla-TS docs site. Renders
  `docs/*.md`, builds nav and search from the folder tree, tabs by
  document type via `viewer.config.yaml`.
- `tools/` — a set of standalone Node scripts that mine a .NET/Angular
  codebase for cross-service flows (controller → command/query → handler
  → event → downstream consumer) and generate markdown pages from them.
  Configured via `generate-docs.config.json`, never hardcoded paths.

## Getting set up

```
cd viewer
npm install
npm run dev
```

This starts the API server (`server/index.ts`, tsx) and the Vite dev
client together, proxied on one port. Point `viewer.config.yaml`'s
`docsDir` at any folder of markdown to try it against real content.

## Making changes

- **Viewer bugs/features**: `viewer/src/` (client) and `viewer/server/`
  (nav scanning, search indexing, API). Run `npx tsc --noEmit` in both
  `tsconfig.json` and `tsconfig.server.json` before opening a PR — no
  build step catches type errors otherwise since `tsx`/Vite don't
  typecheck on their own.
- **Generator changes**: `tools/*.mjs`. These are regex/heuristic based on
  purpose (docs generation, not a compiler) — comments in each file explain
  the specific tradeoff made. Run the script directly against a real
  codebase to sanity-check output; there's no test suite for these yet
  (a welcome contribution).
- Keep `tools/` free of hardcoded paths or org-specific assumptions —
  anything machine- or org-specific belongs in `generate-docs.config.json`,
  not in the script.

## Pull requests

- Keep PRs focused — one behavior change per PR is easier to review than
  a bundle.
- Explain the *why* in the description, especially for anything in
  `tools/` where the "right" heuristic is a judgment call.
- No CI is wired up yet; typechecking both tsconfigs is the current bar.

## Reporting issues

Include: what you expected, what happened instead, and (for `tools/`
issues) enough of the surrounding code shape to reproduce — these scripts
work off real C#/TypeScript syntax patterns, so a snippet matters more
than a description.
