// ============================================
// Target (REDcard) CSV parser.
//
// The Target REDcard is operated by TD Bank, and the activity export from
// rcam.target.com tends to use a simple layout:
//   Date,Description,Amount
//
// Sign convention varies — sometimes Amount is POSITIVE for purchases
// (the bill-shaped POV) and negative for payments. To normalize, we
// inspect the description: rows containing "PAYMENT" or "CREDIT" with a
// positive amount are flipped to positive (inflow) in our convention,
// while non-payment positive amounts are flipped to negative (expense).
//
// If a row already has a negative sign, we trust it as-is.
// ============================================

import type { IssuerParser, ParsedTransaction, ParseResult } from "./types";
import { parseCsv, parseAmount, parseDate, indexHeaders } from "./csv-utils";

const HEADER_ALIASES = {
  date: ["date", "transaction date", "posting date", "post date"],
  description: ["description", "merchant"],
  amount: ["amount"],
  category: ["category", "type"],
} as const;

function looksLikePayment(description: string): boolean {
  const up = description.toUpperCase();
  return (
    up.includes("PAYMENT") ||
    up.includes("AUTOPAY") ||
    up.includes("CREDIT") ||
    up.includes("REFUND") ||
    up.includes("RETURN")
  );
}

export const parseTarget: IssuerParser = (csvText): ParseResult => {
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return { ok: false, error: "CSV has no data rows" };
  }

  const idx = indexHeaders([...rows[0]], HEADER_ALIASES);
  if (idx.date === -1 || idx.description === -1 || idx.amount === -1) {
    return {
      ok: false,
      error:
        "Target/REDcard CSV is missing expected columns (need Date, Description, Amount).",
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
    const rawAmount = parseAmount(amtStr);

    if (!date) {
      warnings.push(`Row ${i + 1}: unparseable date "${dateStr}", skipped`);
      continue;
    }
    if (rawAmount === 0) {
      warnings.push(`Row ${i + 1}: zero amount, skipped`);
      continue;
    }
    if (!desc.trim()) {
      warnings.push(`Row ${i + 1}: missing description, skipped`);
      continue;
    }

    // Normalize sign: if positive, decide based on description
    let amount: number;
    if (rawAmount < 0) {
      // Already signed — trust it
      amount = rawAmount;
    } else if (looksLikePayment(desc)) {
      amount = rawAmount; // positive = inflow
    } else {
      amount = -rawAmount; // positive purchase -> negative expense
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
      issuer: "target",
      transactions,
      statementStart: sorted[0].date,
      statementEnd: sorted[sorted.length - 1].date,
      warnings,
    },
  };
};
