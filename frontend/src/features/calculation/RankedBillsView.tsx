import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import MenuItem from "@mui/material/MenuItem";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
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
  onMarkPaid: (bill: RankedBill) => void;
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
          {hidePaid && bills.length > 0
            ? "Paid bills have been hidden."
            : "No bills due this period."}
        </Typography>
      ) : (
        <List dense disablePadding>
          {shown.map((b) => {
            const rank = rankMap.get(b.id) ?? 0;
            return (
              <ListItem key={b.id} divider disableGutters sx={{ px: 2, py: 1 }}>
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{
                    width: "100%",
                    alignItems: "center",
                    flexWrap: "wrap",
                    rowGap: 1,
                  }}
                >
                  <Box sx={{ flex: "1 1 220px", minWidth: 0 }}>
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
                    {b.isDueToday ? (
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
                    )}
                  </Box>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      alignItems: "center",
                      flex: "0 0 auto",
                      ml: "auto",
                    }}
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
                        onClick={() => onMarkPaid(b)}
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
                </Stack>
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
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Mark {bill.name} as paid</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Current balance: {formatCurrency(bill.totalBalance ?? 0)}
          </Typography>
          <FormControl>
            <RadioGroup
              value={choice}
              onChange={(e) => setChoice(e.target.value as MarkPaidChoice)}
            >
              <FormControlLabel
                value="monthly"
                control={<Radio />}
                label={`Monthly (${formatCurrency(bill.monthlyAmountOwed)})`}
              />
              {hasMinimum && (
                <FormControlLabel
                  value="minimum"
                  control={<Radio />}
                  label={`Minimum (${formatCurrency(bill.minimumPayment as number)})`}
                />
              )}
              <FormControlLabel
                value="other"
                control={<Radio />}
                label="Other"
              />
            </RadioGroup>
          </FormControl>
          {choice === "other" && (
            <TextField
              autoFocus
              size="small"
              type="number"
              label="Amount paid"
              value={otherAmount}
              onChange={(e) => setOtherAmount(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                },
                htmlInput: { min: 0, step: "0.01" },
              }}
              error={otherAmount !== "" && !otherValid}
              helperText={
                otherAmount !== "" && !otherValid
                  ? "Enter a non-negative number"
                  : " "
              }
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleConfirm}
          disabled={confirmDisabled}
        >
          Confirm
        </Button>
      </DialogActions>
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
              <Stack
                direction="row"
                spacing={0.5}
                sx={{ alignItems: "center" }}
              >
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
    </>
  );
}
