---
type: reference
---

# EU/CH Regulatory Compliance

Legal basis and implementation for Processity's public website
(`Processity.Website`). Source of truth for user-facing legal text is the
site itself (`datenschutz.html`, `impressum.html`); this page documents the
*why* and points at the code that enforces it, so changes to tracking,
forms, or third-party services get checked against compliance before they
ship.

## Applicable regimes

| Regime | Scope | Why it applies |
|---|---|---|
| EU GDPR (DSGVO) | Art. 5, 6, 17, 22, 46 | Site serves EU visitors and processes their data (contact form, analytics) |
| Swiss revFADP / revDSG | Art. 31 | Processity GmbH is Swiss-domiciled (Eglisau, ZH); Swiss data protection law applies regardless of visitor location |
| ePrivacy Directive | Art. 5(3) | Governs storage/access on visitor terminal equipment (cookies, local storage) — the trigger for consent-banner requirements |
| Swiss commercial law | Handelsregister disclosure | Impressum must carry the HR entry (CHE-162.020.779, Kantons Zürich) |

## Design decision: no cookies, no client-side storage

The site writes nothing to the browser — no cookies, no `localStorage`, no
`sessionStorage`. This is a deliberate architectural choice, not an
oversight: ePrivacy Art. 5(3) only regulates storage on terminal equipment,
so a site with zero client-side storage falls outside its scope entirely
and needs no cookie-consent banner.

Enforced in:
- [`js/telemetry.js`](https://processity.ch) — analytics script, no
  `document.cookie` / Web Storage API calls
- [`components/legal/impressum/index.html`](https://processity.ch/impressum.html) —
  states "Diese Website setzt keine Cookies"

**Guardrail:** any future addition of a cookie, `localStorage` write, or
third-party embed that sets client-side storage (analytics widgets, chat
embeds, font loaders) reintroduces ePrivacy scope and requires a consent
banner. Check `js/` and `components/` for storage APIs before adding
third-party scripts.

## Analytics — pseudonymous, self-hosted, no client identifiers

Visitor/session identification happens **server-side only**, computed from
data already present in the HTTP request (IP + User-Agent), never
persisted as raw IP:

- `telemetry/api/lib/helpers.js` — `visitorHash` (rotates daily, UTC) and
  `sessionHash` (rotates every `SESSION_WINDOW_MINUTES`, default 30 min)
  are HMAC-SHA256 outputs, truncated, non-reversible. Raw IP is folded into
  the HMAC and discarded immediately — never stored.
- Legal basis: Art. 6(1)(f) DSGVO / Art. 31 revDSG (legitimate interest in
  operating and improving the site).
- Retention: `telemetry/api/lib/retention.js` purges page views, heatmap
  events, and interaction events older than `RETENTION_MONTHS` (currently
  14) via a daily job — **except** sessions linked to a contact-form lead
  (see below), which are exempt from time-based purge and deleted only on
  explicit erasure request.

## Contact form — consent + linkage to session data

- `components/contact-form/index.html` — explicit opt-in checkbox
  (`#contactConsent`, required) before session pageviews are linked to the
  submitted lead.
- Linking a session's same-day pageviews to a lead is based on that
  consent plus legitimate interest in qualifying inbound requests
  (Art. 6(1)(b)/(f) DSGVO). It does not create an automated decision with
  legal effect (Art. 22 DSGVO carve-out, stated explicitly in
  `datenschutz.html`).
- Consent is revocable at any time without affecting handling of the
  underlying request.

## Right to erasure (GDPR Art. 17)

`telemetry/api/routes/gdpr.js` — `DELETE /api/erase` takes an email,
deletes the matching `session_leads` row(s) and every `page_views` /
`heatmap_events` / `interaction_events` row keyed to those session IDs.
This is the only PII the telemetry service stores (`session_leads.email`);
everything else is pseudonymous and only becomes identifiable once joined
against `session_leads`. Triggered manually on request via
`datenschutz@processity.ch` — not wired to any UI, not run automatically.

## Third-party data transfers

| Vendor | Purpose | Transfer basis |
|---|---|---|
| Cloudflare Turnstile | Contact-form spam protection | EU Standard Contractual Clauses (Art. 46 DSGVO) — IP, device/browser info transferred to Cloudflare, Inc. (USA) |

No Google Fonts or other third-party asset CDNs — all fonts self-hosted
(`css/fonts.css`) specifically to avoid additional third-party data flows.

## Data subject rights

Documented in `datenschutz.html`: access, rectification, erasure
(including session-linkage erasure), restriction, objection, and
portability. Requests go to `datenschutz@processity.ch`. Supervisory
authorities named explicitly: EDÖB (Switzerland), local authority (EU).

## Checklist for changes to the website

Before merging a change to `Processity.Website`, check:

- [ ] Does this write anything to `document.cookie`, `localStorage`, or
      `sessionStorage`? → requires consent banner, contradicts current
      "no cookies" design decision — flag for discussion.
- [ ] Does this add a third-party script/embed (analytics, chat, fonts,
      maps)? → check if it sets client-side storage or transfers data to a
      non-EU/CH vendor; document transfer basis here and in
      `datenschutz.html`.
- [ ] Does this store new personal data? → update "Verarbeitete
      Datenkategorien" in `datenschutz.html` and confirm it's covered by
      the GDPR-erasure route or has its own erasure path.
- [ ] Does this change retention behavior? → update
      `telemetry/api/lib/config.js` (`RETENTION_MONTHS`) and this page
      together.
