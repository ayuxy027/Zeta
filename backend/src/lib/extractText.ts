import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import WordExtractor from 'word-extractor';

export type ExtractResult = {
  text: string;
  warnings: string[];
};

/**
 * PDF text via pdf-parse (PDF.js). Extracts embedded text only — true OCR for scanned
 * pages needs a separate service; we warn when the text layer looks empty.
 */
async function extractPdf(buffer: Buffer): Promise<{ text: string; numpages: number }> {
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
    const { text, numpages } = await extractPdf(buffer);
    if (numpages > 0 && text.trim().length < Math.max(40, 50 * numpages)) {
      warnings.push(
        `PDF "${fileName}" has little extractable text (${numpages} page(s)). It may be image-only; embedded-text extraction cannot OCR scans.`,
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
