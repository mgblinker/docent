---
type: architecture
audience: public
---

# Drive Frontend Architecture

## Overview

"Drive" in the browser is two pieces, not one:

```
Processity.WebApp.Angular (host)
  src/app/drive/
    drive-remote.ts              — resolves remoteEntry.json URL per env
    drive-navigation-section/    — nav entry into the Drive module
        ↓ Module Federation
Processity.Drive/webapp (standalone micro-frontend, own deployment)
    Angular 22, @angular-architects/native-federation, @microsoft/signalr,
    @processity-apps/web-shared
        ↓
FileService (/file-storage/*, via ApiGateway)
```

The standalone `Processity.Drive/webapp` (`projects/drive`) is its own
deployable, built and served independently (`drive.processity.{dev,ch}`
etc.), and loaded into the main webapp host at runtime via Module
Federation rather than bundled at build time. `drive-remote.ts` in the
host resolves that `remoteEntry.json` URL per environment (localhost
port for local dev, `.localdev`/`.dev`/`-uat.ch`/prod hostnames
elsewhere).

See [FileService Architecture](../fileservice/architecture.md) for the
backend this frontend talks to, and
[Authentication Architecture](../authentication/architecture.md) for the
session the webapp shares with the rest of the platform (no separate
Drive login).

---

## Licensing gap (known, tracked)

Drive is licensed as a separate flat `"drive"` feature (see
[Licensing Service](../licensingservice/README.md) and
[FileService Architecture](../fileservice/architecture.md#licensing)),
but the host-side `drive-navigation-section` currently shows the nav
entry ungated — it doesn't check whether the tenant actually holds the
`drive` feature before offering the link. This is the same gap already
tracked as the no-base-license/Drive-assignment tenant-admin flow and the
Billing drive-signup gap — not duplicated in detail here, see those items
in this repo's backlog for the fix plan.

## Related components

- [FileService Architecture](../fileservice/architecture.md) — backend API
- [Licensing Service](../licensingservice/README.md) — `drive` feature flag
- [WebApp.Angular Architecture](../webapp-angular/architecture.md) — the host shell Drive federates into
