import crypto from 'crypto';

function getKey(): Buffer {
  const explicit = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim();
  if (explicit) {
    if (/^[0-9a-f]+$/i.test(explicit) && explicit.length === 64) {
      return Buffer.from(explicit, 'hex');
    }
    return Buffer.from(explicit, 'base64');
  }
  const auth = process.env.AUTH0_SECRET?.trim();
  if (!auth) {
    throw new Error('Set AUTH0_SECRET or GOOGLE_TOKEN_ENCRYPTION_KEY to store Google refresh tokens.');
  }
  const raw = crypto.hkdfSync('sha256', Buffer.from(auth), Buffer.from('zeta'), 'google-drive-token', 32);
  return Buffer.from(raw);
}

export function encryptToken(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64url');
}

export function decryptToken(encrypted: string): string {
  const key = getKey();
  const buf = Buffer.from(encrypted, 'base64url');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
