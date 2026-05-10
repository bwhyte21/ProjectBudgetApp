import type { ChipProps } from "@mui/material/Chip";
import type { BillCategory } from "../../api/types";

const MAP: Record<BillCategory, NonNullable<ChipProps["color"]>> = {
  RentMortgage: "error",
  Insurance: "warning",
  Loan: "secondary",
  CreditCard: "primary",
  Utility: "info",
  Subscription: "success",
  Other: "default",
};

export function getCategoryChipColor(
  c: BillCategory | undefined,
): NonNullable<ChipProps["color"]> {
  return c && MAP[c] ? MAP[c] : "default";
}
