import { Fragment, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  billInWindow,
  countPaychecksInMonth,
  getPayPeriodWindows,
} from "./payPeriodUtils";
import type { PayFrequency, RankedBill } from "../../api/types";
import { useAppSelector } from "../../store/hooks";

type ViewMode = "monthly" | "biweekly";

const PER_PAYCHECK_LABEL: Record<PayFrequency, string> = {
  Weekly: "Weekly take-home",
  Biweekly: "Bi-weekly take-home",
  Semimonthly: "Semimonthly take-home",
  Monthly: "Monthly take-home",
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );

interface PayPeriodBlockProps {
  label: string;
  takeHomeLabel: string;
  takeHome: number;
  bills: RankedBill[];
  excludePaid: boolean;
}

function PayPeriodBlock({
  label,
  takeHomeLabel,
  takeHome,
  bills,
  excludePaid,
}: PayPeriodBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const billsTotal = bills.reduce((sum, b) => sum + b.monthlyAmountOwed, 0);
  const leftover = takeHome - billsTotal;
  const leftoverColor =
    leftover < 0 ? "text-destructive" : "text-green-600 dark:text-green-400";

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <Row label={takeHomeLabel} value={formatCurrency(takeHome)} />
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Bills due this period</span>
          <div className="flex items-center gap-0.5">
            <span>{formatCurrency(billsTotal)}</span>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="toggle bill breakdown"
              >
                {expanded ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent>
          <div className="flex flex-col gap-1 pb-1 pl-1 pt-1">
            {bills.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No bills due this period.
              </p>
            ) : (
              bills.map((b) => (
                <div key={b.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{b.name}</span>
                    {!excludePaid && b.isPaidCurrentCycle && (
                      <Badge
                        variant="outline"
                        className="border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300"
                      >
                        Paid this cycle
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm">
                    {formatCurrency(b.monthlyAmountOwed)}
                  </span>
                </div>
              ))
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
      <div className="flex items-baseline justify-between pt-0.5">
        <span className="text-lg font-semibold">Leftover</span>
        <span className={cn("text-xl font-semibold", leftoverColor)}>
          {formatCurrency(leftover)}
        </span>
      </div>
      {leftover < 0 && (
        <p className="text-sm text-destructive">
          Bills exceed your take-home for this period.
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function LeftoverSummaryCard() {
  const result = useAppSelector((s) => s.calculation.result);
  const income = useAppSelector((s) => s.income.value);
  const [mode, setMode] = useState<ViewMode>("monthly");
  const [excludePaid, setExcludePaid] = useState(false);

  const toggle = (
    <ToggleGroup
      type="single"
      value={mode}
      onValueChange={(v) => v && setMode(v as ViewMode)}
      variant="outline"
      size="sm"
    >
      <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
      <ToggleGroupItem value="biweekly">Bi-weekly</ToggleGroupItem>
    </ToggleGroup>
  );

  if (!result) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Monthly summary</CardTitle>
          {toggle}
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Set income and add bills to see your summary.
          </p>
        </CardContent>
      </Card>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const frequency = income?.frequency ?? "Monthly";
  const allWindows = getPayPeriodWindows(
    frequency,
    today,
    income?.payAnchorDate,
  );
  const windows =
    (frequency === "Weekly" || frequency === "Biweekly") &&
    income?.payAnchorDate
      ? allWindows.slice(
          0,
          countPaychecksInMonth(frequency, today, income.payAnchorDate),
        )
      : allWindows;
  const perPaycheck = income?.perPaycheckAmount ?? 0;

  const leftoverColor =
    result.leftover < 0
      ? "text-destructive"
      : "text-green-600 dark:text-green-400";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>
          {mode === "monthly" ? "Monthly summary" : "Bi-weekly summary"}
        </CardTitle>
        {toggle}
      </CardHeader>
      <CardContent>
        {mode === "monthly" ? (
          <div className="flex flex-col gap-2">
            <Row
              label="Monthly take-home"
              value={formatCurrency(result.monthlyTakeHome)}
            />
            <Row
              label="Total monthly owed"
              value={formatCurrency(result.totalMonthlyOwed)}
            />
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-lg font-semibold">Leftover</span>
              <span className={cn("text-xl font-semibold", leftoverColor)}>
                {formatCurrency(result.leftover)}
              </span>
            </div>
            {result.leftover < 0 && (
              <p className="text-sm text-destructive">
                Bills exceed your take-home pay this month.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                Each period is calculated independently &mdash; leftover does
                not carry over to the next period.
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <Switch
                      id="exclude-paid"
                      checked={excludePaid}
                      onCheckedChange={setExcludePaid}
                    />
                    <Label
                      htmlFor="exclude-paid"
                      className="text-xs font-normal"
                    >
                      Exclude paid
                    </Label>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Hide bills already marked as paid from the pay period
                  breakdown
                </TooltipContent>
              </Tooltip>
            </div>
            {windows.map((w, i) => (
              <Fragment key={w.label}>
                {i > 0 && <Separator />}
                <PayPeriodBlock
                  label={w.label}
                  takeHomeLabel={PER_PAYCHECK_LABEL[frequency]}
                  takeHome={perPaycheck}
                  bills={result.rankedBills.filter(
                    (b) =>
                      billInWindow(b, w) &&
                      (!excludePaid || !b.isPaidCurrentCycle),
                  )}
                  excludePaid={excludePaid}
                />
              </Fragment>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
