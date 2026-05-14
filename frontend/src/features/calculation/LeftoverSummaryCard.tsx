import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Fragment, useState } from "react";
import {
  billInWindow,
  countPaychecksInMonth,
  getPayPeriodWindows,
} from "./payPeriodUtils";
import type { RankedBill } from "../../api/types";
import { useAppSelector } from "../../store/hooks";

type ViewMode = "monthly" | "biweekly";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );

interface PayPeriodBlockProps {
  label: string;
  takeHome: number;
  bills: RankedBill[];
  excludePaid: boolean;
}

function PayPeriodBlock({
  label,
  takeHome,
  bills,
  excludePaid,
}: PayPeriodBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const billsTotal = bills.reduce((sum, b) => sum + b.monthlyAmountOwed, 0);
  const leftover = takeHome - billsTotal;
  const leftoverColor = leftover < 0 ? "error.main" : "success.main";

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" color="text.secondary">
        {label}
      </Typography>
      <Row label="Bi-weekly take-home" value={formatCurrency(takeHome)} />
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <Typography color="text.secondary">Bills due this period</Typography>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <Typography>{formatCurrency(billsTotal)}</Typography>
          <IconButton
            size="small"
            onClick={() => setExpanded((p) => !p)}
            aria-label="toggle bill breakdown"
          >
            {expanded ? (
              <ExpandLessIcon fontSize="small" />
            ) : (
              <ExpandMoreIcon fontSize="small" />
            )}
          </IconButton>
        </Stack>
      </Stack>
      <Collapse in={expanded}>
        <Stack spacing={0.5} sx={{ pl: 1, pb: 0.5 }}>
          {bills.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No bills due this period.
            </Typography>
          ) : (
            bills.map((b) => (
              <Stack
                key={b.id}
                direction="row"
                sx={{ justifyContent: "space-between", alignItems: "center" }}
              >
                <Stack
                  direction="row"
                  spacing={0.75}
                  sx={{ alignItems: "center" }}
                >
                  <Typography variant="body2">{b.name}</Typography>
                  {!excludePaid && b.isPaidCurrentCycle && (
                    <Chip
                      label="Paid this cycle"
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ height: 18, fontSize: "0.65rem" }}
                    />
                  )}
                </Stack>
                <Typography variant="body2">
                  {formatCurrency(b.monthlyAmountOwed)}
                </Typography>
              </Stack>
            ))
          )}
        </Stack>
      </Collapse>
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
  const [excludePaid, setExcludePaid] = useState(false);

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
            <Stack
              direction="row"
              sx={{ justifyContent: "space-between", alignItems: "center" }}
            >
              <Typography variant="caption" color="text.secondary">
                Each period is calculated independently &mdash; leftover does
                not carry over to the next period.
              </Typography>
              <Tooltip
                title="Hide bills already marked as paid from the pay period breakdown"
                placement="top"
                arrow
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={excludePaid}
                      onChange={(e) => setExcludePaid(e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="caption">Exclude paid</Typography>
                  }
                  sx={{ ml: 1, whiteSpace: "nowrap" }}
                />
              </Tooltip>
            </Stack>
            {windows.map((w, i) => (
              <Fragment key={w.label}>
                {i > 0 && <Divider />}
                <PayPeriodBlock
                  label={w.label}
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
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
