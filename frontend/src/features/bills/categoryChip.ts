import type { BillCategory } from "../../api/types";

const MAP: Record<BillCategory, string> = {
  RentMortgage:
    "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  Insurance:
    "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  Loan: "border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300",
  CreditCard: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  Utility: "border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  Subscription:
    "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300",
  Other: "",
};

export function getCategoryChipColor(c: BillCategory | undefined): string {
  return c && MAP[c] ? MAP[c] : "";
}
