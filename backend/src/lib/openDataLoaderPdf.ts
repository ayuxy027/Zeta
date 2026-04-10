import { convert } from '@opendataloader/pdf';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

export type OpenDataLoaderTier = 'local' | 'hybrid';

function safeBaseName(fileName: string): string {
  const base = path.basename(fileName, path.extname(fileName));
  const s = base.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
  return s || 'document';
}

/**
 * OpenDataLoader PDF (Java) — see repo `ocr.txt` / https://opendataloader.org
 * - Local: deterministic layout + text (needs Java 11+ on PATH).
 * - Hybrid: connects to `opendataloader-pdf-hybrid` for OCR / tables / scans (set OPENDATALOADER_HYBRID_URL).
 */
export async function extractPdfMarkdownOpenDataLoader(
  buffer: Buffer,
  fileName: string,
  tier: OpenDataLoaderTier,
): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'zeta-odl-'));
  const inputPath = path.join(dir, `${safeBaseName(fileName)}.pdf`);
  await fs.writeFile(inputPath, buffer);

  const hybridUrl = process.env.OPENDATALOADER_HYBRID_URL?.trim();

  const useHybrid = tier === 'hybrid' && Boolean(hybridUrl);
  if (tier === 'hybrid' && !hybridUrl) {
    await fs.rm(dir, { recursive: true, force: true });
    throw new Error('OPENDATALOADER_HYBRID_URL is not set but hybrid tier was requested.');
  }

  try {
    const text = await convert(inputPath, {
      format: 'markdown',
      quiet: true,
      toStdout: true,
      hybrid: useHybrid ? 'docling-fast' : 'off',
      hybridUrl: useHybrid ? hybridUrl : undefined,
      /** For hybrid, prefer full triage so scanned/complex pages hit the backend (OCR per ocr.txt). */
      hybridMode: useHybrid
        ? (process.env.OPENDATALOADER_HYBRID_MODE?.trim() === 'auto' ? 'auto' : 'full')
        : undefined,
      hybridFallback: process.env.OPENDATALOADER_HYBRID_FALLBACK === '1',
      hybridTimeout: process.env.OPENDATALOADER_HYBRID_TIMEOUT?.trim(),
    });
    return text.trim();
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
