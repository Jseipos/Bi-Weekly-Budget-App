// ============================================
// Shared TypeScript types for Budget Planner
// ============================================

// Frequency types for recurring items
export type Frequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "semiannual"
  | "annual";

// Income or expense
export type ItemType = "income" | "expense";

// Debt paydown strategy
export type PaydownStrategy = "avalanche" | "snowball";

// ---- Recurring Items ----

export interface RecurringItem {
  id: number;
  name: string;
  amount: number;
  frequency: Frequency;
  startDate: string; // ISO YYYY-MM-DD
  type: ItemType;
  category: string;
  isActive: boolean;
  createdAt: string;
}

export type NewRecurringItem = Omit<RecurringItem, "id" | "createdAt" | "isActive">;

// ---- Unplanned Expenses ----

export interface UnplannedExpense {
  id: number;
  amount: number;
  date: string; // ISO YYYY-MM-DD
  category: string;
  description: string | null;
  receiptFilename: string | null;
  receiptIcloudPath: string | null;
  createdAt: string;
}

export type NewUnplannedExpense = Omit<
  UnplannedExpense,
  "id" | "createdAt" | "receiptFilename" | "receiptIcloudPath"
>;

// ---- Categories ----

export interface Category {
  id: number;
  name: string;
  isDefault: boolean;
  icloudFolderPath: string | null;
}

// ---- Debts ----

export interface Debt {
  id: number;
  name: string;
  currentBalance: number;
  interestRate: number; // APR as percentage (e.g., 24.99)
  minimumPayment: number;
  recurringItemId: number | null;
  dueDay: number; // 1-31
  isActive: boolean;
  createdAt: string;
}

export type NewDebt = Omit<Debt, "id" | "createdAt" | "isActive">;

export interface DebtPayment {
  id: number;
  debtId: number;
  amount: number;
  date: string; // ISO YYYY-MM-DD
  isExtra: boolean;
  note: string | null;
  createdAt: string;
}

export type NewDebtPayment = Omit<DebtPayment, "id" | "createdAt">;

// ---- Amortization ----

export interface AmortizationEntry {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export interface AmortizationResult {
  schedule: AmortizationEntry[];
  totalMonths: number;
  totalInterest: number;
  totalPaid: number;
}

export interface ExtraPaymentComparison {
  withoutExtra: AmortizationResult;
  withExtra: AmortizationResult;
  monthsSaved: number;
  interestSaved: number;
}

export interface DebtRanking {
  debt: Debt;
  monthlyInterestCost: number; // balance * (APR/100/12)
  rank: number;
}

export interface MultiDebtSimulationResult {
  strategy: PaydownStrategy;
  totalMonths: number;
  totalInterest: number;
  totalPaid: number;
  debtPayoffOrder: Array<{
    debtId: number;
    debtName: string;
    payoffMonth: number;
  }>;
}

// ---- Dashboard ----

export interface OccurrenceResult {
  count: number;
  dates: Date[];
}

export interface RecurringItemWithOccurrences {
  item: RecurringItem;
  occurrences: number;
  dates: string[]; // ISO dates within the month
  totalForMonth: number; // amount * occurrences
}

export interface CategorySpending {
  category: string;
  actual: number;
  predicted: number; // rolling 3-month avg
}

export interface DebtRecommendation {
  availableAmount: number;
  priorityDebt: Debt;
  strategy: PaydownStrategy;
  interestSaved: number;
  monthsSaved: number;
}

export interface MonthlyBreakdown {
  year: number;
  month: number; // 1-indexed
  recurringItems: RecurringItemWithOccurrences[];
  totalIncome: number;
  totalRecurringExpenses: number;
  unplannedByCategory: CategorySpending[];
  totalUnplanned: number;
  totalPredictedUnplanned: number;
  netBalance: number;
  predictedNetBalance: number;
  debtRecommendation: DebtRecommendation | null;
}
