"""
Seed Jessica's budget-planner database from Jessica_Debt_Freedom_Plan.md.

- Adds 3 new categories: Income, Childcare, Education
- Inserts 17 recurring items (2 income, 15 expenses)
- Inserts 7 debts using live balances supplied 2026-05-15

Run once. Re-running will create duplicates; the script does not upsert
recurring_items / debts because they have no natural unique key.
"""

import sqlite3
from pathlib import Path

# Resolve to <repo>/data/budget.db relative to this script.
DB_PATH = Path(__file__).resolve().parent.parent / "data" / "budget.db"

# Dates
SALARY_START = "2026-05-15"   # Friday — biweekly anchor
VA_START = "2026-05-01"       # VA disability ~1st of month
MONTHLY_START = "2026-05-01"  # Start of current month for all other recurring expenses

NEW_CATEGORIES = [
    # (name, is_default, icloud_folder_path)
    ("Income", 0, None),
    ("Childcare", 0, None),
    ("Education", 0, None),
]

# (name, amount, frequency, start_date, type, category)
RECURRING_ITEMS = [
    # Income
    ("Salary",                3533.00, "biweekly", SALARY_START,  "income",  "Income"),
    ("VA Disability",         2219.00, "monthly",  VA_START,      "income",  "Income"),
    # Expenses
    ("Mortgage",              1700.00, "monthly",  MONTHLY_START, "expense", "Home"),
    ("HOA",                    370.00, "monthly",  MONTHLY_START, "expense", "Home"),
    ("VW Payment",             760.00, "monthly",  MONTHLY_START, "expense", "Transportation"),
    ("Kia (Mom)",              303.00, "monthly",  MONTHLY_START, "expense", "Transportation"),
    ("Childcare",              400.00, "monthly",  MONTHLY_START, "expense", "Childcare"),
    ("Auto Insurance (USAA)",  331.00, "monthly",  MONTHLY_START, "expense", "Transportation"),
    ("Electric (FPL)",         143.00, "monthly",  MONTHLY_START, "expense", "Home"),
    ("Water (Fort Myers)",      62.00, "monthly",  MONTHLY_START, "expense", "Home"),
    ("Factor Meals",           477.00, "monthly",  MONTHLY_START, "expense", "Food"),
    ("Groceries",              208.00, "monthly",  MONTHLY_START, "expense", "Food"),
    ("Gas",                    178.00, "monthly",  MONTHLY_START, "expense", "Gas"),
    ("Verizon",                101.00, "monthly",  MONTHLY_START, "expense", "Home"),
    ("Internet",                11.00, "monthly",  MONTHLY_START, "expense", "Home"),
    ("FL Prepaid College",     100.00, "monthly",  MONTHLY_START, "expense", "Education"),
    ("Daughter's Therapy",     237.00, "monthly",  MONTHLY_START, "expense", "Ayla Medical"),
]

# (name, current_balance, interest_rate, minimum_payment, due_day)
DEBTS = [
    ("Chase Prime Visa",        12892.01, 27.49, 144.00, 12),
    ("PNC Cash Rewards",         3610.00, 26.99,  50.00,  5),
    ("Target Circle Card",       4839.31, 26.40, 136.00, 22),
    ("Capital One",              3201.15, 24.49,  75.00, 15),
    ("PNC Core Visa",            9634.84, 17.49, 200.00, 12),
    ("Discover CC",             17264.18, 17.49, 346.00, 13),
    ("Discover Personal Loan",  20564.96, 11.99, 587.00, 13),
]


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    cur = conn.cursor()

    # Pre-flight safety: refuse to run if recurring_items or debts already have rows
    cur.execute("SELECT COUNT(*) FROM recurring_items")
    ri_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM debts")
    d_count = cur.fetchone()[0]
    if ri_count or d_count:
        raise SystemExit(
            f"Aborting: recurring_items has {ri_count} rows, debts has {d_count} rows. "
            "Run only against an empty dataset, or clear those tables first."
        )

    # 1. Categories (INSERT OR IGNORE so re-runs are safe for this table)
    cur.executemany(
        "INSERT OR IGNORE INTO categories (name, is_default, icloud_folder_path) VALUES (?, ?, ?)",
        NEW_CATEGORIES,
    )
    print(f"Categories inserted/ignored: {len(NEW_CATEGORIES)}")

    # 2. Recurring items
    cur.executemany(
        """
        INSERT INTO recurring_items (name, amount, frequency, start_date, type, category)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        RECURRING_ITEMS,
    )
    print(f"Recurring items inserted: {len(RECURRING_ITEMS)}")

    # 3. Debts
    cur.executemany(
        """
        INSERT INTO debts (name, current_balance, interest_rate, minimum_payment, due_day)
        VALUES (?, ?, ?, ?, ?)
        """,
        DEBTS,
    )
    print(f"Debts inserted: {len(DEBTS)}")

    conn.commit()
    conn.close()
    print("OK")


if __name__ == "__main__":
    main()
