"use server";

import { db } from "@/db";
import { unplannedExpenses, categories } from "@/db/schema";
import { eq, like, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  generateReceiptFilename,
  saveReceiptToIcloud,
  saveReceiptLocally,
} from "@/lib/receipt-storage";

const expenseSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
});

export async function getUnplannedExpenses(yearMonth: string) {
  return db
    .select()
    .from(unplannedExpenses)
    .where(like(unplannedExpenses.date, `${yearMonth}%`))
    .orderBy(desc(unplannedExpenses.date))
    .all();
}

export async function createUnplannedExpense(formData: FormData) {
  const raw = {
    amount: parseFloat(formData.get("amount") as string),
    date: formData.get("date") as string,
    category: formData.get("category") as string,
    description: (formData.get("description") as string) || undefined,
  };

  const parsed = expenseSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  let receiptFilename: string | null = null;
  let receiptIcloudPath: string | null = null;

  // Handle receipt file upload
  const receiptFile = formData.get("receipt") as File | null;
  if (receiptFile && receiptFile.size > 0) {
    try {
      const buffer = Buffer.from(await receiptFile.arrayBuffer());
      const filename = generateReceiptFilename(
        parsed.data.category,
        parsed.data.date,
        parsed.data.description || null,
        receiptFile.name
      );

      // Check if category has an iCloud folder configured
      const cat = db
        .select()
        .from(categories)
        .where(eq(categories.name, parsed.data.category))
        .get();

      if (cat?.icloudFolderPath) {
        receiptIcloudPath = await saveReceiptToIcloud(
          buffer,
          receiptFile.name,
          cat.icloudFolderPath,
          filename
        );
        receiptFilename = filename;
      } else {
        // Save locally as fallback
        receiptIcloudPath = await saveReceiptLocally(
          buffer,
          receiptFile.name,
          filename
        );
        receiptFilename = filename;
      }
    } catch (e) {
      return {
        success: false,
        error: `Receipt upload failed: ${(e as Error).message}`,
      };
    }
  }

  db.insert(unplannedExpenses)
    .values({
      amount: parsed.data.amount,
      date: parsed.data.date,
      category: parsed.data.category,
      description: parsed.data.description || null,
      receiptFilename,
      receiptIcloudPath,
    })
    .run();

  revalidatePath("/spending");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteUnplannedExpense(id: number) {
  db.delete(unplannedExpenses)
    .where(eq(unplannedExpenses.id, id))
    .run();

  revalidatePath("/spending");
  revalidatePath("/dashboard");
  return { success: true };
}
