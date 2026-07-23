# Security Policy

## Reporting a Vulnerability

If you find a security issue in Docent, please report it privately
rather than opening a public issue:

- Use GitHub's **[Report a vulnerability](../../security/advisories/new)**
  feature (Security tab → Advisories → "Report a vulnerability"), or
- Open a GitHub issue and mark it clearly as security-sensitive with no
  exploit details, so a maintainer can follow up privately.

Please include:

- What component is affected (`viewer/` or `tools/`)
- Steps to reproduce, or a minimal example
- The potential impact as you understand it

## Scope

A few things worth knowing up front rather than reporting as surprises
(see the README's Limitations section for the full list):

- **The viewer has no built-in authentication.** Anyone who can reach the
  deployed port can read everything under `docsDir`. This is by design,
  not a bug — put it behind your own auth/reverse proxy if that matters
  for your deployment.
- **`tools/generate-docs.mjs` reads local source files on disk** (the
  repos listed in `generate-docs.config.json`). It's a local dev-time
  script, not something exposed over a network in normal use.

## Supported Versions

This project doesn't yet have a versioned release policy — security
fixes land on `main`. That will be revisited once tagged releases exist.
