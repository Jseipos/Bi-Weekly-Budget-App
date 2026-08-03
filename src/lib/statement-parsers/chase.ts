// ============================================
// Chase CSV parser.
//
// Chase exports both credit card and bank account activity as CSV. Common
// header layouts:
//
//   CREDIT CARD (most common):
//     Transaction Date,Post Date,Description,Category,Type,Amount,Memo
//     Amount sign: NEGATIVE for purchases, POSITIVE for payments/credits.
//     This matches our signed convention, so we pass it through as-is.
//
//   CHECKING/SAVINGS:
//     Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
//     Amount sign: NEGATIVE for debits (outflows), POSITIVE for credits.
//     Already matches our convention.
//
// We accept either layout by mapping headers by name (not position).
// ============================================

import type { IssuerParser, ParsedTransaction, ParseResult } from "./types";
import { parseCsv, parseAmount, parseDate, indexHeaders } from "./csv-utils";

const HEADER_ALIASES = {
  date: ["transaction date", "posting date", "post date", "date"],
  description: ["description"],
  amount: ["amount"],
  category: ["category"],
} as const;

export const parseChase: IssuerParser = (csvText): ParseResult => {
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return { ok: false, error: "CSV has no data rows" };
  }

  const idx = indexHeaders([...rows[0]], HEADER_ALIASES);
  if (idx.date === -1 || idx.description === -1 || idx.amount === -1) {
    return {
      ok: false,
      error:
        "Chase CSV is missing expected columns (need a Date column, Description, and Amount). " +
        "Make sure you downloaded the file from Chase's 'Download account activity' option.",
    };
  }

  const transactions: ParsedTransaction[] = [];
  const warnings: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const dateStr = row[idx.date] ?? "";
    const desc = row[idx.description] ?? "";
    const amtStr = row[idx.amount] ?? "";

    const date = parseDate(dateStr);
    const amount = parseAmount(amtStr);

    if (!date) {
      warnings.push(`Row ${i + 1}: unparseable date "${dateStr}", skipped`);
      continue;
    }
    if (amount === 0 && !amtStr.match(/^\s*0+(\.0+)?\s*$/)) {
      // amount didn't parse to a real number
      warnings.push(`Row ${i + 1}: unparseable amount "${amtStr}", skipped`);
      continue;
    }
    if (!desc.trim()) {
      warnings.push(`Row ${i + 1}: missing description, skipped`);
      continue;
    }

    transactions.push({
      date,
      amount,
      description: desc.trim(),
      rawDescription: desc,
      issuerCategory:
        idx.category !== -1 ? (row[idx.category] ?? "").trim() || null : null,
    });
  }

  if (transactions.length === 0) {
    return { ok: false, error: "No valid transactions found in file" };
  }

  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  return {
    ok: true,
    data: {
      issuer: "chase",
      transactions,
      statementStart: sorted[0].date,
      statementEnd: sorted[sorted.length - 1].date,
      warnings,
    },
  };
};
