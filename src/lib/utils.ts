import { type ClassValue, clsx } from "clsx";

// ---- Class name utility ----
// Simple clsx-style utility (no tailwind-merge needed for this project)
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// ---- Currency formatting ----
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ---- Date formatting ----
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

// ---- Month/Year formatting ----
export function formatMonthYear(year: number, month: number): string {
  const date = new Date(year, month - 1);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

// ---- Today's date as ISO ----
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// ---- Sanitize filename ----
export function sanitizeFilename(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .replace(/\s+/g, "")
    .substring(0, 50);
}

// ---- Percentage formatting ----
export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}
