// ============================================
// USAA CSV parser.
//
// USAA's CSV export from member.usaa.com typically uses:
//   Date,Description,Original Description,Category,Amount,Status
//
// Older/alternate format (sometimes headerless):
//   Date,"","",Description,,Amount  (legacy 6-column)
//
// Amount sign: NEGATIVE for debits (purchases, payments out),
//              POSITIVE for credits (deposits, refunds).
// Matches our convention as-is.
// ============================================

import type { IssuerParser, ParsedTransaction, ParseResult } from "./types";
import { parseCsv, parseAmount, parseDate, indexHeaders } from "./csv-utils";

const HEADER_ALIASES = {
  date: ["date", "transaction date", "posting date"],
  description: ["description", "original description"],
  amount: ["amount"],
  category: ["category"],
} as const;

export const parseUsaa: IssuerParser = (csvText): ParseResult => {
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return { ok: false, error: "CSV has no data rows" };
  }

  // Detect headered vs headerless variants
  const firstRow = rows[0];
  const looksHeadered = firstRow.some((cell) =>
    /date|description|amount/i.test(cell),
  );

  let dataRows: string[][];
  let idx: Record<string, number>;

  if (looksHeadered) {
    idx = indexHeaders([...firstRow], HEADER_ALIASES);
    dataRows = rows.slice(1);
  } else {
    // Legacy headerless 6-column: Date, "", "", Description, "", Amount
    if (firstRow.length < 6) {
      return {
        ok: false,
        error:
          "USAA CSV format not recognized. Expected a header row or 6-column legacy layout.",
      };
    }
    idx = { date: 0, description: 3, amount: 5, category: -1 };
    dataRows = rows;
  }

  if (idx.date === -1 || idx.description === -1 || idx.amount === -1) {
    return {
      ok: false,
      error:
        "USAA CSV is missing expected columns (need Date, Description, and Amount).",
    };
  }

  const transactions: ParsedTransaction[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const dateStr = row[idx.date] ?? "";
    const desc = row[idx.description] ?? "";
    const amtStr = row[idx.amount] ?? "";

    const date = parseDate(dateStr);
    const amount = parseAmount(amtStr);

    if (!date) {
      warnings.push(
        `Row ${i + (looksHeadered ? 2 : 1)}: unparseable date "${dateStr}", skipped`,
      );
      continue;
    }
    if (amount === 0 && !amtStr.match(/^\s*0+(\.0+)?\s*$/)) {
      warnings.push(
        `Row ${i + (looksHeadered ? 2 : 1)}: unparseable amount "${amtStr}", skipped`,
      );
      continue;
    }
    if (!desc.trim()) {
      warnings.push(
        `Row ${i + (looksHeadered ? 2 : 1)}: missing description, skipped`,
      );
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
      issuer: "usaa",
      transactions,
      statementStart: sorted[0].date,
      statementEnd: sorted[sorted.length - 1].date,
      warnings,
    },
  };
};
