"use server";

import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { setSessionCookie, clearSessionCookie } from "@/lib/auth";
import { seed } from "@/db/seed";
import { redirect } from "next/navigation";

// Ensure DB is seeded on first access
let seeded = false;
async function ensureSeeded() {
  if (!seeded) {
    await seed();
    seeded = true;
  }
}

export async function verifyPin(
  pin: string
): Promise<{ success: boolean; error?: string }> {
  await ensureSeeded();

  if (!pin || pin.length < 4) {
    return { success: false, error: "PIN must be at least 4 digits" };
  }

  const pinRecord = db
    .select()
    .from(settings)
    .where(eq(settings.key, "pin_hash"))
    .get();

  if (!pinRecord) {
    return { success: false, error: "No PIN configured" };
  }

  const isValid = await bcrypt.compare(pin, pinRecord.value);
  if (!isValid) {
    return { success: false, error: "Incorrect PIN" };
  }

  await setSessionCookie();
  return { success: true };
}

export async function changePin(
  currentPin: string,
  newPin: string
): Promise<{ success: boolean; error?: string }> {
  if (!newPin || newPin.length < 4) {
    return { success: false, error: "New PIN must be at least 4 digits" };
  }

  const pinRecord = db
    .select()
    .from(settings)
    .where(eq(settings.key, "pin_hash"))
    .get();

  if (!pinRecord) {
    return { success: false, error: "No PIN configured" };
  }

  const isValid = await bcrypt.compare(currentPin, pinRecord.value);
  if (!isValid) {
    return { success: false, error: "Current PIN is incorrect" };
  }

  const newHash = await bcrypt.hash(newPin, 10);
  db.update(settings)
    .set({ value: newHash })
    .where(eq(settings.key, "pin_hash"))
    .run();

  return { success: true };
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}
