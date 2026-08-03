// ============================================
// Transaction fingerprinting for deduplication.
//
// Goal: re-uploading the same CSV (or an overlapping period from a fresh
// download) should NOT create duplicate transactions in the database.
//
// Strategy: hash (issuer + date + amount + normalized description). The
// hash is stored as a UNIQUE column in `imported_transactions`, so the
// DB itself rejects duplicates regardless of how the import flow tries
// to insert them.
//
// Note: we use Node's built-in crypto.createHash. This file runs server-
// side only (in server actions), never on Edge middleware.
// ============================================

import { createHash } from "crypto";
import type { Issuer, ParsedTransaction } from "./types";
import { normalizeDescription } from "./csv-utils";

/**
 * Build a stable fingerprint for a transaction.
 *
 * The fingerprint is deterministic given the same inputs, so importing
 * the same statement twice yields the same fingerprint per row and the
 * UNIQUE constraint catches it. Different banks can legitimately have
 * the same date/amount/desc combo, so issuer is part of the hash.
 */
export function transactionFingerprint(
  issuer: Issuer,
  tx: ParsedTransaction,
): string {
  const parts = [
    issuer,
    tx.date,
    tx.amount.toFixed(2),
    normalizeDescription(tx.rawDescription).toUpperCase(),
  ].join("|");

  return createHash("sha256").update(parts).digest("hex").slice(0, 32);
}
