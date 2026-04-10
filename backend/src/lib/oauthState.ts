import crypto from 'crypto';

const SEP = '::';

export function signOAuthState(sub: string, secret: string): string {
  const payload = JSON.stringify({ sub, exp: Date.now() + 10 * 60 * 1000 });
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return Buffer.from(`${payload}${SEP}${sig}`).toString('base64url');
}

export function verifyOAuthState(state: string, secret: string): { sub: string } | null {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8');
    const sepIndex = decoded.indexOf(SEP);
    if (sepIndex < 0) {
      return null;
    }
    const payload = decoded.slice(0, sepIndex);
    const sig = decoded.slice(sepIndex + SEP.length);
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }
    const parsed = JSON.parse(payload) as { sub?: unknown; exp?: unknown };
    if (typeof parsed.sub !== 'string' || typeof parsed.exp !== 'number') {
      return null;
    }
    if (Date.now() > parsed.exp) {
      return null;
    }
    return { sub: parsed.sub };
  } catch {
    return null;
  }
}
