"use server";

import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { seed } from "@/db/seed";

let seeded = false;
async function ensureSeeded() {
  if (!seeded) {
    await seed();
    seeded = true;
  }
}

export async function getCategories() {
  await ensureSeeded();
  return db.select().from(categories).all();
}

export async function createCategory(name: string) {
  if (!name || name.trim().length === 0) {
    return { success: false, error: "Category name is required" };
  }

  try {
    db.insert(categories)
      .values({ name: name.trim(), isDefault: false })
      .run();
    revalidatePath("/settings");
    revalidatePath("/spending");
    return { success: true };
  } catch {
    return { success: false, error: "Category already exists" };
  }
}

export async function deleteCategory(id: number) {
  const cat = db.select().from(categories).where(eq(categories.id, id)).get();
  if (!cat) {
    return { success: false, error: "Category not found" };
  }
  if (cat.isDefault) {
    return { success: false, error: "Cannot delete default categories" };
  }

  db.delete(categories).where(eq(categories.id, id)).run();
  revalidatePath("/settings");
  revalidatePath("/spending");
  return { success: true };
}

export async function updateCategoryIcloudPath(
  id: number,
  icloudFolderPath: string | null
) {
  db.update(categories)
    .set({ icloudFolderPath })
    .where(eq(categories.id, id))
    .run();
  revalidatePath("/settings");
  return { success: true };
}
