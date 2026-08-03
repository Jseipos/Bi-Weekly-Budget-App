// ============================================
// Archive imported statement files to iCloud Drive.
//
// Mirrors the pattern in receipt-storage.ts:
//   - Resolves the iCloud base path from ICLOUD_BASE_PATH env or default
//   - Creates a per-issuer, per-year subfolder structure
//   - Writes the original file untouched (we want the bank-supplied PDF/CSV
//     preserved verbatim for record-keeping)
//
// Final layout under ICLOUD_BASE_PATH:
//   Statements/
//     Chase/
//       2025/
//         Chase_2025-08_activity.csv
//         Chase_2025-08_activity.pdf
//     Capital One/
//       2025/...
//     USAA/2025/...
//     PNC/2025/...
//     Target/2025/...
//
// If iCloud isn't reachable (e.g. when running outside the Docker mount),
// we fall back to ./data/statements/ next to the SQLite db.
// ============================================

import fs from "fs";
import path from "path";
import { sanitizeFilename } from "./utils";
import { ISSUER_LABELS, type Issuer } from "./statement-parsers";

const STATEMENTS_SUBFOLDER = "Statements";
const ALLOWED_EXTENSIONS = [".csv", ".pdf", ".ofx", ".qfx", ".xlsx", ".xls"];
const MAX_FILE_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || "10485760"); // 10MB default

function getIcloudBasePath(): string {
  const envPath = process.env.ICLOUD_BASE_PATH;
  if (envPath) {
    return envPath.replace(/^~/, process.env.HOME || "");
  }
  return path.join(
    process.env.HOME || "",
    "Library/Mobile Documents/com~apple~CloudDocs",
  );
}

/**
 * Build a deterministic filename for an archived statement.
 * Format: {Issuer}_{YYYY-MM}_{originalStem}{ext}
 *
 * Including YYYY-MM (from the statement end date) makes the folder
 * naturally sort chronologically.
 */
export function generateStatementFilename(
  issuer: Issuer,
  statementEnd: string | null,
  originalFilename: string,
): string {
  const ext = path.extname(originalFilename).toLowerCase();
  const stem = path.basename(originalFilename, ext);
  const issuerPart = sanitizeFilename(ISSUER_LABELS[issuer]);
  const monthPart = statementEnd ? statementEnd.slice(0, 7) : "undated";
  const stemPart = sanitizeFilename(stem) || "statement";
  return `${issuerPart}_${monthPart}_${stemPart}${ext}`;
}

export interface ArchiveResult {
  /** Absolute path where the file was saved. */
  path: string;
  /** True if iCloud was used; false if fallback ./data/statements/. */
  iCloud: boolean;
}

/**
 * Archive a statement file. Returns the absolute path written to.
 *
 * Does NOT modify the file contents — bank-supplied originals are
 * preserved bit-for-bit for record-keeping purposes.
 */
export async function archiveStatementFile(
  fileBuffer: Buffer,
  issuer: Issuer,
  statementEnd: string | null,
  originalFilename: string,
): Promise<ArchiveResult> {
  const ext = path.extname(originalFilename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Unsupported statement file type: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
    );
  }
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error(
      `Statement file too large: ${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB. ` +
        `Max: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB`,
    );
  }

  const yearFolder = statementEnd ? statementEnd.slice(0, 4) : "undated";
  const issuerFolder = ISSUER_LABELS[issuer];
  const targetFilename = generateStatementFilename(
    issuer,
    statementEnd,
    originalFilename,
  );

  // Preferred: iCloud
  const icloudBase = getIcloudBasePath();
  const icloudDir = path.join(
    icloudBase,
    STATEMENTS_SUBFOLDER,
    issuerFolder,
    yearFolder,
  );

  try {
    if (fs.existsSync(icloudBase)) {
      if (!fs.existsSync(icloudDir)) {
        fs.mkdirSync(icloudDir, { recursive: true });
      }
      const targetPath = path.join(icloudDir, targetFilename);
      fs.writeFileSync(targetPath, fileBuffer);
      return { path: targetPath, iCloud: true };
    }
  } catch (e) {
    // Fall through to local fallback. We don't want a busted iCloud mount
    // to lose the user's data.
    console.warn(`Statement iCloud archive failed: ${(e as Error).message}`);
  }

  // Fallback: local data/statements/
  const localDir = path.join(
    process.cwd(),
    "data",
    "statements",
    issuerFolder,
    yearFolder,
  );
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  const localPath = path.join(localDir, targetFilename);
  fs.writeFileSync(localPath, fileBuffer);
  return { path: localPath, iCloud: false };
}
