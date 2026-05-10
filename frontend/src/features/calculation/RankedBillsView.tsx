import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { useEffect } from "react";
import { format, parseISO } from "date-fns";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchCalculation } from "./calculationSlice";
import { CATEGORY_LABELS } from "../../api/categoryLabels";
import { getCategoryChipColor } from "../bills/categoryChip";
import { getRankReasonChipColor } from "./rankReasonChip";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );

const formatDueDate = (iso: string) =>
  format(parseISO(iso.substring(0, 10) + "T00:00:00"), "MMM d");

export function RankedBillsView() {
  const dispatch = useAppDispatch();
  const result = useAppSelector((s) => s.calculation.result);
  const status = useAppSelector((s) => s.calculation.status);

  useEffect(() => {
    dispatch(fetchCalculation());
  }, [dispatch]);

  return (
    <Card>
      <CardHeader
        title="Pay these first"
        action={
          <Button
            onClick={() => dispatch(fetchCalculation())}
            disabled={status === "loading"}
          >
            Recalculate
          </Button>
        }
      />
      <CardContent>
        {!result || result.rankedBills.length === 0 ? (
          <Typography color="text.secondary">
            Add some bills and your income to see prioritized recommendations.
          </Typography>
        ) : (
          <List dense>
            {result.rankedBills.map((b, idx) => (
              <ListItem
                key={b.id}
                divider
                secondaryAction={
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    {b.isOverdue && (
                      <Chip label="Overdue" color="error" size="small" />
                    )}
                    <Tooltip title={`Score: ${b.score.toFixed(2)}`}>
                      <Chip
                        label={`#${idx + 1}`}
                        size="small"
                        color="primary"
                      />
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
                      sx={{ alignItems: "center" }}
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
                    </Stack>
                  }
                  secondary={
                    getRankReasonChipColor(b.rankReason) && (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={b.rankReason}
                        color={getRankReasonChipColor(b.rankReason)!}
                        sx={{ mt: 0.5 }}
                      />
                    )
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
