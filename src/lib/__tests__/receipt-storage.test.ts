import { describe, it, expect } from "vitest";
import { generateReceiptFilename } from "../receipt-storage";

describe("generateReceiptFilename", () => {
  it("generates correct filename with description", () => {
    const result = generateReceiptFilename(
      "Groceries",
      "2026-03-15",
      "Whole Foods run",
      "photo.jpg"
    );
    // Category and description are sanitized (spaces and special chars removed)
    // "Whole Foods run" -> sanitized -> "WholeFoodsrun"
    expect(result).toBe("Groceries_2026-03-15_WholeFoodsrun.jpg");
  });

  it("defaults to 'receipt' when description is null", () => {
    const result = generateReceiptFilename(
      "Transport",
      "2026-02-10",
      null,
      "scan.png"
    );
    expect(result).toBe("Transport_2026-02-10_receipt.png");
  });

  it("converts HEIC files to .jpg extension", () => {
    const result = generateReceiptFilename(
      "Medical",
      "2026-01-20",
      "Doctor visit",
      "IMG_1234.HEIC"
    );
    expect(result).toMatch(/\.jpg$/);
    expect(result).not.toMatch(/\.heic$/i);
    expect(result).toBe("Medical_2026-01-20_Doctorvisit.jpg");
  });

  it("converts lowercase .heic to .jpg extension", () => {
    const result = generateReceiptFilename(
      "Food",
      "2026-04-01",
      "lunch",
      "receipt.heic"
    );
    expect(result).toBe("Food_2026-04-01_lunch.jpg");
  });

  it("sanitizes special characters in category", () => {
    const result = generateReceiptFilename(
      "Food & Drink!",
      "2026-05-01",
      "coffee",
      "image.jpg"
    );
    // "Food & Drink!" sanitized -> "FoodDrink"
    expect(result).toBe("FoodDrink_2026-05-01_coffee.jpg");
    expect(result).not.toContain("&");
    expect(result).not.toContain("!");
    expect(result).not.toContain(" ");
  });

  it("sanitizes special characters in description", () => {
    const result = generateReceiptFilename(
      "Shopping",
      "2026-06-15",
      "Amazon order #12345",
      "receipt.pdf"
    );
    // "Amazon order #12345" sanitized -> "Amazonorder12345"
    expect(result).toBe("Shopping_2026-06-15_Amazonorder12345.pdf");
    expect(result).not.toContain("#");
    expect(result).not.toContain(" ");
  });

  it("preserves .jpg extension", () => {
    const result = generateReceiptFilename("Test", "2026-01-01", "desc", "photo.jpg");
    expect(result).toMatch(/\.jpg$/);
  });

  it("preserves .png extension", () => {
    const result = generateReceiptFilename("Test", "2026-01-01", "desc", "photo.png");
    expect(result).toMatch(/\.png$/);
  });

  it("preserves .pdf extension", () => {
    const result = generateReceiptFilename("Test", "2026-01-01", "desc", "scan.pdf");
    expect(result).toMatch(/\.pdf$/);
  });

  it("preserves .jpeg extension", () => {
    const result = generateReceiptFilename("Test", "2026-01-01", "desc", "photo.jpeg");
    expect(result).toMatch(/\.jpeg$/);
  });

  it("handles category with only special characters", () => {
    const result = generateReceiptFilename(
      "!!!",
      "2026-01-01",
      "test",
      "photo.jpg"
    );
    // Sanitized category becomes empty string
    expect(result).toBe("_2026-01-01_test.jpg");
  });

  it("truncates long category and description to 50 chars each", () => {
    const longCategory = "A".repeat(100);
    const longDescription = "B".repeat(100);
    const result = generateReceiptFilename(
      longCategory,
      "2026-01-01",
      longDescription,
      "photo.jpg"
    );

    // sanitizeFilename truncates each to 50 chars
    const parts = result.split("_");
    // parts: [category, date(2026-01-01), description.jpg]
    expect(parts[0]).toHaveLength(50);
    // The description part includes the extension
    const descWithExt = parts.slice(2).join("_");
    expect(descWithExt).toBe("B".repeat(50) + ".jpg");
  });
});
