import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import { useEffect, useState, Fragment } from "react";
import { format, parseISO } from "date-fns";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { billInWindow, getPayPeriodWindows } from "./payPeriodUtils";
import { fetchCalculation } from "./calculationSlice";
import { markBillPaid } from "../bills/billsSlice";
import { CATEGORY_LABELS } from "../../api/categoryLabels";
import { getCategoryChipColor } from "../bills/categoryChip";
import { getRankReasonChipColor } from "./rankReasonChip";
import type { SxProps, Theme } from "@mui/material/styles";
import type { PayFrequency, RankedBill } from "../../api/types";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );

const formatDueDate = (iso: string) =>
  format(parseISO(iso.substring(0, 10) + "T00:00:00"), "MMM d");

interface BillSectionProps {
  title: string;
  titleSx?: SxProps<Theme>;
  bills: RankedBill[];
  rankMap: Map<string, number>;
  hidePaid: boolean;
  showMarkPaid?: boolean;
  limit: number;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onMarkPaid: (id: string, paidPeriod: string) => void;
}

function BillSection({
  title,
  titleSx,
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
    <Stack spacing={0.5}>
      <Typography variant="overline" sx={{ lineHeight: 2, ...titleSx }}>
        {title}
      </Typography>
      {visibleBills.length === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ pl: 1, pb: 1 }}
        >
          Paid bills have been hidden.
        </Typography>
      ) : (
        <List dense disablePadding>
          {shown.map((b) => {
            const rank = rankMap.get(b.id) ?? 0;
            return (
              <ListItem
                key={b.id}
                divider
                secondaryAction={
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    {showMarkPaid && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={
                          <CheckCircleOutlineOutlinedIcon fontSize="small" />
                        }
                        aria-label={`Mark ${b.name} paid`}
                        onClick={() => onMarkPaid(b.id, b.nextDueDate)}
                      >
                        {b.isOverdue || b.isDueToday
                          ? "Mark as Paid"
                          : "Mark as Paid Early"}
                      </Button>
                    )}
                    <Tooltip title={`Score: ${b.score.toFixed(2)}`}>
                      <Chip label={`#${rank}`} size="small" color="primary" />
                    </Tooltip>
                  </Stack>
                }
              >
                <ListItemText
                  disableTypography
                  primary={
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center", flexWrap: "wrap" }}
                    >
                      <Typography variant="subtitle1">{b.name}</Typography>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={CATEGORY_LABELS[b.category] ?? "Unknown"}
                        color={getCategoryChipColor(b.category)}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {formatCurrency(b.monthlyAmountOwed)} due{" "}
                        {formatDueDate(b.nextDueDate)}
                      </Typography>
                      {!hidePaid && b.isPaidCurrentCycle && (
                        <Chip
                          label="Paid this cycle"
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ height: 18, fontSize: "0.65rem" }}
                        />
                      )}
                    </Stack>
                  }
                  secondary={
                    b.isDueToday ? (
                      <Chip
                        size="small"
                        variant="outlined"
                        label="Due today"
                        color="warning"
                        sx={{ mt: 0.5 }}
                      />
                    ) : (
                      getRankReasonChipColor(b.rankReason) && (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={b.rankReason}
                          color={getRankReasonChipColor(b.rankReason)!}
                          sx={{ mt: 0.5 }}
                        />
                      )
                    )
                  }
                />
              </ListItem>
            );
          })}
        </List>
      )}
      {hasMore && (
        <Button
          size="small"
          onClick={onToggleExpanded}
          sx={{ alignSelf: "flex-start", mt: 0.5 }}
        >
          {isExpanded ? "Show less" : `Show ${hiddenCount} more`}
        </Button>
      )}
    </Stack>
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
  const toggleExpanded = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    dispatch(fetchCalculation());
  }, [dispatch]);

  const handleMarkPaid = async (id: string, paidPeriod: string) => {
    await dispatch(markBillPaid({ id, paidPeriod })).unwrap();
    dispatch(fetchCalculation());
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
    <Card>
      <CardHeader
        title="Pay these first"
        action={
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <FormControlLabel
              control={
                <Switch
                  checked={hidePaid}
                  onChange={(e) => setHidePaid(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="caption">Hide paid</Typography>}
              sx={{ mr: 0, whiteSpace: "nowrap" }}
            />
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
              <Typography variant="caption" sx={{ whiteSpace: "nowrap" }}>
                Per section
              </Typography>
              <Select
                size="small"
                value={sectionLimit}
                onChange={(e) => setSectionLimit(Number(e.target.value))}
                sx={{ minWidth: 72 }}
              >
                {[10, 25, 50].map((n) => (
                  <MenuItem key={n} value={n}>
                    {n}
                  </MenuItem>
                ))}
              </Select>
            </Stack>
            <Button
              onClick={() => dispatch(fetchCalculation())}
              disabled={status === "loading"}
            >
              Recalculate
            </Button>
          </Stack>
        }
      />
      <CardContent>
        {!result || allBills.length === 0 ? (
          <Typography color="text.secondary">
            Add some bills and your income to see prioritized recommendations.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {overdueBills.length > 0 && (
              <>
                <BillSection
                  title="Overdue"
                  titleSx={{ color: "error.main" }}
                  bills={overdueBills}
                  rankMap={rankMap}
                  hidePaid={hidePaid}
                  limit={sectionLimit}
                  isExpanded={!!expanded["Overdue"]}
                  onToggleExpanded={() => toggleExpanded("Overdue")}
                  onMarkPaid={handleMarkPaid}
                />
                <Divider />
              </>
            )}
            {windows.map((w, i) => (
              <Fragment key={w.label}>
                {i > 0 && <Divider />}
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
                <Divider />
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
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
