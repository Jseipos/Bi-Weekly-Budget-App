import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ---- Settings ----
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

// ---- Recurring Items ----
export const recurringItems = sqliteTable("recurring_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  frequency: text("frequency").notNull(), // weekly | biweekly | monthly | quarterly | semiannual | annual
  startDate: text("start_date").notNull(), // ISO YYYY-MM-DD
  type: text("type").notNull(), // income | expense
  category: text("category").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ---- Unplanned Expenses ----
export const unplannedExpenses = sqliteTable("unplanned_expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  amount: real("amount").notNull(),
  date: text("date").notNull(), // ISO YYYY-MM-DD
  category: text("category").notNull(),
  description: text("description"),
  receiptFilename: text("receipt_filename"),
  receiptIcloudPath: text("receipt_icloud_path"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ---- Categories ----
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  isDefault: integer("is_default", { mode: "boolean" })
    .notNull()
    .default(false),
  icloudFolderPath: text("icloud_folder_path"),
});

// ---- Debts ----
export const debts = sqliteTable("debts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  currentBalance: real("current_balance").notNull(),
  interestRate: real("interest_rate").notNull(), // APR as percentage (e.g., 24.99)
  minimumPayment: real("minimum_payment").notNull(),
  recurringItemId: integer("recurring_item_id").references(
    () => recurringItems.id
  ),
  dueDay: integer("due_day").notNull(), // 1-31
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ---- Debt Payments ----
export const debtPayments = sqliteTable("debt_payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  debtId: integer("debt_id")
    .notNull()
    .references(() => debts.id),
  amount: real("amount").notNull(),
  date: text("date").notNull(), // ISO YYYY-MM-DD
  isExtra: integer("is_extra", { mode: "boolean" }).notNull().default(true),
  note: text("note"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ---- Imported Statements ----
// Tracks each statement file the user imports (one row per file).
// The original file is archived to iCloud at `icloudPath`; deleting a row
// here cascades to the transactions it produced.
export const importedStatements = sqliteTable("imported_statements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  issuer: text("issuer").notNull(), // chase | capital_one | usaa | pnc | target
  accountLabel: text("account_label"), // user-friendly e.g. "Chase Sapphire"
  filename: text("filename").notNull(), // original filename
  fileFormat: text("file_format").notNull(), // csv | pdf | ofx
  icloudPath: text("icloud_path"), // archived original
  statementStart: text("statement_start"), // ISO YYYY-MM-DD (earliest tx)
  statementEnd: text("statement_end"), // ISO YYYY-MM-DD (latest tx)
  transactionCount: integer("transaction_count").notNull().default(0),
  importedAt: text("imported_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ---- Imported Transactions ----
// Individual transactions parsed from a statement. Amount is signed:
// negative for expenses (outflows), positive for income/credits/refunds.
// `category` is null until the user assigns one in the review screen.
// `fingerprint` is a stable hash (issuer + date + amount + normalized desc)
// used to prevent re-importing the same transaction from a re-uploaded file.
export const importedTransactions = sqliteTable("imported_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  statementId: integer("statement_id")
    .notNull()
    .references(() => importedStatements.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // ISO YYYY-MM-DD
  amount: real("amount").notNull(), // signed: <0 expense, >0 income/credit
  description: text("description").notNull(), // user-editable
  rawDescription: text("raw_description").notNull(), // as parsed, never edited
  category: text("category"), // null until assigned
  issuerCategory: text("issuer_category"), // category from the bank's CSV, if any
  fingerprint: text("fingerprint").notNull().unique(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});
