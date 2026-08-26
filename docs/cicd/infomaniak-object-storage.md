---
type: howto
---

# Infomaniak Object Storage Setup

> Hand-written. Update manually if the Infomaniak project or bucket changes.

FileService's `ObjectStorage__*` config talks to any S3-compatible endpoint
(`Processity.FileService/Service/src/FileService.Core/Files/Infrastructure/S3ObjectStorageClient.cs`).
Prod uses Infomaniak Public Cloud object storage instead of the SeaweedFS
container used in dev/local/uat. Infomaniak's S3 API is a gateway (RadosGW)
in front of the same OpenStack Swift containers, so provisioning goes
through the `openstack` CLI — no `aws-cli` needed anywhere in this flow.

## Install the OpenStack CLI

```bash
pip install python-openstackclient
```

(or `brew install openstackclient` on Mac)

## Download project credentials

Infomaniak Manager → the Public Cloud project → user management → pick
region → download `clouds.yaml`.

**Gotcha:** the downloaded file is sometimes named `cloud.yaml` (singular).
The CLI only looks for `clouds.yaml` (plural) — rename on download if
needed, or every command fails with `The cloud <name> was not found`.

## Place the file

```bash
mkdir -p ~/.config/openstack
mv ~/Downloads/cloud.yaml ~/.config/openstack/clouds.yaml
```

Contents look like:

```yaml
clouds:
  PCP-XXXXXXX:
    auth:
      auth_url: https://api.pub1.infomaniak.cloud/identity/v3
      project_name: PCP-XXXXXXX
      username: PCU-XXXXXXX
      password: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
      user_domain_name: Default
      project_domain_name: Default
    region_name: dc3-a
    identity_api_version: 3
```

`PCP-XXXXXXX` is the project ID — this is the cloud name every command
below references via `--os-cloud`.

## Verify the connection

```bash
openstack --os-cloud PCP-XXXXXXX project list
```

`The cloud PCP-XXXXXXX was not found` here means either the `clouds.yaml`
rename step above was missed, the file isn't at
`~/.config/openstack/clouds.yaml`, or `--os-cloud` doesn't match the key
in the file exactly.

## Create the bucket

Infomaniak S3 buckets are Swift containers underneath — create with the
`container` subcommand, not `s3api`:

```bash
openstack --os-cloud PCP-XXXXXXX container create processity-bucket
openstack --os-cloud PCP-XXXXXXX container list
```

## Generate S3 credentials

```bash
openstack --os-cloud PCP-XXXXXXX ec2 credentials create
openstack --os-cloud PCP-XXXXXXX ec2 credentials list   # to re-list later
```

Output gives `access` and `secret` — these become
`OBJECT_STORAGE_ACCESS_KEY_ID` / `OBJECT_STORAGE_SECRET_ACCESS_KEY` in the
Gitea deploy secrets for `processity-filestorage-prod`.

## Config values used by `filestorage-service`

Set in `Processity.FileService/.docker/prod/docker-compose.yml`:

| Setting | Value |
|---|---|
| `ObjectStorage__ServiceUrl` | `https://s3.pub1.infomaniak.cloud` (alt: `https://s3.pub2.infomaniak.cloud`) |
| `ObjectStorage__Region` | `us-east-1` — literal compat value required by S3 tooling, **not** the OpenStack `region_name` (e.g. `dc3-a`) from `clouds.yaml`, that's a different thing |
| `ObjectStorage__BucketName` | `processity-bucket` |
| `ObjectStorage__ForcePathStyle` | `true` |
| `ObjectStorage__AccessKeyId` / `SecretAccessKey` | from `ec2 credentials create` above, injected via Gitea secrets |

Prod compose has no `object-storage` or `object-storage-bucket-init`
service (unlike dev/local/uat, which still run SeaweedFS in-container) —
the bucket and credentials are provisioned out-of-band with the steps
above before first deploy.
