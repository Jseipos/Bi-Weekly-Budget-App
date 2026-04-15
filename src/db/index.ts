import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const dbPath = process.env.DATABASE_URL || "./data/budget.db";

// Ensure the data directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });

// Run migrations on startup (safe to run multiple times)
const migrationsPath = path.join(process.cwd(), "drizzle");
if (fs.existsSync(migrationsPath)) {
  try {
    migrate(db, { migrationsFolder: migrationsPath });
  } catch (e) {
    // Migrations may fail on first run if no migration files exist yet
    console.log("Migration note:", (e as Error).message);
  }
}
