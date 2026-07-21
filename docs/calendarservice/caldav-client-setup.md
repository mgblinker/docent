# Connecting a Native Calendar App via CalDAV

Processity.Calendar exposes a standard CalDAV interface so a user's real calendar
can be synced into native apps (macOS Calendar, Thunderbird, iOS/Android) instead
of only being usable inside the Processity web app.

## How it works

- Each user creates one or more **CalDAV app tokens** from the web app — a
  password-like credential, separate from their normal login, meant to be
  pasted into a calendar client rather than typed by a human.
- The client authenticates with **HTTP Basic auth**: the app token is the
  password. The username field is not checked — put anything in it (e.g. the
  user's email).
- The token itself encodes which tenant it belongs to, so the same CalDAV URL
  structure works across all tenants without a tenant segment in the path.
- A token is shown **once**, at creation time. If it's lost, revoke it and
  create a new one — there's no way to retrieve the plaintext value again.

## Step 1 — Create an app token

1. Log into the Processity web app.
2. Go to **Personalization → CalDAV Access**.
3. Give the token a name (e.g. "MacBook Calendar") and click **Create Token**.
4. Copy both values shown — you only get one chance:
   - **Token** — this is the CalDAV password.
   - **CalDAV URL** — a full URL like `https://api.processity.ch/calendar/caldav/<your-user-id>/`.

## Step 2 — Add the account in your calendar client

### macOS Calendar

1. **System Settings → Internet Accounts → Add Account → Other → Add CalDAV Account**.
2. Account Type: **Manual**.
3. User Name: your email address (or anything — it's ignored by the server).
4. Password: the token from Step 1.
5. Server Address: the host only, e.g. `api.processity.ch` (no `https://`, no path — macOS derives the rest via `.well-known` discovery).
6. Save. macOS should discover the calendar automatically.

If automatic discovery doesn't pick up the calendar, use the full path from
Step 1 directly instead of relying on discovery — some macOS versions need
this nudge on first setup.

### Thunderbird

1. **Calendar → New Calendar → On the Network**.
2. Format: **CalDAV**.
3. Location: paste the full CalDAV URL from Step 1.
4. When prompted for credentials, use any username and the token as the password.

### Generic / other clients

Any RFC 4791-compliant CalDAV client works the same way:

- **Server URL**: the full CalDAV URL from Step 1.
- **Username**: anything (ignored).
- **Password**: the app token.

## Revoking access

Back in **Personalization → CalDAV Access**, each token can be revoked
independently — e.g. if a device is lost. Revoking doesn't affect other
tokens or the user's normal login.

## Troubleshooting

- **401 Unauthorized**: the token was mistyped, or has been revoked. Create a new one.
- **Client can't discover the calendar automatically**: skip discovery and enter the full CalDAV URL from Step 1 directly rather than just the bare domain.
- **Wrong/old URL shown for an existing integration**: URLs are gateway-relative and differ per environment (dev/UAT/prod each have their own `api.*` domain) — always use the URL exactly as shown at token-creation time for that environment, don't reuse one from a different environment.
