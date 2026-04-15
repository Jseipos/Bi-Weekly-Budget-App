"use server";

import { db } from "@/db";
import { debts, debtPayments, settings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PaydownStrategy } from "@/types";

// ---- Validation schemas ----

const debtSchema = z.object({
  name: z.string().min(1, "Name is required"),
  currentBalance: z.number().positive("Balance must be positive"),
  interestRate: z.number().min(0, "Interest rate cannot be negative"),
  minimumPayment: z.number().positive("Minimum payment must be positive"),
  dueDay: z.number().int().min(1, "Due day must be 1-31").max(31, "Due day must be 1-31"),
});

const debtPaymentSchema = z.object({
  debtId: z.number().int().positive("Debt ID is required"),
  amount: z.number().positive("Amount must be positive"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  isExtra: z.boolean(),
  note: z.string().nullable(),
});

// ---- Debt CRUD ----

export async function getDebts() {
  return db
    .select()
    .from(debts)
    .where(eq(debts.isActive, true))
    .all();
}

export async function getDebt(id: number) {
  const result = db
    .select()
    .from(debts)
    .where(eq(debts.id, id))
    .get();
  return result ?? null;
}

export async function createDebt(formData: FormData) {
  const raw = {
    name: formData.get("name") as string,
    currentBalance: parseFloat(formData.get("currentBalance") as string),
    interestRate: parseFloat(formData.get("interestRate") as string),
    minimumPayment: parseFloat(formData.get("minimumPayment") as string),
    dueDay: parseInt(formData.get("dueDay") as string, 10),
  };

  const parsed = debtSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  db.insert(debts)
    .values({
      name: parsed.data.name,
      currentBalance: parsed.data.currentBalance,
      interestRate: parsed.data.interestRate,
      minimumPayment: parsed.data.minimumPayment,
      dueDay: parsed.data.dueDay,
    })
    .run();

  revalidatePath("/debts");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateDebt(id: number, formData: FormData) {
  const raw = {
    name: formData.get("name") as string,
    currentBalance: parseFloat(formData.get("currentBalance") as string),
    interestRate: parseFloat(formData.get("interestRate") as string),
    minimumPayment: parseFloat(formData.get("minimumPayment") as string),
    dueDay: parseInt(formData.get("dueDay") as string, 10),
  };

  const parsed = debtSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  db.update(debts)
    .set({
      name: parsed.data.name,
      currentBalance: parsed.data.currentBalance,
      interestRate: parsed.data.interestRate,
      minimumPayment: parsed.data.minimumPayment,
      dueDay: parsed.data.dueDay,
    })
    .where(eq(debts.id, id))
    .run();

  revalidatePath("/debts");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteDebt(id: number) {
  // Soft delete
  db.update(debts)
    .set({ isActive: false })
    .where(eq(debts.id, id))
    .run();

  revalidatePath("/debts");
  revalidatePath("/dashboard");
  return { success: true };
}

// ---- Debt Payments ----

export async function getDebtPayments(debtId: number) {
  return db
    .select()
    .from(debtPayments)
    .where(eq(debtPayments.debtId, debtId))
    .orderBy(desc(debtPayments.date))
    .all();
}

export async function createDebtPayment(formData: FormData) {
  const raw = {
    debtId: parseInt(formData.get("debtId") as string, 10),
    amount: parseFloat(formData.get("amount") as string),
    date: formData.get("date") as string,
    isExtra: formData.get("isExtra") === "true",
    note: (formData.get("note") as string) || null,
  };

  const parsed = debtPaymentSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // Insert the payment record
  db.insert(debtPayments)
    .values({
      debtId: parsed.data.debtId,
      amount: parsed.data.amount,
      date: parsed.data.date,
      isExtra: parsed.data.isExtra,
      note: parsed.data.note,
    })
    .run();

  // Update the debt's current balance
  const debt = db
    .select()
    .from(debts)
    .where(eq(debts.id, parsed.data.debtId))
    .get();

  if (debt) {
    const newBalance = Math.max(0, debt.currentBalance - parsed.data.amount);
    db.update(debts)
      .set({ currentBalance: Math.round(newBalance * 100) / 100 })
      .where(eq(debts.id, parsed.data.debtId))
      .run();
  }

  revalidatePath("/debts");
  revalidatePath("/dashboard");
  return { success: true };
}

// ---- Paydown Strategy ----

export async function getPaydownStrategy(): Promise<PaydownStrategy> {
  const row = db
    .select()
    .from(settings)
    .where(eq(settings.key, "paydown_strategy"))
    .get();

  if (row && (row.value === "avalanche" || row.value === "snowball")) {
    return row.value;
  }
  return "avalanche";
}

export async function setPaydownStrategy(strategy: "avalanche" | "snowball") {
  const existing = db
    .select()
    .from(settings)
    .where(eq(settings.key, "paydown_strategy"))
    .get();

  if (existing) {
    db.update(settings)
      .set({ value: strategy })
      .where(eq(settings.key, "paydown_strategy"))
      .run();
  } else {
    db.insert(settings)
      .values({ key: "paydown_strategy", value: strategy })
      .run();
  }

  revalidatePath("/debts");
  revalidatePath("/dashboard");
}
