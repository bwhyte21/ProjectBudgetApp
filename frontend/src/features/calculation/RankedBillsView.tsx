import { useEffect, useState, Fragment } from "react";
import { CircleCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { billInWindow, getPayPeriodWindows } from "./payPeriodUtils";
import { fetchCalculation } from "./calculationSlice";
import { markBillPaid } from "../bills/billsSlice";
import { CATEGORY_LABELS } from "../../api/categoryLabels";
import { getCategoryChipColor } from "../bills/categoryChip";
import { getRankReasonChipColor } from "./rankReasonChip";
import type { PayFrequency, RankedBill } from "../../api/types";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );

const formatDueDate = (iso: string) =>
  format(parseISO(iso.substring(0, 10) + "T00:00:00"), "MMM d");

interface BillSectionProps {
  title: string;
  titleClassName?: string;
  bills: RankedBill[];
  rankMap: Map<string, number>;
  hidePaid: boolean;
  showMarkPaid?: boolean;
  limit: number;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onMarkPaid: (bill: RankedBill) => void;
}

function BillSection({
  title,
  titleClassName,
  bills,
  rankMap,
  hidePaid,
  showMarkPaid = true,
  limit,
  isExpanded,
  onToggleExpanded,
  onMarkPaid,
}: BillSectionProps) {
  const visibleBills = hidePaid
    ? bills.filter((b) => !b.isPaidCurrentCycle)
    : bills;
  const shown = isExpanded ? visibleBills : visibleBills.slice(0, limit);
  const hiddenCount = visibleBills.length - limit;
  const hasMore = hiddenCount > 0;

  return (
    <div className="flex flex-col gap-1">
      <p
        className={cn(
          "text-xs font-medium uppercase tracking-wider text-muted-foreground",
          titleClassName,
        )}
      >
        {title}
      </p>
      {visibleBills.length === 0 ? (
        <p className="px-1 pb-1 text-sm text-muted-foreground">
          {hidePaid && bills.length > 0
            ? "Paid bills have been hidden."
            : "No bills due this period."}
        </p>
      ) : (
        <ul className="flex flex-col">
          {shown.map((b) => {
            const rank = rankMap.get(b.id) ?? 0;
            const reasonColor = getRankReasonChipColor(b.rankReason);
            return (
              <li
                key={b.id}
                className="flex flex-wrap items-center gap-y-2 gap-x-4 border-b px-2 py-2 last:border-b-0"
              >
                <div className="min-w-0 flex-[1_1_220px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{b.name}</span>
                    <Badge
                      variant="outline"
                      className={cn(getCategoryChipColor(b.category))}
                    >
                      {CATEGORY_LABELS[b.category] ?? "Unknown"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(b.monthlyAmountOwed)} due{" "}
                      {formatDueDate(b.nextDueDate)}
                    </span>
                    {!hidePaid && b.isPaidCurrentCycle && (
                      <Badge
                        variant="outline"
                        className="border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300"
                      >
                        Paid this cycle
                      </Badge>
                    )}
                  </div>
                  {b.isDueToday ? (
                    <Badge
                      variant="outline"
                      className="mt-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    >
                      Due today
                    </Badge>
                  ) : (
                    reasonColor && (
                      <Badge
                        variant="outline"
                        className={cn("mt-1", reasonColor)}
                      >
                        {b.rankReason}
                      </Badge>
                    )
                  )}
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  {showMarkPaid && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-500/40 text-green-700 hover:bg-green-500/10 dark:text-green-300"
                      aria-label={`Mark ${b.name} paid`}
                      onClick={() => onMarkPaid(b)}
                    >
                      <CircleCheck className="size-4" />
                      {b.isOverdue || b.isDueToday
                        ? "Mark as Paid"
                        : "Mark as Paid Early"}
                    </Button>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="cursor-default">#{rank}</Badge>
                    </TooltipTrigger>
                    <TooltipContent>Score: {b.score.toFixed(2)}</TooltipContent>
                  </Tooltip>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {hasMore && (
        <Button
          size="sm"
          variant="link"
          className="mt-0.5 h-auto self-start p-0"
          onClick={onToggleExpanded}
        >
          {isExpanded ? "Show less" : `Show ${hiddenCount} more`}
        </Button>
      )}
    </div>
  );
}

type MarkPaidChoice = "monthly" | "minimum" | "other";

interface MarkPaidBalanceDialogProps {
  bill: RankedBill;
  onClose: () => void;
  onConfirm: (balancePayment: number) => void;
}

function MarkPaidBalanceDialog({
  bill,
  onClose,
  onConfirm,
}: MarkPaidBalanceDialogProps) {
  const hasMinimum = bill.minimumPayment != null;
  const [choice, setChoice] = useState<MarkPaidChoice>(
    hasMinimum ? "minimum" : "monthly",
  );
  const [otherAmount, setOtherAmount] = useState<string>("");

  const otherValue = Number(otherAmount);
  const otherValid =
    otherAmount !== "" && Number.isFinite(otherValue) && otherValue >= 0;
  const confirmDisabled = choice === "other" && !otherValid;

  const handleConfirm = () => {
    let amount: number;
    if (choice === "monthly") amount = bill.monthlyAmountOwed;
    else if (choice === "minimum")
      amount = bill.minimumPayment ?? bill.monthlyAmountOwed;
    else amount = otherValue;
    onConfirm(amount);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Mark {bill.name} as paid</DialogTitle>
          <DialogDescription className="sr-only">
            Choose how much you paid toward this bill's balance.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Current balance: {formatCurrency(bill.totalBalance ?? 0)}
          </p>
          <RadioGroup
            value={choice}
            onValueChange={(v) => setChoice(v as MarkPaidChoice)}
            className="gap-3"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="monthly" id="choice-monthly" />
              <Label htmlFor="choice-monthly" className="font-normal">
                Monthly ({formatCurrency(bill.monthlyAmountOwed)})
              </Label>
            </div>
            {hasMinimum && (
              <div className="flex items-center gap-2">
                <RadioGroupItem value="minimum" id="choice-minimum" />
                <Label htmlFor="choice-minimum" className="font-normal">
                  Minimum ({formatCurrency(bill.minimumPayment as number)})
                </Label>
              </div>
            )}
            <div className="flex items-center gap-2">
              <RadioGroupItem value="other" id="choice-other" />
              <Label htmlFor="choice-other" className="font-normal">
                Other
              </Label>
            </div>
          </RadioGroup>
          {choice === "other" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="other-amount">Amount paid</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="other-amount"
                  autoFocus
                  type="number"
                  min={0}
                  step="0.01"
                  className="pl-6"
                  value={otherAmount}
                  onChange={(e) => setOtherAmount(e.target.value)}
                  aria-invalid={otherAmount !== "" && !otherValid}
                />
              </div>
              {otherAmount !== "" && !otherValid && (
                <p className="text-sm text-destructive">
                  Enter a non-negative number
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-green-600 text-white hover:bg-green-600/90"
            onClick={handleConfirm}
            disabled={confirmDisabled}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RankedBillsView() {
  const dispatch = useAppDispatch();
  const result = useAppSelector((s) => s.calculation.result);
  const status = useAppSelector((s) => s.calculation.status);
  const income = useAppSelector((s) => s.income.value);
  const [hidePaid, setHidePaid] = useState(false);
  const [sectionLimit, setSectionLimit] = useState(10);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [balanceDialogBill, setBalanceDialogBill] = useState<RankedBill | null>(
    null,
  );
  const toggleExpanded = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    dispatch(fetchCalculation());
  }, [dispatch]);

  const runMarkPaid = async (
    id: string,
    paidPeriod: string,
    balancePayment?: number,
  ) => {
    await dispatch(markBillPaid({ id, paidPeriod, balancePayment })).unwrap();
    dispatch(fetchCalculation());
  };

  const handleMarkPaid = (bill: RankedBill) => {
    if (bill.totalBalance != null) {
      setBalanceDialogBill(bill);
      return;
    }
    void runMarkPaid(bill.id, bill.nextDueDate);
  };

  const handleBalanceDialogConfirm = (balancePayment: number) => {
    if (!balanceDialogBill) return;
    const bill = balanceDialogBill;
    setBalanceDialogBill(null);
    void runMarkPaid(bill.id, bill.nextDueDate, balancePayment);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const frequency: PayFrequency = income?.frequency ?? "Monthly";
  const windows = getPayPeriodWindows(frequency, today, income?.payAnchorDate);

  const allBills = result?.rankedBills ?? [];
  const rankMap = new Map(allBills.map((b, idx) => [b.id, idx + 1]));

  const overdueBills: RankedBill[] = [];
  const periodBills: RankedBill[][] = windows.map(() => []);
  const laterBills: RankedBill[] = [];

  for (const b of allBills) {
    if (b.isOverdue) {
      overdueBills.push(b);
    } else {
      const idx = windows.findIndex((w) => billInWindow(b, w));
      if (idx >= 0) {
        periodBills[idx].push(b);
      } else {
        laterBills.push(b);
      }
    }
  }

  return (
    <>
      {balanceDialogBill && (
        <MarkPaidBalanceDialog
          key={balanceDialogBill.id}
          bill={balanceDialogBill}
          onClose={() => setBalanceDialogBill(null)}
          onConfirm={handleBalanceDialogConfirm}
        />
      )}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Pay these first</CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <Switch
                id="hide-paid"
                checked={hidePaid}
                onCheckedChange={setHidePaid}
              />
              <Label htmlFor="hide-paid" className="text-xs font-normal">
                Hide paid
              </Label>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                Per section
              </span>
              <Select
                value={String(sectionLimit)}
                onValueChange={(v) => setSectionLimit(Number(v))}
              >
                <SelectTrigger size="sm" className="w-[4.5rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="ghost"
              onClick={() => dispatch(fetchCalculation())}
              disabled={status === "loading"}
            >
              Recalculate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!result || allBills.length === 0 ? (
            <p className="text-muted-foreground">
              Add some bills and your income to see prioritized recommendations.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {overdueBills.length > 0 && (
                <>
                  <BillSection
                    title="Overdue"
                    titleClassName="text-destructive"
                    bills={overdueBills}
                    rankMap={rankMap}
                    hidePaid={hidePaid}
                    limit={sectionLimit}
                    isExpanded={!!expanded["Overdue"]}
                    onToggleExpanded={() => toggleExpanded("Overdue")}
                    onMarkPaid={handleMarkPaid}
                  />
                  <Separator />
                </>
              )}
              {windows.map((w, i) => (
                <Fragment key={w.label}>
                  {i > 0 && <Separator />}
                  <BillSection
                    title={w.label}
                    bills={periodBills[i]}
                    rankMap={rankMap}
                    hidePaid={hidePaid}
                    limit={sectionLimit}
                    isExpanded={!!expanded[w.label]}
                    onToggleExpanded={() => toggleExpanded(w.label)}
                    onMarkPaid={handleMarkPaid}
                  />
                </Fragment>
              ))}
              {laterBills.length > 0 && (
                <>
                  <Separator />
                  <BillSection
                    title="Later"
                    bills={laterBills}
                    rankMap={rankMap}
                    hidePaid={hidePaid}
                    showMarkPaid={false}
                    limit={sectionLimit}
                    isExpanded={!!expanded["Later"]}
                    onToggleExpanded={() => toggleExpanded("Later")}
                    onMarkPaid={handleMarkPaid}
                  />
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
