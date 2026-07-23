## What does this change

<!-- One or two sentences: what, and why. -->

## Component

- [ ] `viewer/`
- [ ] `tools/`
- [ ] Docs / config only

## Checklist

- [ ] `npx tsc --noEmit` passes for both `viewer/tsconfig.json` and
      `viewer/tsconfig.server.json` (if `viewer/` changed)
- [ ] Ran the affected script(s) against real content to sanity-check
      output (if `tools/` changed — no test suite exists yet)
- [ ] No hardcoded paths or org-specific assumptions introduced in
      `tools/` — machine/org-specific values belong in
      `generate-docs.config.json`, not in a script
