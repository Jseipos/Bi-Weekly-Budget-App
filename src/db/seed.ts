import { db } from "./index";
import { settings, categories } from "./schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const DEFAULT_CATEGORIES = [
  "Food",
  "Gas",
  "Entertainment",
  "Shopping",
  "Healthcare",
  "Home",
  "Transportation",
  "Misc",
];

const DEFAULT_PIN = "0000";

export async function seed() {
  // Seed default categories if none exist
  const existingCategories = db.select().from(categories).all();
  if (existingCategories.length === 0) {
    for (const name of DEFAULT_CATEGORIES) {
      db.insert(categories)
        .values({ name, isDefault: true })
        .run();
    }
    console.log(`Seeded ${DEFAULT_CATEGORIES.length} default categories`);
  }

  // Seed default PIN if none exists
  const existingPin = db
    .select()
    .from(settings)
    .where(eq(settings.key, "pin_hash"))
    .get();

  if (!existingPin) {
    const hash = await bcrypt.hash(DEFAULT_PIN, 10);
    db.insert(settings)
      .values({ key: "pin_hash", value: hash })
      .run();
    console.log("Seeded default PIN (0000) — change this after first login!");
  }

  // Seed default paydown strategy
  const existingStrategy = db
    .select()
    .from(settings)
    .where(eq(settings.key, "paydown_strategy"))
    .get();

  if (!existingStrategy) {
    db.insert(settings)
      .values({ key: "paydown_strategy", value: "avalanche" })
      .run();
    console.log("Seeded default paydown strategy: avalanche");
  }
}
