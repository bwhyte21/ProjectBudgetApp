import type { ChipProps } from "@mui/material/Chip";

export function getRankReasonChipColor(
  reason: string,
): NonNullable<ChipProps["color"]> | null {
  if (!reason) return null;
  if (reason.startsWith("Overdue")) return "error";
  if (reason === "Due soon") return "warning";
  if (reason === "Large outstanding balance") return "info";
  if (reason === "High-priority category") return "secondary";
  return null;
}
