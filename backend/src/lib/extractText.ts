import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import WordExtractor from 'word-extractor';
import { extractPdfMarkdownOpenDataLoader } from './openDataLoaderPdf.js';

export type ExtractResult = {
  text: string;
  warnings: string[];
};

type PdfStrategy = 'auto' | 'builtin' | 'opendataloader' | 'hybrid';

function getPdfStrategy(): PdfStrategy {
  const raw = process.env.PDF_OCR_STRATEGY?.trim().toLowerCase();
  if (raw === 'builtin' || raw === 'opendataloader' || raw === 'hybrid' || raw === 'auto') {
    return raw;
  }
  return 'auto';
}

function isLowTextPdf(text: string, numpages: number): boolean {
  if (numpages <= 0) {
    return text.trim().length < 40;
  }
  return text.trim().length < Math.max(40, 50 * numpages);
}

async function extractPdfBuiltin(buffer: Buffer): Promise<{ text: string; numpages: number }> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return { text: result.text, numpages: result.total };
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function extractLegacyDoc(buffer: Buffer): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'zeta-doc-'));
  const filePath = path.join(dir, 'document.doc');
  try {
    await fs.writeFile(filePath, buffer);
    const extractor = new WordExtractor();
    const extracted = await extractor.extract(filePath);
    return extracted.getBody();
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  mime: string,
  fileName: string,
): Promise<ExtractResult> {
  const warnings: string[] = [];

  if (mime === 'application/pdf') {
    const strategy = getPdfStrategy();
    const hybridUrl = Boolean(process.env.OPENDATALOADER_HYBRID_URL?.trim());

    const runOpenLoader = async (tier: 'local' | 'hybrid'): Promise<string> => {
      return extractPdfMarkdownOpenDataLoader(buffer, fileName, tier);
    };

    if (strategy === 'hybrid') {
      if (!hybridUrl) {
        warnings.push(
          'PDF_OCR_STRATEGY=hybrid requires OPENDATALOADER_HYBRID_URL (run opendataloader-pdf-hybrid, see ocr.txt). Falling back to built-in + auto logic.',
        );
      } else {
        const text = await runOpenLoader('hybrid');
        warnings.push('PDF extracted via OpenDataLoader hybrid (OCR-capable backend).');
        return { text, warnings };
      }
    }

    if (strategy === 'opendataloader') {
      const text = await runOpenLoader('local');
      warnings.push('PDF extracted via OpenDataLoader (local Java).');
      return { text, warnings };
    }

    // auto | builtin (with optional OpenDataLoader passes)
    const builtin = await extractPdfBuiltin(buffer);
    let text = builtin.text;
    const numpages = builtin.numpages;
    const scanned = isLowTextPdf(text, numpages);

    if (strategy === 'builtin') {
      if (scanned) {
        warnings.push(
          `PDF "${fileName}" has very little extractable text (${numpages} page(s)). It may be scanned — set PDF_OCR_STRATEGY=hybrid with a hybrid server, or opendataloader.`,
        );
      }
      return { text, warnings };
    }

    // strategy === 'auto'
    if (!scanned) {
      return { text, warnings };
    }

    warnings.push(
      `PDF "${fileName}" looks thin on text (${numpages} page(s)); trying OpenDataLoader (Java) for better layout/OCR…`,
    );

    try {
      const odlLocal = await runOpenLoader('local');
      if (odlLocal.length > text.trim().length + 20) {
        text = odlLocal;
        warnings.push('OpenDataLoader (local) improved extraction vs built-in text layer.');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      warnings.push(
        `OpenDataLoader local failed (${msg}). Ensure Java 11+ is on PATH (see ocr.txt).`,
      );
    }

    if (hybridUrl && isLowTextPdf(text, numpages)) {
      try {
        const odlHybrid = await runOpenLoader('hybrid');
        if (odlHybrid.length > text.trim().length + 20) {
          text = odlHybrid;
          warnings.push(
            'OpenDataLoader hybrid backend improved extraction (OCR for scans — start hybrid with --force-ocr if needed).',
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        warnings.push(`OpenDataLoader hybrid failed (${msg}).`);
      }
    } else if (isLowTextPdf(text, numpages)) {
      warnings.push(
        'Text still sparse: for scanned PDFs start `opendataloader-pdf-hybrid` and set OPENDATALOADER_HYBRID_URL (see ocr.txt).',
      );
    }

    return { text, warnings };
  }

  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const text = await extractDocx(buffer);
    return { text, warnings };
  }

  if (mime === 'application/msword') {
    const text = await extractLegacyDoc(buffer);
    return { text, warnings };
  }

  if (mime === 'text/plain' || mime === 'application/vnd.google-apps.document') {
    const text = buffer.toString('utf8');
    return { text, warnings };
  }

  throw new Error(`Unsupported MIME type for extraction: ${mime}`);
}
