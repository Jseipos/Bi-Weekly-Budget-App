// ============================================
// Minimal CSV utilities for statement parsing.
//
// We avoid pulling in papaparse to keep the dependency footprint small.
// Bank CSVs are well-formed RFC 4180: comma-delimited, double-quoted
// strings, doubled quotes as escape. This handles all of that.
// ============================================

/**
 * Parse a CSV row, respecting double-quoted fields and "" escapes.
 * Returns the cells; trims whitespace from unquoted cells only.
 */
export function parseCsvRow(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  let wasQuoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Doubled quote = literal "
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      wasQuoted = true;
      continue;
    }

    if (ch === ",") {
      cells.push(wasQuoted ? current : current.trim());
      current = "";
      wasQuoted = false;
      continue;
    }

    current += ch;
  }

  cells.push(wasQuoted ? current : current.trim());
  return cells;
}

/**
 * Parse CSV text into rows. Handles CRLF and LF line endings, skips
 * blank lines, and supports quoted fields containing embedded newlines.
 */
export function parseCsv(text: string): string[][] {
  // Normalize line endings
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];

  // We need to handle quoted fields containing newlines, so we walk char-by-char.
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch === '"') {
      if (inQuotes && normalized[i + 1] === '"') {
        current += '""';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      current += ch;
      continue;
    }
    if (ch === "\n" && !inQuotes) {
      if (current.length > 0) rows.push(parseCsvRow(current));
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.length > 0) rows.push(parseCsvRow(current));

  // Filter genuinely empty rows (no cells with content)
  return rows.filter((row) => row.some((cell) => cell.length > 0));
}

/**
 * Parse a currency-ish string into a number.
 *   "$1,234.56"  -> 1234.56
 *   "(45.00)"    -> -45.00   (accounting negative)
 *   "-12.50"     -> -12.50
 *   ""           -> 0
 *   "1234.56 CR" -> -1234.56 (CR = credit, treated as opposite sign;
 *                              caller decides whether to flip)
 */
export function parseAmount(raw: string): number {
  if (!raw) return 0;
  let s = raw.trim();
  if (!s) return 0;

  let sign = 1;

  // Accounting parentheses
  if (s.startsWith("(") && s.endsWith(")")) {
    sign = -1;
    s = s.slice(1, -1);
  }

  // Trailing CR/DR markers
  const upper = s.toUpperCase();
  if (upper.endsWith(" CR") || upper.endsWith("CR")) {
    s = s.replace(/\s*CR\s*$/i, "");
    sign *= -1;
  } else if (upper.endsWith(" DR") || upper.endsWith("DR")) {
    s = s.replace(/\s*DR\s*$/i, "");
  }

  // Strip $, commas, whitespace
  s = s.replace(/[$,\s]/g, "");

  // Leading +/-
  if (s.startsWith("-")) {
    sign *= -1;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }

  const n = parseFloat(s);
  if (!isFinite(n)) return 0;
  return n * sign;
}

/**
 * Normalize a date string to ISO YYYY-MM-DD.
 * Accepts: MM/DD/YYYY, M/D/YYYY, YYYY-MM-DD, MM-DD-YYYY, MM/DD/YY.
 * Returns null if it can't be parsed.
 */
export function parseDate(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  // Already ISO?
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  // MM/DD/YYYY or M/D/YYYY or MM-DD-YYYY
  const usMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (usMatch) {
    let [, mm, dd, yyyy] = usMatch;
    if (yyyy.length === 2) {
      // 2-digit year: 00-49 -> 20xx, 50-99 -> 19xx
      const n = parseInt(yyyy, 10);
      yyyy = (n < 50 ? 2000 + n : 1900 + n).toString();
    }
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  return null;
}

/**
 * Build a case-insensitive header -> index map from a header row.
 * Throws if a required header is missing.
 */
export function indexHeaders(
  headerRow: string[],
  aliases: Record<string, string[]>,
): Record<string, number> {
  const lower = headerRow.map((h) => h.toLowerCase().trim());
  const out: Record<string, number> = {};

  for (const [canonical, options] of Object.entries(aliases)) {
    let found = -1;
    for (const opt of options) {
      const idx = lower.indexOf(opt.toLowerCase());
      if (idx !== -1) {
        found = idx;
        break;
      }
    }
    out[canonical] = found;
  }

  return out;
}

/** Normalize a description: collapse whitespace, uppercase, strip trailing #s. */
export function normalizeDescription(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/#\d+\s*$/, "")
    .trim();
}
