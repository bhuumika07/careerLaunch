// src/lib/services/enrichment/normalizer.ts
/**
 * Module 3.1: Pure Description Normalization Engine
 *
 * Requirements:
 * - Pure standalone module: no network, no LLMs, no database access.
 * - Cleans HTML tags, scripts, styles, navigation, footer boilerplate, cookie banners.
 * - Preserves semantic structure: headings, bullet structure, line breaks, requirement text.
 * - Computes a deterministic SHA-256 content_hash of normalized text.
 */

import { createHash } from "node:crypto";

export interface NormalizationResult {
  normalizedText: string;
  contentHash: string;
  charCount: number;
  wordCount: number;
}

/**
 * Common boilerplate / cookie banner patterns frequently injected into raw job scrapes.
 */
const BOILERPLATE_PATTERNS = [
  /<!--[\s\S]*?-->/gi, // HTML comments
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // <script> blocks
  /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, // <style> blocks
  /<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, // <noscript>
  /<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, // <nav>
  /<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, // <footer>
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, // <iframe>
  // Cookie / Privacy banner divs
  /<div[^>]*(?:cookie|privacy-banner|consent|onetrust|gdpr)[^>]*>[\s\S]*?<\/div>/gi,
];

/**
 * Common HTML named entity map.
 */
const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&bull;": "•",
  "&middot;": "•",
  "&ndash;": "-",
  "&mdash;": "-",
  "&lsquo;": "'",
  "&rsquo;": "'",
  "&ldquo;": '"',
  "&rdquo;": '"',
  "&trade;": "™",
  "&copy;": "©",
  "&reg;": "®",
  "&euro;": "€",
  "&pound;": "£",
  "&yen;": "¥",
  "&inr;": "₹",
};

/**
 * Decodes all HTML entities including named, decimal (&#123;), and hex (&#x7b;).
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return "";

  // 1. Replace named entities
  let result = text.replace(
    /&(?:nbsp|amp|lt|gt|quot|apos|bull|middot|ndash|mdash|lsquo|rsquo|ldquo|rdquo|trade|copy|reg|euro|pound|yen|inr);/gi,
    (match) => HTML_ENTITIES[match.toLowerCase()] ?? match
  );

  // 2. Replace decimal numeric entities: &#123;
  result = result.replace(/&#(\d+);/g, (_, dec) => {
    try {
      return String.fromCodePoint(parseInt(dec, 10));
    } catch {
      return "";
    }
  });

  // 3. Replace hex numeric entities: &#x1f4a1;
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    try {
      return String.fromCodePoint(parseInt(hex, 16));
    } catch {
      return "";
    }
  });

  return result;
}

/**
 * Normalizes raw opportunity descriptions into clean, structural plain text.
 *
 * Invariants:
 * 1. Strips HTML markup while transforming block/list tags into structural Markdown line breaks and bullets.
 * 2. Unifies Unicode via NFC normalization.
 * 3. Preserves headings and requirement sections cleanly.
 * 4. Collapses horizontal whitespace while preserving vertical paragraph separations.
 */
export function normalizeDescription(rawInput: string | null | undefined): string {
  if (!rawInput) {
    return "";
  }

  let text = String(rawInput);

  // 1. Unicode NFC normalization
  text = text.normalize("NFC");

  // 2. Remove script/style/nav/footer/comment boilerplate blocks
  for (const pattern of BOILERPLATE_PATTERNS) {
    text = text.replace(pattern, " ");
  }

  // 3. Preserve structural breaks before stripping tags:
  // Convert list items to bullet points
  text = text.replace(/<li\b[^>]*>/gi, "\n• ");
  text = text.replace(/<\/li>/gi, "\n");

  // Convert headings to clear block breaks
  text = text.replace(/<h[1-6]\b[^>]*>/gi, "\n\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n");

  // Convert paragraph and block elements to line breaks
  text = text.replace(/<(?:p|div|section|article)\b[^>]*>/gi, "\n");
  text = text.replace(/<\/(?:p|div|section|article)>/gi, "\n");

  // Convert <br>, <hr> tags to newlines
  text = text.replace(/<(?:br|hr)\b[^>]*\/?>/gi, "\n");

  // 4. Strip any remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // 5. Decode HTML entities
  text = decodeHtmlEntities(text);

  // 6. Clean whitespace and line endings:
  // Standardize CRLF to LF
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Replace non-breaking spaces (\u00A0), zero-width spaces (\u200B), and tabs with regular spaces
  text = text.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\t]+/g, " ");
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, ""); // strip zero-width chars

  // Split lines to trim each line individually
  const lines = text.split("\n").map((line) => {
    // Collapse internal spaces in each line
    return line.replace(/[ ]+/g, " ").trim();
  });

  // Re-join and collapse multiple empty lines (max 2 consecutive newlines)
  const normalized = lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalized;
}

/**
 * Computes a deterministic SHA-256 content hash of the normalized text.
 */
export function computeContentHash(normalizedText: string): string {
  return createHash("sha256").update(normalizedText, "utf8").digest("hex");
}

/**
 * Primary processing pipeline: Normalizes text and computes the cryptographic content hash.
 */
export function processDescription(rawDescription: string | null | undefined): NormalizationResult {
  const normalizedText = normalizeDescription(rawDescription);
  const contentHash = computeContentHash(normalizedText);
  const charCount = normalizedText.length;
  const wordCount = normalizedText.length === 0 ? 0 : normalizedText.split(/\s+/).filter(Boolean).length;

  return {
    normalizedText,
    contentHash,
    charCount,
    wordCount,
  };
}
