// ============================================
// Capital One CSV parser.
//
// Capital One credit card download format:
//   Transaction Date,Posted Date,Card No.,Description,Category,Debit,Credit
//
// Sign convention: Debit and Credit are in SEPARATE columns, both positive.
//   Debit column populated  -> outflow (expense) -> negative in our convention
//   Credit column populated -> inflow (payment/refund) -> positive
//
// 360 Checking download format is similar but uses a single Amount column
// with signed values (debits negative). We handle both by checking which
// columns exist.
// ============================================

import type { IssuerParser, ParsedTransaction, ParseResult } from "./types";
import { parseCsv, parseAmount, parseDate, indexHeaders } from "./csv-utils";

const HEADER_ALIASES = {
  date: ["transaction date", "date", "posted date"],
  description: ["description"],
  amount: ["amount"], // checking flow
  debit: ["debit"],
  credit: ["credit"],
  category: ["category"],
} as const;

export const parseCapitalOne: IssuerParser = (csvText): ParseResult => {
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return { ok: false, error: "CSV has no data rows" };
  }

  const idx = indexHeaders([...rows[0]], HEADER_ALIASES);

  // Need either a single Amount column or both Debit and Credit columns
  const hasSingleAmount = idx.amount !== -1;
  const hasSplit = idx.debit !== -1 && idx.credit !== -1;

  if (idx.date === -1 || idx.description === -1 || (!hasSingleAmount && !hasSplit)) {
    return {
      ok: false,
      error:
        "Capital One CSV is missing expected columns (need Transaction Date, Description, " +
        "and either an Amount column or both Debit and Credit columns).",
    };
  }

  const transactions: ParsedTransaction[] = [];
  const warnings: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const dateStr = row[idx.date] ?? "";
    const desc = row[idx.description] ?? "";

    const date = parseDate(dateStr);
    if (!date) {
      warnings.push(`Row ${i + 1}: unparseable date "${dateStr}", skipped`);
      continue;
    }
    if (!desc.trim()) {
      warnings.push(`Row ${i + 1}: missing description, skipped`);
      continue;
    }

    let amount: number;
    if (hasSplit) {
      const debit = parseAmount(row[idx.debit] ?? "");
      const credit = parseAmount(row[idx.credit] ?? "");
      // Debit -> expense (negative). Credit -> inflow (positive).
      amount = credit > 0 ? credit : debit > 0 ? -debit : 0;
    } else {
      amount = parseAmount(row[idx.amount] ?? "");
    }

    if (amount === 0) {
      warnings.push(`Row ${i + 1}: zero amount, skipped`);
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
      issuer: "capital_one",
      transactions,
      statementStart: sorted[0].date,
      statementEnd: sorted[sorted.length - 1].date,
      warnings,
    },
  };
};
