// ============================================
// Shared types for statement parsers.
// Each per-issuer parser exports a `parse(csvText)` that returns
// ParsedStatement, regardless of the issuer's CSV column layout.
// ============================================

export type Issuer =
  | "chase"
  | "capital_one"
  | "usaa"
  | "pnc"
  | "target";

export const ISSUER_LABELS: Record<Issuer, string> = {
  chase: "Chase",
  capital_one: "Capital One",
  usaa: "USAA",
  pnc: "PNC",
  target: "Target",
};

/**
 * A single parsed transaction.
 *
 * `amount` is SIGNED:
 *   - Negative = expense / outflow (purchase, withdrawal, fee)
 *   - Positive = income / inflow  (payment, deposit, refund)
 *
 * This convention is uniform across all issuer parsers — each parser is
 * responsible for normalizing its source columns to this sign convention.
 */
export interface ParsedTransaction {
  date: string; // ISO YYYY-MM-DD
  amount: number; // signed (see above)
  description: string; // cleaned, user-friendly
  rawDescription: string; // verbatim from source (for debugging/dedup)
  issuerCategory: string | null; // category from source CSV, if provided
}

export interface ParsedStatement {
  issuer: Issuer;
  transactions: ParsedTransaction[];
  statementStart: string | null; // earliest tx date in file
  statementEnd: string | null; // latest tx date in file
  warnings: string[]; // non-fatal parse issues (skipped lines, etc.)
}

export interface ParseResult {
  ok: boolean;
  data?: ParsedStatement;
  error?: string;
}

/** Common signature implemented by every per-issuer parser. */
export type IssuerParser = (csvText: string) => ParseResult;
