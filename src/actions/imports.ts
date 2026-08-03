"use server";

import { db } from "@/db";
import { importedStatements, importedTransactions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isAuthenticated } from "@/lib/auth";
import {
  parseStatementCsv,
  transactionFingerprint,
  type Issuer,
  type ParsedStatement,
} from "@/lib/statement-parsers";
import { archiveStatementFile } from "@/lib/statement-storage";

const ISSUERS = ["chase", "capital_one", "usaa", "pnc", "target"] as const;

// ---- Schemas ----

const parseSchema = z.object({
  issuer: z.enum(ISSUERS),
});

const confirmTransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  amount: z.number(),
  description: z.string().min(1),
  rawDescription: z.string(),
  issuerCategory: z.string().nullable(),
  category: z.string().nullable(),
});

const confirmSchema = z.object({
  issuer: z.enum(ISSUERS),
  accountLabel: z.string().nullable(),
  filename: z.string().min(1),
  fileFormat: z.string().min(1),
  statementStart: z.string().nullable(),
  statementEnd: z.string().nullable(),
  // Original file as base64 — round-tripped from the client review
  // step so we don't write to disk until the user confirms.
  fileBase64: z.string(),
  transactions: z.array(confirmTransactionSchema).min(1),
});

// ---- Auth helper ----

async function requireAuth(): Promise<void> {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized");
  }
}

// ---- Public API ----

export interface ParseStatementResult {
  success: boolean;
  error?: string;
  statement?: ParsedStatement;
  /** Echoed back so the client can post the same bytes on confirm. */
  fileBase64?: string;
  filename?: string;
  fileFormat?: string;
}

/**
 * Parse a statement file into transactions WITHOUT writing anything
 * to the database. The client then shows a review screen and posts
 * back the (possibly edited) transactions via `confirmImport`.
 */
export async function parseStatement(
  formData: FormData,
): Promise<ParseStatementResult> {
  await requireAuth();

  const raw = { issuer: formData.get("issuer") as string };
  const parsed = parseSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const issuer = parsed.data.issuer as Issuer;

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "No file uploaded" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext !== "csv") {
    return {
      success: false,
      error: `Only CSV imports are supported right now. (Got .${ext}.) PDF support is coming next.`,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const csvText = buffer.toString("utf8");

  const result = parseStatementCsv(issuer, csvText);
  if (!result.ok || !result.data) {
    return { success: false, error: result.error ?? "Failed to parse" };
  }

  return {
    success: true,
    statement: result.data,
    fileBase64: buffer.toString("base64"),
    filename: file.name,
    fileFormat: ext,
  };
}

export interface ConfirmImportResult {
  success: boolean;
  error?: string;
  statementId?: number;
  insertedCount?: number;
  duplicateCount?: number;
}

/**
 * Persist a parsed-and-reviewed statement to the database, archive the
 * original file to iCloud, and return counts.
 *
 * Duplicates (by fingerprint) are silently skipped — they show up in
 * the returned `duplicateCount` so the UI can surface that fact.
 */
export async function confirmImport(
  payload: z.infer<typeof confirmSchema>,
): Promise<ConfirmImportResult> {
  await requireAuth();

  const parsed = confirmSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;
  const issuer = data.issuer as Issuer;

  // 1. Archive the original file
  let icloudPath: string | null = null;
  try {
    const buffer = Buffer.from(data.fileBase64, "base64");
    const archive = await archiveStatementFile(
      buffer,
      issuer,
      data.statementEnd,
      data.filename,
    );
    icloudPath = archive.path;
  } catch (e) {
    return {
      success: false,
      error: `Could not archive statement file: ${(e as Error).message}`,
    };
  }

  // 2. Insert statement row + transactions in a single transaction for atomicity
  let statementId: number;
  let insertedCount = 0;
  let duplicateCount = 0;

  try {
    db.transaction(() => {
      const inserted = db
        .insert(importedStatements)
        .values({
          issuer,
          accountLabel: data.accountLabel,
          filename: data.filename,
          fileFormat: data.fileFormat,
          icloudPath,
          statementStart: data.statementStart,
          statementEnd: data.statementEnd,
          transactionCount: 0, // updated after dedup
        })
        .returning({ id: importedStatements.id })
        .all();
      statementId = inserted[0].id;

      for (const tx of data.transactions) {
        const fingerprint = transactionFingerprint(issuer, {
          date: tx.date,
          amount: tx.amount,
          description: tx.description,
          rawDescription: tx.rawDescription,
          issuerCategory: tx.issuerCategory,
        });

        try {
          db.insert(importedTransactions)
            .values({
              statementId,
              date: tx.date,
              amount: tx.amount,
              description: tx.description,
              rawDescription: tx.rawDescription,
              category: tx.category,
              issuerCategory: tx.issuerCategory,
              fingerprint,
            })
            .run();
          insertedCount++;
        } catch (e) {
          // UNIQUE constraint on fingerprint -> duplicate, skip
          if ((e as Error).message.includes("UNIQUE")) {
            duplicateCount++;
          } else {
            throw e;
          }
        }
      }

      db.update(importedStatements)
        .set({ transactionCount: insertedCount })
        .where(eq(importedStatements.id, statementId))
        .run();
    });
  } catch (e) {
    return {
      success: false,
      error: `Database write failed: ${(e as Error).message}`,
    };
  }

  revalidatePath("/imports");
  revalidatePath("/dashboard");
  revalidatePath("/spending");

  return {
    success: true,
    statementId: statementId!,
    insertedCount,
    duplicateCount,
  };
}

/** List past imports, newest first. */
export async function listImports() {
  await requireAuth();
  return db
    .select()
    .from(importedStatements)
    .orderBy(desc(importedStatements.importedAt))
    .all();
}

/**
 * Delete an import and its transactions (cascade). Does NOT delete the
 * archived file from iCloud — the user can clean that up manually if
 * they want, since deleting the source statement file is a high-stakes
 * action we'd rather not automate.
 */
export async function deleteImport(id: number) {
  await requireAuth();
  db.delete(importedStatements).where(eq(importedStatements.id, id)).run();

  revalidatePath("/imports");
  revalidatePath("/dashboard");
  revalidatePath("/spending");
  return { success: true };
}

/** Update a single imported transaction's category (used from review/list). */
export async function setImportedTransactionCategory(
  id: number,
  category: string | null,
) {
  await requireAuth();
  db.update(importedTransactions)
    .set({ category })
    .where(eq(importedTransactions.id, id))
    .run();
  revalidatePath("/imports");
  revalidatePath("/dashboard");
  return { success: true };
}
