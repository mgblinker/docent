import type { IncomingMessage } from 'http';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyOptions } from 'jose';

export interface AuthConfig {
  jwksEndpoint?: string;
  cookieName?: string;
}

// Reads a single cookie by exact name. Deliberately not prefix-matching -
// a past bug elsewhere in this stack came from StartsWith-matching a cookie
// name prefix and catching a different cookie (e.g. a "*-refresh" cookie)
// that happened to share the prefix. Exact match avoids that class of bug.
function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return undefined;
}

// Verification is deliberately lax on issuer/audience to mirror what the
// token issuer's own services actually enforce (signature + expiry only;
// issuer/audience are checked elsewhere, per-tenant, not universally) -
// see CookieAuthenticationScheme's TokenValidationParameters on the issuing
// side. Getting stricter here than the source of truth would just produce
// false negatives, not extra security.
const VERIFY_OPTIONS: JWTVerifyOptions = {};

// Auth is entirely optional and off by default: with no jwksEndpoint
// configured, every request is treated as authenticated (today's
// unrestricted behavior), so this stays a no-op for Docent installs that
// don't need an audience split.
export function createAuthChecker(config: AuthConfig) {
  const cookieName = config.cookieName || 'processity-auth';
  if (!config.jwksEndpoint) {
    return async (_req: IncomingMessage) => true;
  }
  const jwks = createRemoteJWKSet(new URL(config.jwksEndpoint));

  return async (req: IncomingMessage): Promise<boolean> => {
    const token = readCookie(req.headers.cookie, cookieName);
    if (!token) return false;
    try {
      await jwtVerify(token, jwks, VERIFY_OPTIONS);
      return true;
    } catch {
      return false;
    }
  };
}
