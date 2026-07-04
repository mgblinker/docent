---
type: architecture
---

# Two-Factor Authentication (TOTP + Email)

## Overview

Adds a second factor to password login: authenticator-app codes (TOTP) and email one-time codes, built on ASP.NET Identity's built-in token providers (`AddDefaultTokenProviders()` on `GlobalUser`) — no custom crypto. Recovery codes cover lost-device scenarios. Privileged roles can be configured to require enrolment before they can obtain a token at all ("block + must-enrol").

This closes the O-03 security requirement from the fit-gap analysis (`Files/analysis/fit-gap-analysis.md`).

---

## Enrolment

`TwoFactorManagementController` [Service/src/AuthenticationService/Global/Features/AccountManagement/TwoFactor/TwoFactorManagementController.cs] — authenticated, `api/v{version}/account/2fa`.

| Endpoint | Behaviour |
|---|---|
| `GET /authenticator/setup` | Returns shared key (grouped for manual entry) + `otpauth://` URI for QR rendering. Generates a key on first call (`GetAuthenticatorKeyAsync` → `ResetAuthenticatorKeyAsync` if null); repeat calls before enabling return the same key. |
| `POST /authenticator/enable` `{ code }` | Verifies the code via `VerifyTwoFactorTokenAsync(user, AuthenticatorTokenProvider, code)`, then `SetTwoFactorEnabledAsync(true)`, then `GenerateNewTwoFactorRecoveryCodesAsync(10)`. Recovery codes are returned **once** — the client must show them to the user immediately. |

Email 2FA needs **no separate enable endpoint**: once `TwoFactorEnabled = true` and the user's email is confirmed, Identity's `GetValidTwoFactorProvidersAsync` automatically lists `"Email"` as an available provider at login.

Issuer name shown in the authenticator app reads config key `TwoFactor:Issuer` (default `"Processity"`).

---

## Login Flow

`LoginCommandHandler` [Service/src/AuthenticationService/Global/Features/AccountManagement/Login/LoginCommandHandler.cs] gates token issuance after password validation:

```
FindByEmailAsync + CheckPasswordAsync (unchanged)
  ↓
GetTwoFactorEnabledAsync(user)
  ├─ false + mandatory role, not enrolled → RequiresEnrollment = true, no token (block + must-enrol)
  ├─ true  → issue challenge (see below), no token
  └─ false → GenerateLoginResultAsync (unchanged password-only path)
```

### Challenge issuance

- `ITwoFactorChallengeStore` [Service/src/AuthenticationService/Global/Features/AccountManagement/TwoFactor/ITwoFactorChallengeStore.cs] + `TwoFactorChallengeStore` (impl) — `IDistributedCache`-backed, key `2fa-challenge:{token}` → user id, TTL from `TwoFactor:ChallengeTtlMinutes` (default 5 min). Single-use: redeemed tokens are invalidated immediately.
- If `"Email"` is an available provider, the handler generates the code (`GenerateTwoFactorTokenAsync(user, DefaultEmailProvider)`) and publishes it via CAP as `GenericSystemEventRequestedEvent` (`EventType = "auth.two-factor-code-email"`, payload `{ code }`) — same delivery mechanism as the existing bootstrap-password-link email (`SendSetPasswordLinkCommandHandler`).

### Verification

`Verify2faCommandHandler` [Service/src/AuthenticationService/Global/Features/AccountManagement/Login/Verify2faCommandHandler.cs], exposed at `POST /api/v{version}/account/login/2fa/verify`:

1. Resolve challenge token → user id (`ITwoFactorChallengeStore.GetUserIdAsync`). Unknown/expired → fail.
2. Verify code: `VerifyTwoFactorTokenAsync(user, provider, code)` for `"Authenticator"`/`"Email"`, or `RedeemTwoFactorRecoveryCodeAsync(user, code)` for provider `"Recovery"`.
3. On success: invalidate the challenge token, then `ILoginTokenService.GenerateLoginResultAsync` — same tenant-resolution/JWT path as password-only login.

### Mandatory enrolment for privileged roles

Config key `TwoFactor:MandatoryRoles` (string array, e.g. `["Admin"]`) — if a user has any of these global roles and has not enrolled, login returns `RequiresEnrollment = true` and **no token**. The user must call the authenticated setup/enable endpoints (which requires being logged in — this is why enrolment happens via a separate, already-authenticated session or an operator-driven flow) before they can log in normally. Empty/unset = no enforcement.

---

## Response Contract

`LoginResultDto` [Service/src/AuthenticationService/Global/Features/AccountManagement/Login/DTOs/LoginResultDto.cs] — `Token` and `User` are now nullable; new fields:

| Field | Meaning |
|---|---|
| `RequiresTwoFactor` | Caller must call the verify endpoint with `TwoFactorToken`. |
| `RequiresEnrollment` | Caller must enrol before any token will be issued (mandatory-role path). |
| `TwoFactorToken` | Opaque challenge token, present only when `RequiresTwoFactor`. |
| `TwoFactorProviders` | Providers available to this user (e.g. `["Authenticator", "Email"]`). |

`LoginController` [Service/src/AuthenticationService/Global/Features/AccountManagement/Login/LoginController.cs] maps these to HTTP:

| Condition | Response |
|---|---|
| `RequiresEnrollment` | `403 { requiresEnrollment: true }` |
| `RequiresTwoFactor` | `200 { requiresTwoFactor: true, twoFactorToken, providers }` |
| `Token == null` (multi-tenant, none selected) | `428 { availableTenants }` (unchanged) |
| Otherwise | `200` + auth cookie (unchanged cookie logic, extracted into `IssueAuthenticatedResponse`) |

Endpoints: `POST /api/v{version}/account/login`, `POST /api/v{version}/account/login/2fa/verify`.

---

## Configuration Reference

```json
"TwoFactor": {
  "Issuer": "Processity",
  "ChallengeTtlMinutes": 5,
  "MandatoryRoles": ["Admin"]
}
```

| Key | Default | Notes |
|---|---|---|
| `TwoFactor:Issuer` | `"Processity"` | Label shown in the authenticator app next to the account. |
| `TwoFactor:ChallengeTtlMinutes` | `5` | How long a login challenge token is redeemable. |
| `TwoFactor:MandatoryRoles` | `[]` (none) | Global role names that force enrolment before login succeeds. |

**Email delivery:** requires the `CommunicationService`/backend Communications module to have a template registered for `EventType = "auth.two-factor-code-email"` (payload key `code`) — same registration pattern as `"auth.bootstrap-token-email"`.

---

## Testing

- `TwoFactorManagementControllerTests` [Service/test/Authentication.Application.UnitTests/TwoFactorManagementControllerTests.cs] — enable with invalid/valid code.
- `TwoFactorLoginTests` [Service/test/Authentication.Application.UnitTests/TwoFactorLoginTests.cs] — no-2FA passthrough, challenge issuance + store, mandatory-role enrolment block, verify (unknown/invalid/valid/recovery-code).

`InternalsVisibleTo("Authentication.Application.UnitTests")` was added to `AuthenticationService`'s `AssemblyInfo.cs` so the (internal) command handlers are testable directly.

---

## Non-Obvious Constraints

- Email 2FA requires `user.EmailConfirmed = true` — otherwise Identity's `GetValidTwoFactorProvidersAsync` silently omits `"Email"` from the provider list, and the user is left with authenticator-only even if intended otherwise.
- The challenge store is a distributed cache entry, not a database row — restarting the cache backend invalidates all in-flight 2FA challenges (acceptable: 5-minute TTL, user just logs in again).
- `LoginResultDto.Token`/`User` becoming nullable is a breaking change to every consumer that constructs or reads it; `ExchangePhoneTokenController`, `RegisterWithPasskeyController`, `PasskeyLoginController`, and `ReEnrollmentLinkController` all had null-forgiving (`!`) annotations added at their existing null-guarded call sites — no behavioural change, compiler-only.
