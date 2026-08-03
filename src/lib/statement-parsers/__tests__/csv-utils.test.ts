import { describe, it, expect } from "vitest";
import { parseCsv, parseAmount, parseDate, indexHeaders } from "../csv-utils";

describe("parseCsv", () => {
  it("parses a simple CSV", () => {
    const rows = parseCsv("a,b,c\n1,2,3\n");
    expect(rows).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields with commas inside", () => {
    const rows = parseCsv(`name,description\nAcme,"Hello, World"\n`);
    expect(rows[1]).toEqual(["Acme", "Hello, World"]);
  });

  it('handles "" as escaped quote', () => {
    const rows = parseCsv(`x\n"He said ""hi"""\n`);
    expect(rows[1]).toEqual([`He said "hi"`]);
  });

  it("handles CRLF line endings", () => {
    const rows = parseCsv("a,b\r\n1,2\r\n");
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("skips blank lines", () => {
    const rows = parseCsv("a,b\n\n1,2\n");
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("handles quoted field with embedded newline", () => {
    const rows = parseCsv(`x,y\n"line1\nline2",ok\n`);
    expect(rows[1]).toEqual(["line1\nline2", "ok"]);
  });
});

describe("parseAmount", () => {
  it("parses plain numbers", () => {
    expect(parseAmount("12.34")).toBe(12.34);
    expect(parseAmount("-5")).toBe(-5);
    expect(parseAmount("0")).toBe(0);
  });
  it("strips currency formatting", () => {
    expect(parseAmount("$1,234.56")).toBe(1234.56);
    expect(parseAmount("-$45.00")).toBe(-45);
  });
  it("handles accounting parentheses", () => {
    expect(parseAmount("(45.00)")).toBe(-45);
    expect(parseAmount("($1,234.56)")).toBe(-1234.56);
  });
  it("flips sign on CR suffix", () => {
    expect(parseAmount("12.50 CR")).toBe(-12.5);
  });
  it("returns 0 for empty/garbage", () => {
    expect(parseAmount("")).toBe(0);
    expect(parseAmount("   ")).toBe(0);
    expect(parseAmount("abc")).toBe(0);
  });
});

describe("parseDate", () => {
  it("passes through ISO", () => {
    expect(parseDate("2025-03-14")).toBe("2025-03-14");
  });
  it("parses MM/DD/YYYY", () => {
    expect(parseDate("3/14/2025")).toBe("2025-03-14");
    expect(parseDate("03/14/2025")).toBe("2025-03-14");
  });
  it("parses MM-DD-YYYY", () => {
    expect(parseDate("03-14-2025")).toBe("2025-03-14");
  });
  it("handles 2-digit years", () => {
    expect(parseDate("3/14/25")).toBe("2025-03-14");
    expect(parseDate("3/14/99")).toBe("1999-03-14");
  });
  it("returns null for unparseable", () => {
    expect(parseDate("not a date")).toBeNull();
    expect(parseDate("")).toBeNull();
  });
});

describe("indexHeaders", () => {
  it("matches headers case-insensitively", () => {
    const idx = indexHeaders(["Transaction Date", "Description", "Amount"], {
      date: ["date", "transaction date"],
      desc: ["description"],
      amt: ["amount"],
    });
    expect(idx).toEqual({ date: 0, desc: 1, amt: 2 });
  });
  it("returns -1 for missing headers", () => {
    const idx = indexHeaders(["A"], { date: ["date"] });
    expect(idx.date).toBe(-1);
  });
});
