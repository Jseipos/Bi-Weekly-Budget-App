import { describe, it, expect } from "vitest";
import { parseStatementCsv } from "../index";

describe("Chase parser", () => {
  it("parses a standard Chase credit card CSV", () => {
    const csv =
      "Transaction Date,Post Date,Description,Category,Type,Amount,Memo\n" +
      "03/01/2025,03/02/2025,STARBUCKS #1234,Food & Drink,Sale,-5.45,\n" +
      "03/05/2025,03/05/2025,PAYMENT THANK YOU,,Payment,250.00,\n" +
      "03/10/2025,03/11/2025,AMAZON.COM,Shopping,Sale,-89.99,Refund expected\n";

    const r = parseStatementCsv("chase", csv);
    expect(r.ok).toBe(true);
    expect(r.data!.transactions).toHaveLength(3);
    expect(r.data!.transactions[0]).toMatchObject({
      date: "2025-03-01",
      amount: -5.45,
      description: "STARBUCKS #1234",
      issuerCategory: "Food & Drink",
    });
    expect(r.data!.transactions[1].amount).toBe(250);
    expect(r.data!.statementStart).toBe("2025-03-01");
    expect(r.data!.statementEnd).toBe("2025-03-10");
  });

  it("errors on a CSV missing required columns", () => {
    const r = parseStatementCsv("chase", "Foo,Bar\n1,2\n");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/missing expected columns/i);
  });

  it("collects warnings for unparseable rows", () => {
    const csv =
      "Transaction Date,Description,Amount\n" +
      "03/01/2025,GOOD,-5.00\n" +
      "BADDATE,STILL HAS DESC,-1.00\n" +
      "03/02/2025,,-2.00\n";
    const r = parseStatementCsv("chase", csv);
    expect(r.ok).toBe(true);
    expect(r.data!.transactions).toHaveLength(1);
    expect(r.data!.warnings.length).toBe(2);
  });
});

describe("Capital One parser", () => {
  it("handles split Debit/Credit columns", () => {
    const csv =
      "Transaction Date,Posted Date,Card No.,Description,Category,Debit,Credit\n" +
      "2025-04-01,2025-04-02,1234,TARGET STORE,Merchandise,42.10,\n" +
      "2025-04-15,2025-04-15,1234,PAYMENT,Payment/Credit,,100.00\n";
    const r = parseStatementCsv("capital_one", csv);
    expect(r.ok).toBe(true);
    expect(r.data!.transactions[0].amount).toBe(-42.1);
    expect(r.data!.transactions[1].amount).toBe(100);
  });

  it("handles single Amount column for checking", () => {
    const csv =
      "Date,Description,Amount\n" +
      "2025-04-01,COFFEE,-3.75\n" +
      "2025-04-02,DIRECT DEPOSIT,2000.00\n";
    const r = parseStatementCsv("capital_one", csv);
    expect(r.ok).toBe(true);
    expect(r.data!.transactions[0].amount).toBe(-3.75);
    expect(r.data!.transactions[1].amount).toBe(2000);
  });
});

describe("USAA parser", () => {
  it("parses headered CSV", () => {
    const csv =
      "Date,Description,Original Description,Category,Amount,Status\n" +
      "5/1/2025,WALMART,WAL-MART #1234,Groceries,-23.45,Posted\n" +
      "5/3/2025,PAYROLL DEPOSIT,EMPLOYER PAYROLL,Income,2500.00,Posted\n";
    const r = parseStatementCsv("usaa", csv);
    expect(r.ok).toBe(true);
    expect(r.data!.transactions).toHaveLength(2);
    expect(r.data!.transactions[0].amount).toBe(-23.45);
    expect(r.data!.transactions[0].issuerCategory).toBe("Groceries");
  });

  it("parses legacy headerless 6-column", () => {
    const csv =
      `5/1/2025,"","",WALMART,"",-23.45\n` +
      `5/3/2025,"","",PAYROLL,"",2500.00\n`;
    const r = parseStatementCsv("usaa", csv);
    expect(r.ok).toBe(true);
    expect(r.data!.transactions).toHaveLength(2);
  });
});

describe("PNC parser", () => {
  it("handles Withdrawals/Deposits split", () => {
    const csv =
      "Date,Description,Withdrawals,Deposits,Category\n" +
      "06/01/2025,SHELL OIL,45.00,,Gas\n" +
      "06/03/2025,DIRECT DEP,,1500.00,Income\n";
    const r = parseStatementCsv("pnc", csv);
    expect(r.ok).toBe(true);
    expect(r.data!.transactions[0].amount).toBe(-45);
    expect(r.data!.transactions[1].amount).toBe(1500);
  });

  it("handles single Amount column", () => {
    const csv =
      "Date,Amount,Description\n" + "06/01/2025,-45.00,SHELL OIL\n";
    const r = parseStatementCsv("pnc", csv);
    expect(r.ok).toBe(true);
    expect(r.data!.transactions[0].amount).toBe(-45);
  });
});

describe("Target parser", () => {
  it("treats positive amounts on purchases as expenses", () => {
    const csv =
      "Date,Description,Amount\n" +
      "07/01/2025,TARGET STORE T-1234,42.10\n" +
      "07/15/2025,AUTOPAY PAYMENT,100.00\n" +
      "07/20/2025,REFUND - RETURN,15.00\n";
    const r = parseStatementCsv("target", csv);
    expect(r.ok).toBe(true);
    expect(r.data!.transactions[0].amount).toBe(-42.1); // purchase -> negative
    expect(r.data!.transactions[1].amount).toBe(100); // payment -> positive (inflow to CC)
    expect(r.data!.transactions[2].amount).toBe(15); // refund -> positive
  });

  it("respects already-negative amounts", () => {
    const csv = "Date,Description,Amount\n07/01/2025,TARGET STORE,-42.10\n";
    const r = parseStatementCsv("target", csv);
    expect(r.ok).toBe(true);
    expect(r.data!.transactions[0].amount).toBe(-42.1);
  });
});

describe("Fingerprint", () => {
  it("produces identical fingerprints for identical transactions", async () => {
    const { transactionFingerprint } = await import("../fingerprint");
    const tx = {
      date: "2025-03-01",
      amount: -5.45,
      description: "STARBUCKS",
      rawDescription: "STARBUCKS #1234",
      issuerCategory: null,
    };
    expect(transactionFingerprint("chase", tx)).toBe(
      transactionFingerprint("chase", tx),
    );
  });
  it("produces different fingerprints across issuers", async () => {
    const { transactionFingerprint } = await import("../fingerprint");
    const tx = {
      date: "2025-03-01",
      amount: -5.45,
      description: "STARBUCKS",
      rawDescription: "STARBUCKS #1234",
      issuerCategory: null,
    };
    expect(transactionFingerprint("chase", tx)).not.toBe(
      transactionFingerprint("usaa", tx),
    );
  });
});
