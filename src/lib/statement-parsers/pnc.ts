// ============================================
// PNC CSV parser.
//
// PNC online banking exports activity as CSV. The most common layout is:
//   Date,Description,Withdrawals,Deposits,Category
//
// Some accounts use a single signed Amount column instead:
//   Date,Amount,Description,Memo
//
// We detect both. Withdrawals are outflows (negative); Deposits are
// inflows (positive). When a single Amount column is present, we
// pass the sign through.
// ============================================

import type { IssuerParser, ParsedTransaction, ParseResult } from "./types";
import { parseCsv, parseAmount, parseDate, indexHeaders } from "./csv-utils";

const HEADER_ALIASES = {
  date: ["date", "transaction date", "posting date"],
  description: ["description"],
  amount: ["amount"],
  withdrawals: ["withdrawals", "withdrawal", "debit"],
  deposits: ["deposits", "deposit", "credit"],
  category: ["category"],
} as const;

export const parsePnc: IssuerParser = (csvText): ParseResult => {
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return { ok: false, error: "CSV has no data rows" };
  }

  const idx = indexHeaders([...rows[0]], HEADER_ALIASES);
  const hasSplit = idx.withdrawals !== -1 || idx.deposits !== -1;
  const hasSingleAmount = idx.amount !== -1;

  if (idx.date === -1 || idx.description === -1 || (!hasSingleAmount && !hasSplit)) {
    return {
      ok: false,
      error:
        "PNC CSV is missing expected columns (need Date, Description, and either " +
        "Amount or Withdrawals/Deposits columns).",
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
      const withdrawal =
        idx.withdrawals !== -1 ? parseAmount(row[idx.withdrawals] ?? "") : 0;
      const deposit =
        idx.deposits !== -1 ? parseAmount(row[idx.deposits] ?? "") : 0;
      amount = deposit > 0 ? deposit : withdrawal > 0 ? -withdrawal : 0;
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
      issuer: "pnc",
      transactions,
      statementStart: sorted[0].date,
      statementEnd: sorted[sorted.length - 1].date,
      warnings,
    },
  };
};
