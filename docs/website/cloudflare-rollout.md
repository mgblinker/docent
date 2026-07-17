---
type: reference
---

# Cloudflare Rollout — Pilot Then Full

Plan for putting Cloudflare in front of `processity.ch` for DDoS/WAF protection,
starting with a low-risk pilot on `www2.processity.ch` before moving the rest
of the zone. Written up after a security review of the Prod Caddy/website/
telemetry stack found no edge-level DDoS or WAF protection in front of the
public site (see [compliance.md](compliance.md) for the telemetry-side
findings from the same review).

## Why Cloudflare, why not hosttech

hosttech (or whichever registrar/DNS host is authoritative today) only serves
DNS answers — it tells clients which IP to connect to, but never sits in the
path of the actual traffic. Once a client resolves `processity.ch`, every
request goes straight to the origin's Caddy instance; the DNS provider never
sees it and can't absorb a flood or inspect a request. A registrar's own
DDoS protection (if any) only covers infrastructure actually hosted on their
platform — it doesn't extend to a self-hosted Docker/Caddy origin elsewhere.
A reverse-proxy CDN is a different category: it terminates the connection
itself, so traffic passes through their edge before ever reaching the origin.
That's what makes it effective against volumetric attacks and lets a WAF
actually inspect requests. DNS provider and traffic proxy solve different
problems; one doesn't substitute for the other.

Cloudflare was chosen over EU-sovereign alternatives (Myra Security,
OVHcloud, Infomaniak) because the data flowing through this edge layer is
public marketing-site traffic plus pseudonymous telemetry (no raw IP stored,
no cookies — see compliance.md) rather than core SaaS tenant data. That's a
low sensitivity bar, and Cloudflare is already in use for Turnstile on the
contact form. Revisit this choice if a client contract or regulatory
obligation later requires an EU-only processor for this traffic — Myra
Security is the closest full-feature match (WAF + volumetric DDoS + CDN +
bot management, BSI C5 / ISO 27001 certified) if that becomes necessary.

## Current topology

```
Client → Caddy (EnvironmentSetup/Caddy/Prod) → origin containers (website-network)
```

Caddy terminates TLS itself (Let's Encrypt, `tls1.2`/`tls1.3`), no proxy in
front of it today. The origin's public IP accepts direct connections on
443 from anyone.

## Phase 1 — Pilot on www2.processity.ch

Nameserver delegation is domain-wide — Cloudflare can't take over DNS for a
single subdomain. The pilot therefore still requires a full nameserver
cutover, but only `www2` actually routes through Cloudflare's proxy;
everything else keeps resolving straight to the origin, unchanged.

1. **Inventory existing DNS** at the current host: A/AAAA for every
   hostname in the Caddyfile (`processity.ch`, `www`, `www2`,
   `www-telemetry`, `api`, `webapp`, `docs`, `instructor-app`,
   `relatives-app`, `parents-app`, `elearning-app`, `referrer-portal`,
   `planning`, `immobroker`, `auth`, `setup`, `keyvault`, `testdata`,
   `showcase`), plus MX/SPF/DKIM/DMARC/CAA. Lower TTLs to ~300s a day
   ahead of cutover.
2. **Add the site to Cloudflare**, verify the auto-imported records against
   the inventory above.
3. **Set proxy status**: `www2` → **Proxied** (orange cloud). Every other
   hostname → **DNS only** (grey cloud) — no behavior change for them.
4. **Switch nameservers** at the registrar to Cloudflare's two assigned
   nameservers. Do this at low-traffic time; allow up to 24-48h for full
   propagation.
5. **SSL/TLS mode**: Full (strict). Caddy already presents a valid cert
   covering `www2` (it's in the existing SAN list), so no origin change
   needed here.
6. **Do NOT yet**: add a `CF-Connecting-IP`-based `X-Forwarded-For`
   override in the Caddyfile, and do NOT lock the origin firewall to
   Cloudflare's IP ranges. See "Why the IP-trust step waits" below —
   these are Phase 2 actions, done together.
7. **Verify**: `dig www2.processity.ch` resolves to Cloudflare's anycast
   IPs; responses carry a `cf-ray` header; other hostnames are unaffected.

### What the pilot does and doesn't get you

- **Gets you**: Cloudflare's L3/L4 volumetric absorption and WAF sitting in
  front of `www2` traffic — the actual DDoS-protection goal — with a
  single low-traffic hostname as blast radius if anything's misconfigured.
- **Doesn't get you yet**: real per-visitor IPs in `www2`'s telemetry data.
  Caddy will see Cloudflare's edge IP as the connecting peer and append
  that (not the true client IP) to `X-Forwarded-For`, since there's no
  `CF-Connecting-IP` override configured yet. Effect is a minor analytics
  accuracy regression for `www2` traffic specifically (visitors bucket
  under Cloudflare's edge IP pool rather than their own IP) — not a
  security regression, since nothing is trusting a spoofable header during
  this phase.
- **Doesn't close**: an attacker who already knows the origin's IP can
  still bypass Cloudflare entirely by connecting directly with
  `Host: www2.processity.ch`. Closing that requires the origin lockdown in
  Phase 2, which can't be done partially (it's an IP/port firewall rule,
  not per-hostname) — hence it waits for full rollout.

## Phase 2 — Full rollout

Once the pilot has run cleanly for a period and the team is comfortable:

1. **Flip every remaining hostname to Proxied** (orange cloud) in
   Cloudflare DNS.
2. **Lock the origin to Cloudflare-only**:
   - Host/cloud firewall: allow inbound 80/443 only from Cloudflare's
     published IP ranges (`https://www.cloudflare.com/ips/`, v4 and v6).
   - **Authenticated Origin Pulls** (SSL/TLS → Origin Server): Cloudflare
     presents a client cert on every request; Caddy validates it.
     Defense-in-depth on top of the firewall rule, so a firewall
     misconfiguration doesn't silently reopen direct access.
3. **Restore real client IPs**, now that it's safe to trust
   `CF-Connecting-IP` (nothing else can reach Caddy). In the relevant
   Caddyfile site block(s):
   ```
   header_up X-Forwarded-For {http.request.header.CF-Connecting-IP}
   ```
   With the origin lockdown from step 2 in place, this is safe: only
   genuine Cloudflare traffic can reach Caddy, so `CF-Connecting-IP` can't
   be forged by a direct connection. The hop count the telemetry API sees
   is unchanged (Caddy sets one authoritative value, the site's nginx
   still appends its own) — `app.set("trust proxy", 2)` in
   `telemetry/api/server.js` does not need to change.
4. **Rate limiting rules** (Security → WAF → Rate limiting rules): add
   edge-level rules matching the app-level limiters as defense-in-depth —
   `/api/track/*` (120 req/min/IP) and `/api/screenshot` (10 req/min/IP)
   — so abusive traffic is dropped before reaching the origin at all.
5. **Bot Fight Mode** (Security → Bots): free tier, filters obvious bot
   traffic.
6. **Under Attack Mode**: leave off by default, use as a manual
   break-glass switch (Security → Settings) during an active incident —
   it adds a JS challenge for every visitor, real users included.
7. **Verify**: confirm direct connections to the origin IP are refused;
   confirm telemetry country/city data is accurate again for all
   hostnames (proof `CF-Connecting-IP` is flowing through correctly).

## Why the IP-trust step waits for origin lockdown

This is the one sequencing rule that matters most in this rollout: adding
the `CF-Connecting-IP` header override *before* the origin is locked down
to Cloudflare-only IPs reintroduces the exact IP-spoofing vulnerability
already fixed in the telemetry API (naive trust of a client-controllable
header — see `lib/helpers.js` history). An attacker bypassing Cloudflare by
hitting the origin IP directly could set their own `CF-Connecting-IP`
header and have it trusted outright. The two steps (origin lockdown +
IP-trust header) must ship together, which is why Phase 1 deliberately
leaves both out — a pilot hostname isn't worth reopening that hole for.

## Related

- [compliance.md](compliance.md) — GDPR/nDSG basis for the telemetry
  pipeline this rollout sits in front of; the IP-handling fix referenced
  above was verified compliance-neutral there.
- `EnvironmentSetup/Caddy/Prod/Caddyfile` — Caddy config that will need
  the Phase 2 header override.
- `Processity.Website/.docker/prod/docker-compose.yml` — website/telemetry
  stack, already isolated onto its own `website-network` (see
  `EnvironmentSetup/Caddy/Prod/docker-compose.yml`) so a compromise there
  has no network path to backend microservices.
