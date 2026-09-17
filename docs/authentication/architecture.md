---
type: architecture
audience: public
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

---

## Token Flow

### Issuance

1. User authenticates (password or passkey)
2. `LoginTokenService` → `TokenGenerator.GenerateTokenAsync()`
3. `AuthenticationCookieConfigurationHandler.GetRsaKeyAsync()` reads the private key, imports it via `RSA.ImportFromPem()`
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

The public key is never stored anywhere explicitly. The auth service derives it from the private key at runtime and serves it over HTTP. Other service containers fetch it at first use — no manual transfer, no environment variable.

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

## Related components

- [FileService Architecture](../fileservice/architecture.md), [Sync Client Architecture](../syncclient/architecture.md), [Drive Frontend Architecture](../drive/architecture.md) — all validate this same `processity-auth` cookie
- The docs viewer itself (`Processity.Docs/viewer`) validates this cookie the same way (RS256 against this JWKS endpoint) to gate internal-only docs from anonymous visitors — see this repo's own README, "Public vs. internal docs"
- [Authentication Operations](./operations.md) — key setup, rotation, Infisical paths, troubleshooting (internal only)
