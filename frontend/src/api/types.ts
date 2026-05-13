export type BillCategory =
  | "Loan"
  | "CreditCard"
  | "Utility"
  | "Subscription"
  | "Insurance"
  | "RentMortgage"
  | "Other";

export const BILL_CATEGORIES: BillCategory[] = [
  "RentMortgage",
  "Loan",
  "CreditCard",
  "Insurance",
  "Utility",
  "Subscription",
  "Other",
];

export const CATEGORY_TO_INT: Record<BillCategory, number> = {
  Loan: 0,
  CreditCard: 1,
  Utility: 2,
  Subscription: 3,
  Insurance: 4,
  RentMortgage: 5,
  Other: 6,
};

export const INT_TO_CATEGORY: Record<number, BillCategory> = Object.fromEntries(
  Object.entries(CATEGORY_TO_INT).map(([k, v]) => [v, k as BillCategory]),
);

export type PayFrequency = "Weekly" | "Biweekly" | "Semimonthly" | "Monthly";

export const PAY_FREQUENCIES: PayFrequency[] = [
  "Weekly",
  "Biweekly",
  "Semimonthly",
  "Monthly",
];

export const FREQUENCY_TO_INT: Record<PayFrequency, number> = {
  Weekly: 0,
  Biweekly: 1,
  Semimonthly: 2,
  Monthly: 3,
};

export const INT_TO_FREQUENCY: Record<number, PayFrequency> =
  Object.fromEntries(
    Object.entries(FREQUENCY_TO_INT).map(([k, v]) => [v, k as PayFrequency]),
  );

export interface Bill {
  id: string;
  name: string;
  monthlyAmountOwed: number;
  totalBalance?: number | null;
  dueDate: string;
  category: BillCategory;
  minimumPayment?: number | null;
  lastPaidPeriod?: string | null;
  lastPaidAt?: string | null;
}

export interface BillInput {
  name: string;
  monthlyAmountOwed: number;
  totalBalance?: number | null;
  dueDate: string;
  category: BillCategory;
  minimumPayment?: number | null;
}

export interface Income {
  perPaycheckAmount: number;
  frequency: PayFrequency;
  monthlyTakeHome: number;
}

export interface IncomeInput {
  perPaycheckAmount: number;
  frequency: PayFrequency;
}

export interface RankedBill extends Bill {
  score: number;
  rankReason: string;
  isOverdue: boolean;
  nextDueDate: string;
}

export interface CalculationResult {
  monthlyTakeHome: number;
  totalMonthlyOwed: number;
  leftover: number;
  rankedBills: RankedBill[];
}

interface BillWire extends Omit<Bill, "category"> {
  category: number;
}
interface RankedBillWire extends Omit<RankedBill, "category"> {
  category: number;
}
interface IncomeWire extends Omit<Income, "frequency"> {
  frequency: number;
}

export const fromBillWire = (b: BillWire): Bill => ({
  ...b,
  category: INT_TO_CATEGORY[b.category],
});
export const fromRankedWire = (b: RankedBillWire): RankedBill => ({
  ...b,
  category: INT_TO_CATEGORY[b.category],
});
export const fromIncomeWire = (i: IncomeWire | null): Income | null =>
  i ? { ...i, frequency: INT_TO_FREQUENCY[i.frequency] } : null;

export const toBillWirePayload = (b: BillInput) => ({
  ...b,
  category: CATEGORY_TO_INT[b.category],
});
export const toIncomeWirePayload = (i: IncomeInput) => ({
  ...i,
  frequency: FREQUENCY_TO_INT[i.frequency],
});
