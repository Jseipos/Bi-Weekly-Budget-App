// ============================================
// Per-issuer parser dispatcher.
// ============================================

import type { Issuer, IssuerParser, ParseResult } from "./types";
import { parseChase } from "./chase";
import { parseCapitalOne } from "./capital-one";
import { parseUsaa } from "./usaa";
import { parsePnc } from "./pnc";
import { parseTarget } from "./target";

const PARSERS: Record<Issuer, IssuerParser> = {
  chase: parseChase,
  capital_one: parseCapitalOne,
  usaa: parseUsaa,
  pnc: parsePnc,
  target: parseTarget,
};

/**
 * Parse a CSV statement using the parser for the given issuer.
 */
export function parseStatementCsv(
  issuer: Issuer,
  csvText: string,
): ParseResult {
  const parser = PARSERS[issuer];
  if (!parser) {
    return { ok: false, error: `Unknown issuer: ${issuer}` };
  }
  try {
    return parser(csvText);
  } catch (e) {
    return {
      ok: false,
      error: `Parser crashed: ${(e as Error).message}`,
    };
  }
}

export type { Issuer, ParsedStatement, ParsedTransaction, ParseResult } from "./types";
export { ISSUER_LABELS } from "./types";
export { transactionFingerprint } from "./fingerprint";
