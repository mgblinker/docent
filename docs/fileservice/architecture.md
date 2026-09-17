---
type: architecture
---

# FileService Architecture

## Overview

FileService ("Processity Drive"'s backend) is the object-storage-backed
file and folder service every other Processity product attaches files to.
It always provisions for every tenant — file attachments on module records
(e.g. a Planning issue, an ImmoBroker listing) work regardless of whether
the tenant has bought the standalone Drive add-on.

```
Sync Client ──┐
              ├─→ ApiGateway (/file-storage/*) → FileService → Postgres (metadata)
Drive webapp ─┘                                              → SeaweedFS (object bytes, S3 API)
Other services (Planning, ImmoBroker, ...) ─→ FileLink API ──┘
```

Object storage is SeaweedFS running in S3-compatible mode
(`ObjectStorage__ServiceUrl/Region/BucketName/AccessKeyId/SecretAccessKey`),
not a hyperscaler bucket — same pattern AvatarService uses for its own
separate bucket.

---

## Domain model

| Entity | Purpose |
| --- | --- |
| `StoredFile` | File metadata: name, size, content type, current version pointer, owning folder |
| `FileFolder` | Folder tree; every tenant gets a `MyFilesRoot` and `SharedRoot` |
| `FilePermission` | Per-file/folder grants (share with a user, revoke) |
| `FileLink` | Attaches a file to a record in another service (see below) |
| `FileChangeLog` | Append-only change feed the Sync Client's delta sync reads from |

Multi-tenancy is the standard Finbuckle pattern (`IMultiTenantContextAccessor<TenantContext>`)
— see [Authentication Architecture](../authentication/architecture.md) for
how the tenant is resolved from the JWT. Files/folders use a soft-delete
(bin/purge) pattern rather than hard delete.

### Attaching files to other services' records

`FileLink`'s `GetRelatedFiles` feature is the mechanism the rest of the
platform uses to keep uploads "in a sensible location" while still
surfacing them on the record they belong to: a service creates a
`FileLink` between its own record ID and a `StoredFile`, then queries
`GetRelatedFiles` to render that record's attachments. The file itself
still lives in the uploading tenant's normal folder structure — linking
doesn't move it.

### In-browser editing (WOPI)

A `Wopi` feature set (`CheckFileInfo`, `Lock`/`Unlock`/`RefreshLock`,
`PutFile`, `IssueAccessToken`) implements the WOPI protocol so Office
documents can be edited in-browser via Collabora, without a full
download/re-upload round trip.

### Sync delta feed

`Changes`/`Manifest` are what the [Sync Client](../syncclient/architecture.md)
polls: `Manifest` gives a full-tree snapshot for initial sync,
`GetChanges` gives an incremental delta since a given watermark
(backed by `FileChangeLog`) for everything after.

---

## Licensing

FileService itself is `IsRequired = true` in its
[TenantProvisioning](../tenantprovisioning/scope.md) module — it
provisions for every tenant unconditionally, since attachments on other
services' records must work with no Drive purchase at all.

`"drive"` is a separate flat [Licensing](../licensingservice/README.md)
feature (no roles/tiers) that gates only the standalone Drive experience
— the [Drive frontend](../drive/architecture.md) and desktop
[Sync Client](../syncclient/architecture.md). A tenant without the
`drive` feature can still have files attached to their Planning/ImmoBroker
records; they just can't use the standalone Drive apps.

---

## Exposure via ApiGateway

Routed through `ocelot.file-storage.json` (`/file-storage/{everything}` →
`processity-filestorage-service`), plus a discovery route at
`/file-storage/v1.0/licensing/features/fileservice`. `ocelot.drive.json`
is a different, narrower thing — it only handles standalone-tenant
bootstrap (`/drive/setup/bootstrap`, `/drive/auth/bootstrap-setup*`), not
general FileService traffic.

## Related components

- [Authentication Architecture](../authentication/architecture.md) — cookie/JWT flow FileService validates like every other service
- [TenantProvisioning](../tenantprovisioning/scope.md) — where the `IsRequired=true` provisioning module is registered
- [Licensing Service](../licensingservice/README.md) — the `drive` feature flag
- [Sync Client](../syncclient/architecture.md) — consumes the Changes/Manifest delta feed
- [Drive frontend](../drive/architecture.md) — standalone webapp consuming this service
