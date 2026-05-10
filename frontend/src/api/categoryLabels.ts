import type { BillCategory } from "./types";

export const CATEGORY_LABELS: Record<BillCategory, string> = {
  RentMortgage: "Rent / Mortgage",
  Loan: "Loan",
  CreditCard: "Credit Card",
  Insurance: "Insurance",
  Utility: "Utility",
  Subscription: "Subscription",
  Other: "Other",
};
