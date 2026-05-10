import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { addDays, format, parseISO } from "date-fns";
import { useState } from "react";
import type { RankedBill } from "../../api/types";
import { useAppSelector } from "../../store/hooks";

type ViewMode = "monthly" | "biweekly";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );

const formatDate = (d: Date) => format(d, "MMM d");

function billsTotalInWindow(
  bills: RankedBill[],
  windowStart: Date,
  windowEnd: Date,
): number {
  return bills
    .filter((b) => {
      const due = parseISO(b.nextDueDate.substring(0, 10) + "T00:00:00");
      return due >= windowStart && due <= windowEnd;
    })
    .reduce((sum, b) => sum + b.monthlyAmountOwed, 0);
}

interface PayPeriodBlockProps {
  label: string;
  takeHome: number;
  billsTotal: number;
  leftover: number;
}

function PayPeriodBlock({
  label,
  takeHome,
  billsTotal,
  leftover,
}: PayPeriodBlockProps) {
  const leftoverColor = leftover < 0 ? "error.main" : "success.main";
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" color="text.secondary">
        {label}
      </Typography>
      <Row label="Bi-weekly take-home" value={formatCurrency(takeHome)} />
      <Row label="Bills due this period" value={formatCurrency(billsTotal)} />
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "baseline",
          pt: 0.5,
        }}
      >
        <Typography variant="h6">Leftover</Typography>
        <Typography variant="h5" sx={{ color: leftoverColor, fontWeight: 600 }}>
          {formatCurrency(leftover)}
        </Typography>
      </Stack>
      {leftover < 0 && (
        <Typography variant="body2" color="error.main">
          Bills exceed your take-home for this period.
        </Typography>
      )}
    </Stack>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography>{value}</Typography>
    </Stack>
  );
}

export function LeftoverSummaryCard() {
  const result = useAppSelector((s) => s.calculation.result);
  const income = useAppSelector((s) => s.income.value);
  const [mode, setMode] = useState<ViewMode>("monthly");

  const toggle = (
    <ToggleButtonGroup
      value={mode}
      exclusive
      onChange={(_: React.MouseEvent, v: ViewMode | null) => {
        if (v) setMode(v);
      }}
      size="small"
    >
      <ToggleButton value="monthly">Monthly</ToggleButton>
      <ToggleButton value="biweekly">Bi-weekly</ToggleButton>
    </ToggleButtonGroup>
  );

  if (!result) {
    return (
      <Card>
        <CardHeader title="Monthly summary" action={toggle} />
        <CardContent>
          <Typography color="text.secondary">
            Set income and add bills to see your summary.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const w1Start = today;
  const w1End = addDays(today, 13);
  const w2Start = addDays(today, 14);
  const w2End = addDays(today, 27);

  const perPaycheck = income?.perPaycheckAmount ?? 0;
  const w1Total = billsTotalInWindow(result.rankedBills, w1Start, w1End);
  const w2Total = billsTotalInWindow(result.rankedBills, w2Start, w2End);

  const leftoverColor = result.leftover < 0 ? "error.main" : "success.main";

  return (
    <Card>
      <CardHeader
        title={mode === "monthly" ? "Monthly summary" : "Bi-weekly summary"}
        action={toggle}
      />
      <CardContent>
        {mode === "monthly" ? (
          <Stack spacing={1}>
            <Row
              label="Monthly take-home"
              value={formatCurrency(result.monthlyTakeHome)}
            />
            <Row
              label="Total monthly owed"
              value={formatCurrency(result.totalMonthlyOwed)}
            />
            <Stack
              direction="row"
              sx={{
                justifyContent: "space-between",
                alignItems: "baseline",
                pt: 1,
              }}
            >
              <Typography variant="h6">Leftover</Typography>
              <Typography
                variant="h5"
                sx={{ color: leftoverColor, fontWeight: 600 }}
              >
                {formatCurrency(result.leftover)}
              </Typography>
            </Stack>
            {result.leftover < 0 && (
              <Typography variant="body2" color="error.main">
                Bills exceed your take-home pay this month.
              </Typography>
            )}
          </Stack>
        ) : (
          <Stack spacing={2}>
            <PayPeriodBlock
              label={`${formatDate(w1Start)} \u2013 ${formatDate(w1End)}`}
              takeHome={perPaycheck}
              billsTotal={w1Total}
              leftover={perPaycheck - w1Total}
            />
            <Divider />
            <PayPeriodBlock
              label={`${formatDate(w2Start)} \u2013 ${formatDate(w2End)}`}
              takeHome={perPaycheck}
              billsTotal={w2Total}
              leftover={perPaycheck - w2Total}
            />
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
