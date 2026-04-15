import fs from "fs";
import path from "path";
import sharp from "sharp";
import { sanitizeFilename } from "./utils";

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".heic", ".pdf"];
const MAX_FILE_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || "10485760"); // 10MB default

function getIcloudBasePath(): string {
  const envPath = process.env.ICLOUD_BASE_PATH;
  if (envPath) {
    // Expand ~ to home dir
    return envPath.replace(/^~/, process.env.HOME || "");
  }
  return path.join(
    process.env.HOME || "",
    "Library/Mobile Documents/com~apple~CloudDocs"
  );
}

/**
 * Generate a standardized filename for a receipt.
 * Format: {CategoryName}_{YYYY-MM-DD}_{Description}.{ext}
 */
export function generateReceiptFilename(
  category: string,
  date: string,
  description: string | null,
  originalFilename: string
): string {
  const ext = path.extname(originalFilename).toLowerCase();
  // If HEIC, the saved file will be JPEG
  const finalExt = ext === ".heic" ? ".jpg" : ext;

  const catPart = sanitizeFilename(category);
  const descPart = description
    ? sanitizeFilename(description)
    : "receipt";

  return `${catPart}_${date}_${descPart}${finalExt}`;
}

/**
 * Save a receipt file to the iCloud Drive folder mapped to the category.
 *
 * - Converts HEIC to JPEG via sharp
 * - Creates target folder if it doesn't exist
 * - Returns the full path where the file was saved
 */
export async function saveReceiptToIcloud(
  fileBuffer: Buffer,
  originalFilename: string,
  icloudSubfolder: string,
  targetFilename: string
): Promise<string> {
  const ext = path.extname(originalFilename).toLowerCase();

  // Validate extension
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Unsupported file type: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`
    );
  }

  // Validate size
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error(
      `File too large: ${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB. Max: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB`
    );
  }

  // Build target directory
  const icloudBase = getIcloudBasePath();
  const targetDir = path.join(icloudBase, icloudSubfolder);

  // Create folder if it doesn't exist
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const targetPath = path.join(targetDir, targetFilename);

  // Convert HEIC to JPEG
  let outputBuffer: Buffer;
  if (ext === ".heic") {
    outputBuffer = await sharp(fileBuffer).jpeg({ quality: 90 }).toBuffer();
  } else {
    outputBuffer = fileBuffer;
  }

  // Write file
  fs.writeFileSync(targetPath, outputBuffer);

  return targetPath;
}

/**
 * Save receipt to a local uploads directory (fallback when no iCloud path is configured).
 */
export async function saveReceiptLocally(
  fileBuffer: Buffer,
  originalFilename: string,
  targetFilename: string
): Promise<string> {
  const ext = path.extname(originalFilename).toLowerCase();

  const uploadsDir = path.join(process.cwd(), "data", "receipts");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const targetPath = path.join(uploadsDir, targetFilename);

  let outputBuffer: Buffer;
  if (ext === ".heic") {
    outputBuffer = await sharp(fileBuffer).jpeg({ quality: 90 }).toBuffer();
  } else {
    outputBuffer = fileBuffer;
  }

  fs.writeFileSync(targetPath, outputBuffer);
  return targetPath;
}
