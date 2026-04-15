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
