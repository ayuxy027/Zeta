export const ALLOWED_DRIVE_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'application/vnd.google-apps.document',
]);

export function isAllowedMime(mime: string | null | undefined): boolean {
  if (!mime) {
    return false;
  }
  return ALLOWED_DRIVE_MIMES.has(mime);
}
