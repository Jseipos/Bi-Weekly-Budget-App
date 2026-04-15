"use server";

import { db } from "@/db";
import { recurringItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Frequency, ItemType } from "@/types";

const recurringItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.number().positive("Amount must be positive"),
  frequency: z.enum([
    "weekly",
    "biweekly",
    "monthly",
    "quarterly",
    "semiannual",
    "annual",
  ]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1, "Category is required"),
});

export async function getRecurringItems() {
  return db
    .select()
    .from(recurringItems)
    .where(eq(recurringItems.isActive, true))
    .all();
}

export async function getAllRecurringItems() {
  return db.select().from(recurringItems).all();
}

export async function createRecurringItem(formData: FormData) {
  const raw = {
    name: formData.get("name") as string,
    amount: parseFloat(formData.get("amount") as string),
    frequency: formData.get("frequency") as Frequency,
    startDate: formData.get("startDate") as string,
    type: formData.get("type") as ItemType,
    category: formData.get("category") as string,
  };

  const parsed = recurringItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  db.insert(recurringItems)
    .values({
      name: parsed.data.name,
      amount: parsed.data.amount,
      frequency: parsed.data.frequency,
      startDate: parsed.data.startDate,
      type: parsed.data.type,
      category: parsed.data.category,
    })
    .run();

  revalidatePath("/recurring");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateRecurringItem(id: number, formData: FormData) {
  const raw = {
    name: formData.get("name") as string,
    amount: parseFloat(formData.get("amount") as string),
    frequency: formData.get("frequency") as Frequency,
    startDate: formData.get("startDate") as string,
    type: formData.get("type") as ItemType,
    category: formData.get("category") as string,
  };

  const parsed = recurringItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  db.update(recurringItems)
    .set({
      name: parsed.data.name,
      amount: parsed.data.amount,
      frequency: parsed.data.frequency,
      startDate: parsed.data.startDate,
      type: parsed.data.type,
      category: parsed.data.category,
    })
    .where(eq(recurringItems.id, id))
    .run();

  revalidatePath("/recurring");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteRecurringItem(id: number) {
  // Soft delete
  db.update(recurringItems)
    .set({ isActive: false })
    .where(eq(recurringItems.id, id))
    .run();

  revalidatePath("/recurring");
  revalidatePath("/dashboard");
  return { success: true };
}
