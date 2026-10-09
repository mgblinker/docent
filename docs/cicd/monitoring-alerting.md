---
type: howto
---

# Monitoring, Performance Alerts and Push Notifications

> Hand-written runbook. Status as of 2026-10-05: **built and validated locally, not
> yet deployed**. Nothing here runs on prod until the rollout steps below are done.
> Code lives in `Processity.Monitoring`, `Processity.SharedKernel` (`Telemetry/`) and
> per-service `Host` projects.

## Overview

Two layers, both feeding the same phone/desktop notifications:

```
 .NET services ──/metrics──▶ Prometheus ──rules──▶ Alertmanager ──webhook──▶ aggregator ──▶ ntfy ──▶ phone / Mac
 (SharedKernel telemetry)     (30d TSDB)            (grouping, repeat)         (bridge)       (self-hosted)
                                                                                  ▲
 Docker socket ──CPU/mem/health probe──▶ aggregator (in-memory, ~1h) ──degradation flags ──┘ + dashboard card
```

| Layer | What it catches | Memory |
|---|---|---|
| **Aggregator health poller** (pre-existing, extended) | container down, health latency > 2x baseline, CPU >= 80%, memory >= 90%, each for 3 polls (~90 s) | in-memory, ~1 h, lost on restart |
| **Prometheus + Alertmanager** (new) | real request latency (p95), 5xx rate, GC pressure, Kestrel queueing, scrape target down | 30 days |

## Components

| Component | Where | Notes |
|---|---|---|
| ntfy | `processity-ntfy-<env>` (Monitoring compose) | Self-hosted, `deny-all` default access, token auth. Public at `https://ntfy.processity.ch` via Caddy. |
| Prometheus | `processity-prometheus-<env>` | Not published on a host port. Config baked into the image (`prometheus/Dockerfile`) because the pipeline deploys over a remote docker context and cannot bind-mount local files. |
| Alertmanager | `processity-alertmanager-<env>` (port 9093, internal) | Webhook receiver is the aggregator. |
| Aggregator | `processity-monitoring-aggregator-<env>` (port 3001) | Sends ntfy messages for its own flags and bridges Alertmanager webhooks (`POST /alertmanager/webhook`). |
| Dashboard | `monitoring.processity.ch` | New **Performance** card: anomalous container count (down / slow / high load), click-through to a "Performance anomalies only" filter. Alerts panel rows show the numbers (e.g. `412 ms vs 120 ms baseline`). |

### Request metrics on the container cards

The aggregator polls Prometheus (30 s) and attaches `prom` to each container in
`/containers`: p95 latency, req/s, 5xx ratio and a 6 h p95 history (5 min step). The card
shows them in a "Requests p95 (6h)" block with a sparkline, plus badges `high error rate`
(5xx > 5 %) and `slow requests` (p95 > 1 s).

- Matching needs no config: the scrape `instance` host equals the container name
  (targets are `processity-<svc>-<env>:<port>`).
- Containers without scraped request metrics show no block; the existing health-latency
  block is unchanged.
- After 3 failed Prometheus polls the numbers are dropped rather than shown stale.
- Tested against mock Prometheus/Docker servers using the real API shapes; not yet seen
  against a live Prometheus.

## Service metrics (SharedKernel)

Opt-in per service, off by default. Full reference: `Processity.SharedKernel/docs/telemetry.md`.

```csharp
services.AddProcessityTelemetry(configuration, "authentication");   // ConfigureServices
app.UseProcityMetrics();                                            // right after UseRouting, BEFORE auth / multi-tenancy
```

Enable with `Telemetry__MetricsEnabled=true`. Without `Telemetry__MetricsToken` the
endpoint refuses any request carrying `X-Forwarded-For` (i.e. anything that came
through Caddy or the gateway), so it is reachable only inside the docker network.
Labels never include tenant or raw URL.

Metrics: `http_server_request_duration_seconds_*` (histogram by route, method,
status), `dotnet_gc_*`, `dotnet_thread_pool_*`, `dotnet_process_*`, `kestrel_*`.

### Rollout state per service

| Service | Code | Env var in compose | Scrape target |
|---|---|---|---|
| Authentication | done (branch `feature/prometheus-metrics`, uncommitted/unmerged at time of writing) | prod + uat | commented in `prometheus/prometheus.yml` (container listens on **port 80**) |
| core-apps (Backend) | not yet | no | listed, **will show down until wired** |
| ApiGateway, other microservices | not yet | no | commented |

Per-service checklist (order matters):

1. Service references a SharedKernel build containing `Processity.SharedKernel.Telemetry` (6.5.0 does).
2. Add the two lines above to `Startup.cs` / `Program.cs`.
3. Set `Telemetry__MetricsEnabled=true` in the service's compose and deploy.
4. Verify inside the network: `docker exec <container> wget -qO- localhost:<port>/metrics | head`.
5. **Only then** uncomment/add the job in `Processity.Monitoring/prometheus/prometheus.yml`.
   A listed service without `/metrics` is `up == 0` and fires `TargetDown`.

Container ports differ per service (Authentication 80, most prod services 8080).
The `SERVICE_PORT` build arg in Monitoring's compose (default 8080) is a **guess for
UAT**; check it.

## Alert rules (`prometheus/rules.yml`)

| Alert | Condition | For | Severity |
|---|---|---|---|
| `TargetDown` | `up == 0` | 3 m | critical |
| `HighP95Latency` | p95 request duration > 1 s | 10 m | warning |
| `HighServerErrorRate` | 5xx ratio > 5 % and > 0.1 req/s | 5 m | critical |
| `HighGcPauseTime` | > 10 % of time in GC pauses | 10 m | warning |
| `KestrelConnectionsQueued` | queued connections > 0 | 5 m | warning |

Alertmanager groups by `alertname, job` (30 s wait, 5 m interval) and repeats every 6 h.
Critical alerts send ntfy priority `high`, warnings `default`; resolved alerts get a
check-mark tag.

## Configuration reference

Aggregator environment (set via Monitoring compose, values come from Gitea):

| Variable | Meaning |
|---|---|
| `NTFY_URL` | internal URL, e.g. `http://processity-ntfy-prod:80`. Unset = alerts disabled. |
| `NTFY_TOPIC` | default `processity-monitoring` |
| `NTFY_TOKEN` | write-only token of the service user |
| `ALERT_ENV` | prefix in titles, e.g. `[prod]` (set by compose) |
| `ALERT_REPEAT_MINUTES` | reminder interval while a flag stays on (default 360) |
| `ALERTMANAGER_WEBHOOK_TOKEN` | bearer secret Alertmanager sends to the webhook. Wrong/missing = `404`. |
| `PROMETHEUS_URL` | internal Prometheus (`http://processity-prometheus-<env>:9090`, set in compose). Unset = no request metrics on cards. |
| `PROM_POLL_INTERVAL_MS` | default 30000 |

Gitea (Processity.Monitoring, Settings -> Actions):

| Name | Kind |
|---|---|
| `PROD_NTFY_URL`, `PROD_NTFY_BASE_URL` (`https://ntfy.processity.ch`) | variable |
| `PROD_NTFY_TOKEN`, `PROD_ALERTMANAGER_WEBHOOK_TOKEN` | secret |
| `UAT_NTFY_URL`, `UAT_NTFY_BASE_URL` | variable |
| `UAT_NTFY_TOKEN`, `UAT_ALERTMANAGER_WEBHOOK_TOKEN` | secret |

`PROD_NTFY_BASE_URL` matters: without it a redeploy resets ntfy's base URL to localhost.

## One-time setup

### 1. ntfy users (run on the right docker context: `docker context show` = `prod-server`)

```sh
docker exec -it processity-ntfy-prod ntfy user add michael --role=admin   # human, read access
docker exec -it processity-ntfy-prod ntfy token add michael
docker exec -it processity-ntfy-prod ntfy user add monitoring-aggregator  # service, write-only
docker exec processity-ntfy-prod ntfy access monitoring-aggregator processity-monitoring write-only
docker exec -it processity-ntfy-prod ntfy token add --label aggregator-prod monitoring-aggregator
docker exec processity-ntfy-prod ntfy access        # verify
```

Never paste tokens into chats or tickets; store them only as Gitea secrets / local config.

### 2. Caddy route

`EnvironmentSetup/Caddy/Prod/Caddyfile` has an `ntfy.processity.ch` block proxying to
`processity-ntfy-prod:80`. **The Caddyfile is baked into the Caddy image** (see its
`Dockerfile`), so `caddy reload` is not enough. From `EnvironmentSetup/Caddy/Prod`
(context `prod-server`): `docker compose build caddy`, then `docker compose up -d caddy`.
This briefly restarts the prod reverse proxy for every site. Static IPs and the
`caddy_data` volume (certificates) are preserved. Needs a DNS record for the host
in Cloudflare (Caddy issues the certificate via DNS-01).

A Cloudflare `525` on the first test means Caddy has no site for the host yet
(image not rebuilt), not that ntfy is down.

### 3. Notification client on a Mac

```sh
brew install ntfy
```

- `~/.config/ntfy/client.yml` (mode 600): `default-host`, `default-token`, and a
  `subscribe:` entry with `topic: processity-monitoring` and `command: ~/.config/ntfy/notify.sh`.
- `notify.sh` passes `NTFY_TITLE` / `NTFY_MESSAGE` to `osascript` as **arguments**, never
  interpolated into the script, so message text cannot inject AppleScript.
- Run as a launchd agent with `ntfy subscribe --config <path> --from-config`.
  **The explicit `--config` is required**: on macOS ntfy otherwise looks in
  `~/Library/Application Support/ntfy/` and exits with `must specify topic`.
- Allow notifications for *Script Editor* in System Settings -> Notifications.
- Phones: install the ntfy app and point it at `https://ntfy.processity.ch`. iOS push
  without `upstream-base-url` is delayed.

### 4. Deploy

Run the Monitoring `ci-uat` pipeline first, check the aggregator log line
`alerts: ntfy http://.../processity-monitoring`, then `ci-prod`.
`up -d --force-recreate` also recreates ntfy; its data is in named volumes.

## Operating it

- **Silence everything**: unset `NTFY_URL` and redeploy the aggregator.
- **Test the pipeline end to end**: stop a low-risk UAT container for ~2 min
  (3 polls at 30 s); expect one alert, then a "recovered" message after restart.
- **Prometheus UI** is not published. `docker exec processity-prometheus-<env> wget -qO- localhost:9090/api/v1/targets`.
- **Rules change**: edit `prometheus/rules.yml`, validate with
  `docker run --rm --entrypoint promtool <image> check rules /etc/prometheus/rules.yml`, redeploy.

## Licenses

All run **unmodified** from upstream images, used internally and not redistributed:
ntfy (Apache-2.0 / GPLv2, used under Apache-2.0), Prometheus and Alertmanager
(Apache-2.0), OpenTelemetry .NET (Apache-2.0). No notice or license-text obligations
are triggered by internal use; the details and what would change that are in
`Processity.Monitoring/THIRD_PARTY_NOTICES.md`. Do not use "Prometheus" in a Processity
product name (trademark). Grafana, if ever added, is AGPL-3.0, which is a different
decision.

## Known gaps

- No alert for failed/dropped CAP messages. Example: `invitation.response.received`
  failed 50 times with `No tenant schema is set for this DbContext instance` and was dropped
  (2026-10-05). Needs a DB exporter or a small query in the aggregator on the `cap.*` tables.
- No database metrics (connections, cache hit rate, long queries).
- Postgres runs with default settings (`shared_buffers` 128 MB, `work_mem` 4 MB,
  `random_page_cost` 4) on an 8 GB host; untuned but irrelevant at current data size.
- Aggregator flag history resets on restart; long-term trends come only from Prometheus.
- Only the prod/uat/localdev Monitoring compose files carry the new services; `dev` and
  `release` were not touched.
- The Prometheus exporter package is published only as `-beta`; NuGet shows a
  prerelease-dependency warning in consumers.
