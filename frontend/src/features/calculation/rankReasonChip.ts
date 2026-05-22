export function getRankReasonChipColor(reason: string): string | null {
  if (!reason) return null;
  if (reason.startsWith("Overdue"))
    return "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300";
  if (reason === "Due soon")
    return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (reason === "Large outstanding balance")
    return "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  if (reason === "High-priority category")
    return "border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300";
  return null;
}
