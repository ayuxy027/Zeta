import type { gmail_v1 } from "googleapis";

function decodeBase64Url(data: string): string {
  try {
    return Buffer.from(data, "base64url").toString("utf8");
  } catch {
    const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(normalized, "base64").toString("utf8");
  }
}

export function pickHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined | null,
  name: string,
): string | null {
  if (!headers?.length) {
    return null;
  }
  const lower = name.toLowerCase();
  const h = headers.find((x) => x.name?.toLowerCase() === lower);
  return typeof h?.value === "string" && h.value.trim() ? h.value.trim() : null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

type BodyAcc = { plain?: string; html?: string };

function collectBodies(
  part: gmail_v1.Schema$MessagePart | undefined | null,
  out: BodyAcc,
): void {
  if (!part) {
    return;
  }
  const mime = part.mimeType ?? "";
  const data = part.body?.data;
  if (data && (mime === "text/plain" || mime === "text/html")) {
    try {
      const text = decodeBase64Url(data);
      if (mime === "text/plain") {
        out.plain = text;
      } else {
        out.html = text;
      }
    } catch {
      /* ignore bad chunks */
    }
  }
  if (part.parts?.length) {
    for (const p of part.parts) {
      collectBodies(p, out);
    }
  }
}

/**
 * Best-effort plain text for display (prefers text/plain, else stripped HTML).
 */
export function extractBestBodyText(
  payload: gmail_v1.Schema$MessagePart | undefined | null,
): string {
  const out: BodyAcc = {};
  collectBodies(payload, out);
  if (out.plain?.trim()) {
    return out.plain.trim();
  }
  if (out.html?.trim()) {
    return stripHtml(out.html);
  }
  return "";
}

export function headersFromMessage(
  data: gmail_v1.Schema$Message | null | undefined,
): gmail_v1.Schema$MessagePartHeader[] {
  return data?.payload?.headers ?? [];
}
