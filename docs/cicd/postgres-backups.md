---
type: howto
---

# Prod Postgres Backups: Automation, Encryption, Rotation

> Runbook. Nothing here runs until you complete the one-time setup below and
> merge the workflow. Status: ready to deploy, not yet deployed (as of
> 2026-09-27).

## What this is

Per-service, not one big job: each repo with a prod postgres container opts
in with its own thin `backup-prod.yml` (own cron, can be disabled or
retimed independently). It calls a shared reusable workflow,
`Processity.CICD/.gitea/workflows/shared/postgres-backup-pipeline.yml`,
which runs `EnvironmentSetup/DockerBackup/docker_env_backup.py --container
<this service's db>` against the `processity-prod` docker context:
`pg_dump -Fc -n <schema>` for **every database and every schema** in that
container (`public` + one schema per tenant), encrypts **each dump separately**
with `age`, uploads them to a dedicated Infomaniak bucket as
`processity-prod/<service>/<db>/<schema>/<timestamp>.dump.age` (plus
`processity-prod/<service>/_manifest/<timestamp>.json.age`), prunes local
artifacts older than 14 days. One object per tenant so a single customer's
backups can be handed over or deleted without touching anyone else's (GDPR,
see "Tenant termination" below).

Same pattern the service CI pipelines already use for build/deploy
(`uses: Public/Processity.CICD/.gitea/workflows/shared/docker-pipeline.yml@main`
+ `secrets: inherit`) -- a fix to the shared pipeline applies to every
service's next run without touching 17 files.

Enabled (2026-09-27) on every prod service except LoggingService (excluded
per user decision): Authentication, LicensingService, TenantProvisioning,
SettingsService, FileService, IntegrationService, CommunicationService,
MappingService, AutomationService, RealtimeInteraction, MarketingService,
Backend (core-apps), Calendar, ImmoBroker, KeyVault, Planning, Gardening.
AvatarService, EventBus and PdfService have no postgres container in prod,
so nothing to add there.

Covers control **C2** (backup encryption) from
`docs/security/cryptography-policy.md`.

## Adding or changing a service

- **New service with a prod postgres container:** copy any existing
  `backup-prod.yml` (e.g. `Processity.Authentication/.gitea/workflows/backup-prod.yml`)
  into the new repo, change `container_name` and `s3_prefix`.
- **Different cadence for one service:** edit that repo's own `cron:` line
  only -- it's independent of every other service's schedule.
- **Opt a service out:** delete its `backup-prod.yml`. Nothing else to touch.
- **Change what every service does** (retention days, encryption, bucket):
  edit `postgres-backup-pipeline.yml` once in `Processity.CICD`.

## One-time setup

### 1. Generate the age keypair

On a machine that is **not** prod-server and **not** the act-runner (a
laptop, done once):

```bash
brew install age   # or: apt install age
age-keygen -o processity-backup-key.txt
```

Output looks like:

```
# created: 2026-09-27T12:00:00Z
# public key: age1qtyv...
AGE-SECRET-KEY-1...
```

- **Public key** (`age1...`) — goes into the Gitea Actions variable below.
  It's not secret; it can only encrypt, not decrypt.
- **Private key** (`AGE-SECRET-KEY-1...`) — this is the only thing that can
  decrypt a backup. Store it in the password manager, split between the two
  key custodians per `cryptography-policy.md` section 4. **Never put it on
  prod-server, the act-runner, or in any Gitea secret.** If it's lost, every
  backup encrypted with it is permanently unrecoverable — there is no
  provider-side recovery for `age`.
- Delete `processity-backup-key.txt` from disk once it's in the password
  manager.

### 2. Create the backup bucket

Same flow as `docs/cicd/infomaniak-object-storage.md`, separate bucket so
backup credentials are scoped away from the FileService object store:

```bash
openstack --os-cloud PCP-XXXXXXX container create processity-backups
openstack --os-cloud PCP-XXXXXXX ec2 credentials create
```

### 3. Offsite retention — scripted, not a bucket lifecycle rule

Tried a bucket lifecycle rule first; Infomaniak's RadosGW rejects
`PutBucketLifecycleConfiguration` with `MalformedXML` regardless of schema
variant tried (confirmed 2026-09-27). So retention is scripted instead:
`docker_env_backup.py --s3-prune-days N` lists objects under `--s3-prefix`
and deletes anything older than N days after each upload. This needs the
backup credentials (step 2) to have delete permission on the bucket, not
just write — `ec2 credentials create` grants full access to the project's
own containers, so this is already covered.

Default is 90 days (`s3_prune_days` input on the shared pipeline, per
service if one needs something else). Adjust per your actual retention
requirement — ISO 27001 doesn't fix a number, pick one from the risk
assessment.

If Infomaniak ever fixes lifecycle support, this can move back to a
provider-side rule; until then the scripted prune is the retention
mechanism, so don't skip `--s3-prune-days` when calling the script
standalone.

### 4. Gitea secrets (org level, not per-repo)

17 repos call the shared pipeline via `secrets: inherit`, so these need to
resolve the same way in every one of them -- set them once at the **org**
level (`Public` org settings in Gitea), not on `Processity.CICD` alone:

| Name | Value |
|---|---|
| `BACKUP_AGE_PUBLIC_KEY` | the `age1...` public key from step 1 (kept as a secret rather than a variable purely so it inherits the same way as the others below -- it isn't actually sensitive) |
| `BACKUP_S3_ACCESS_KEY_ID` | from step 2's `ec2 credentials create` |
| `BACKUP_S3_SECRET_ACCESS_KEY` | from step 2's `ec2 credentials create` |
| `DEVENV_CHECKOUT_TOKEN` | GitHub PAT, read-only, scoped to `mgblinker/DevEnvironment` only (that repo holds the backup script and isn't on this Gitea instance) |

`SLACK_BOT_TOKEN` already exists as an org secret (used by other pipelines).
`vars.SLACK_CHANNEL` stays **per-repo** on purpose, so a backup failure
alerts to that service's own channel, same as its CI failures do.

### 5. Docker context — nothing to set up, it's created fresh per run

Confirmed 2026-09-27: act-runner jobs run in a fresh container each time, so
a persistent named context (`processity-prod`, set up once via
`setup-docker-contexts.sh`) isn't visible inside the job -- that script only
configures contexts for manual/local use. The shared pipeline instead builds
one per run, the same way `remote_deploy.sh` already does for regular
deploys: `webfactory/ssh-agent` loads `secrets.REMOTE_SSH_PRIVATE_KEY`,
`secrets.SSH_KNOWN_HOSTS` is materialized to `~/.ssh/known_hosts`, then
`docker context create backup-${{ github.run_id }} --docker "host=ssh://..."`.

Both secrets already exist (every service's own prod deploy uses them) and
`vars.PROD_REMOTE_HOST` is already set per-repo for the same reason --
nothing new to create here, `secrets: inherit` and each `backup-prod.yml`
passing `remote_host: ${{ vars.PROD_REMOTE_HOST }}` cover it.

### 6. Merge and verify

- Merge `postgres-backup-prod.yml`.
- Trigger it once manually (`workflow_dispatch`) rather than waiting for
  02:30 UTC, and check the run log for a clean upload.
- `aws s3 ls s3://processity-backups/processity-prod/<service>/ --recursive --endpoint-url https://s3.pub1.infomaniak.cloud`
  should show one `<db>/<schema>/<timestamp>.dump.age` object per schema
  (the real db, e.g. `gardening_db`, with a `public` entry plus one per
  tenant) and a `_manifest/<timestamp>.json.age`. A listing with only one
  tiny object means the wrong database was dumped.

## Restore procedure (test this once a year, per policy section 4)

One tenant (the common case):

```bash
aws s3 cp s3://processity-backups/processity-prod/<service>/<db>/<schema>/<timestamp>.dump.age . \
  --endpoint-url https://s3.pub1.infomaniak.cloud
age -d -i processity-backup-key.txt -o tenant.dump <timestamp>.dump.age
python3 docker_env_restore.py --dump tenant.dump --container <db-container> --db <db> --context <target>        # dry-run
python3 docker_env_restore.py --dump tenant.dump --container <db-container> --db <db> --context <target> --yes
```

Only that schema's objects are touched, other tenants are unaffected. For a
whole service, restore `public` first, then each tenant schema. Delete
`tenant.dump` afterwards (plaintext customer data).

Backups from before the per-tenant layout (2026-10) are single
`<timestamp>.tar.gz.age` archives containing every tenant -- see "Known gaps".

## Tenant termination (GDPR)

Backups are per tenant schema, so a customer can be handed their data and
then removed without affecting anyone else. Do this per service that holds
tenant data, for `<schema>` = the tenant's schema name:

**Hand over** (customer gets a copy of their database backups):

```bash
aws s3 ls s3://processity-backups/processity-prod/<service>/<db>/<schema>/ --endpoint-url https://s3.pub1.infomaniak.cloud
aws s3 cp s3://processity-backups/processity-prod/<service>/<db>/<schema>/<timestamp>.dump.age . --endpoint-url https://s3.pub1.infomaniak.cloud
age -d -i processity-backup-key.txt -o <service>-<schema>.dump <timestamp>.dump.age   # offline, custodians' key
# then re-encrypt for the customer (their age key, or a passphrase: age -p) and send over a secure channel
```

The customer restores with plain `pg_restore -d <their-db> <file>.dump`.
Hand over what they need (usually the latest dump per service), not the
whole history.

**Delete** (after handover, or when retention/erasure applies):

```bash
aws s3 rm --recursive s3://processity-backups/processity-prod/<service>/<db>/<schema>/ \
  --endpoint-url https://s3.pub1.infomaniak.cloud
```

Check with `aws s3 ls ... --recursive | grep <schema>` that nothing is left,
and repeat for **every** service that has the tenant (Authentication,
Licensing, Settings, the app services, ...). Once the tenant's schema is
dropped from the live DB no new backups are written; without the explicit
delete the old objects only disappear when the 90-day prune reaches them.
Backups are not tenant-addressable in the combined legacy archives or
elsewhere (see below), so those need handling too.

## Rotation policy

- **Offsite (bucket):** 90 days, scripted via `--s3-prune-days` (see step 3)
  — adjust the `s3_prune_days` input per service if that number changes.
- **Local (runner):** 14 days (`--prune-local-days 14` in the workflow) —
  this is scratch space on an ephemeral CI runner, not a real recovery
  point; the bucket is the actual retention store.
- **Key rotation:** age keypair rotated on custodian change or suspected
  compromise, per `cryptography-policy.md` section 4. Rotating means
  generating a new keypair and updating `BACKUP_AGE_PUBLIC_KEY` — it does
  **not** re-encrypt existing backups already in the bucket.

## Known gaps

- **Legacy combined archives:** objects uploaded before the per-tenant layout
  (`processity-prod/<service>/<timestamp>.tar.gz.age`, directly under the
  service prefix) contain every tenant's data in one blob and cannot be
  split without decrypting. Until they are deleted or have aged out
  (90 days), tenant deletion is incomplete. Once a per-tenant run has
  succeeded, delete them:
  `aws s3 ls s3://processity-backups/processity-prod/<service>/ --endpoint-url ...`
  and `aws s3 rm` the top-level `*.tar.gz.age` objects.
- **Tenant data outside postgres is not in these backups** (uploaded files,
  avatars -- see below), so a termination also needs its own export/delete
  step for those.
- Wrong-database risk: the script dumps every non-template database, so the
  `POSTGRES_DB` in a compose file no longer decides what is backed up. Check
  the first listing after a new service is added.

- No automated restore-test/integrity check yet (e.g. periodically restoring
  into a scratch container and diffing row counts). Manual annual test only,
  per policy.
- `--s3-bucket` upload credentials are project-wide Infomaniak EC2 creds
  (RadosGW doesn't expose bucket-scoped IAM the way AWS does) — the backup
  credentials can also read/write the FileService bucket. Accepted for now;
  revisit if Infomaniak adds scoped credentials.
- FileService/AvatarService object storage (uploaded files) is not covered
  by this backup — it needs its own mechanism (versioning/replication on the
  bucket), separate from this Postgres-focused flow.
