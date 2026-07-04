---
type: architecture
---

# Authentication Architecture

## Overview

Processity uses **RS256 asymmetric JWT signing**. The authentication service holds the RSA private key and signs tokens. All other services validate tokens locally using the public key fetched from a JWKS endpoint — no network hop to the auth service per request.

```
User login → Auth Service (signs JWT with RSA private key)
             ↓
Cookie sent with each request
             ↓
Service (fetches public key from /.well-known/jwks.json, validates locally)
```

All environments — including local — run Infisical inside Docker (via Colima). There is no appsettings-based key fallback in normal operation.

---

## Token Flow

### Issuance

1. User authenticates (password or passkey)
2. `LoginTokenService` → `TokenGenerator.GenerateTokenAsync()`
3. `AuthenticationCookieConfigurationHandler.GetRsaKeyAsync()` reads the private key PEM from Infisical (`/auth` → `rsa-private-key`), imports it via `RSA.ImportFromPem()`
4. JWT signed with RS256, set as an `HttpOnly` cookie

### Validation (each service, per request)

1. `AuthenticationCookieMiddleware` extracts the raw JWT from the cookie
2. `DirectTokenResolutionMiddleware` reads `sub`, `tid`, `cid` claims (without validation) to set up tenant context
3. ASP.NET Core JwtBearer validates the token:
   - `CookieOptionsConfigurator.IssuerSigningKeyResolver` fetches JWKS from `Authentication:JwksEndpoint`
   - JWKS response is cached for 1 hour (singleton-scoped, cleared on service restart)
   - Signature validated against the RSA public key
   - Lifetime validated (`ValidateLifetime = true`, no clock skew)
   - Issuer and audience validated per-tenant in `CookieAuthenticationScheme.OnTokenValidated`
4. Request proceeds with authenticated `HttpContext.User`

### Public key distribution

The public key is never stored anywhere explicitly. The auth service derives it from the private key at runtime and serves it over HTTP. Other service containers fetch it at first use — no manual transfer, no environment variable. Only the auth container needs Infisical access for the private key.

### JWT Claims

| Claim   | Value                               |
| ------- | ----------------------------------- |
| `sub`   | User ID (GUID)                      |
| `name`  | User display name                   |
| `email` | User email                          |
| `tid`   | Tenant ID (GUID)                    |
| `cid`   | Contact ID (GUID)                   |
| `roles` | Comma-separated role names          |
| `iss`   | `TenantContext.CookieTokenIssuer`   |
| `aud`   | `TenantContext.CookieTokenAudience` |

Token lifetime: **7 days**

---

## Key Setup

### Generate the key pair

```bash
openssl genrsa 2048
```

This outputs a PEM block to stdout. Copy the full output including the `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` lines. This is the only value you need to store — the public key is always derived from it.

### Store in Infisical

Add the secret to the global Infisical project for each environment:

| Field       | Value                            |
| ----------- | -------------------------------- |
| Secret name | `rsa-private-key`                |
| Secret path | `/auth`                          |
| Value       | the full PEM from the step above |
| Environment | `local` / `dev` / `uat` / `prod` |

The auth service machine identity must have read access to path `/auth` in the global project (Additional Privileges → Allow → Describe + Read Value → Secret Path `In` `/auth`).

### How it reaches the auth service container

At startup `AuthSecretsProvider.GetRsaPrivateKeyPem()` calls `GetGlobalSecret("rsa-private-key", "/auth")`, which reads it from the Infisical container on the `processity-network` Docker network. The auth service container's `KeyVault__*` environment variables point to that Infisical instance.

No volume mounts, no build-time secrets, no extra environment variables are needed for the key itself.

### How other services get the public key

Other service containers do not read Infisical for anything auth-related. On the first authenticated request they make an HTTP GET to the auth container's `/.well-known/jwks.json`, cache the response for 1 hour, and validate all subsequent tokens locally. The only required config per service is:

```
Authentication__JwksEndpoint=http://processity-authentication-{env}/.well-known/jwks.json
```

---

## Configuration Reference

### Auth Service (`appsettings.{env}.json` / docker-compose)

```json
"KeyVault": {
  "SiteUrl": "http://processity-keyvault-{env}:8080",
  "ProjectId": "<global-project-uuid>",
  "Environment": "local|dev|uat|prod"
}
```

The `KeyVault` block is the only auth-signing-related configuration needed in the auth service container. The RSA key is read dynamically from Infisical using these credentials.

### All Other Services (docker-compose)

```yaml
environment:
  - Authentication__JwksEndpoint=http://processity-authentication-{env}/.well-known/jwks.json
  - KeyVault__SiteUrl=... # still needed for other secrets
```

| Environment | JWKS URL                                                               |
| ----------- | ---------------------------------------------------------------------- |
| local       | `http://processity-authentication-service-local/.well-known/jwks.json` |
| dev         | `http://processity-authentication-service-dev/.well-known/jwks.json`   |
| uat         | `http://processity-authentication-service-uat/.well-known/jwks.json`   |

---

## Key Rotation

### Zero-downtime rotation

1. Generate a new key pair with `openssl genrsa 2048`
2. Temporarily modify `JwksController` to return both the current and new key with distinct `kid` values — new tokens will include the new key's `kid` in their header; existing tokens reference the old one
3. Store the new PEM in Infisical and restart the auth service — new tokens are signed with the new key
4. Wait for old tokens to expire (7 days max)
5. Remove the old key from `JwksController` and deploy

### Emergency rotation (sessions invalidated)

Update `rsa-private-key` in Infisical and restart the auth service. All existing cookies become invalid immediately. Services will pick up the new public key within 1 hour (next JWKS cache miss) or on restart.

---

## JWKS Endpoint

`GET /.well-known/jwks.json` — no authentication required

**Response:**

```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "alg": "RS256",
      "n": "<base64url modulus>",
      "e": "<base64url exponent>"
    }
  ]
}
```

---

## Troubleshooting

**`401` on all requests after deploy**
→ RSA key in Infisical changed or auth service restarted with a different key. All existing cookies are invalid — users must re-login.

**Auth service fails to start / `KeyVault client is not available`**
→ Infisical container is not reachable or `rsa-private-key` secret is missing. Confirm the secret exists at path `/auth` for the correct environment slug and that the machine identity has read access.

**JWKS fetch fails / 503 on first authenticated request to a service**
→ Auth container is not reachable from the calling service container. Confirm both are on `processity-network` and that the auth container name in `Authentication__JwksEndpoint` matches the actual container name (check `docker ps`).

**`Authentication__JwksEndpoint` missing**
→ Service is missing the environment variable. It was added to all docker-compose files automatically but may be missing from a new service. Add it following the pattern above.

**`alg:none` token rejected**
→ Expected. `RequireSignedTokens = true` in `CookieAuthenticationScheme` blocks unsigned tokens.
