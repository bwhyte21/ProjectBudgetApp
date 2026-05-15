import { useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { incomeSchema, type IncomeFormValues } from "./incomeSchema";
import { PAY_FREQUENCIES, type PayFrequency } from "../../api/types";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchIncome, saveIncome } from "./incomeSlice";
import { fetchCalculation } from "../calculation/calculationSlice";

const FREQ_LABELS: Record<PayFrequency, string> = {
  Weekly: "Weekly",
  Biweekly: "Biweekly (every 2 weeks)",
  Semimonthly: "Semimonthly (twice a month)",
  Monthly: "Monthly",
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );

export function IncomeForm() {
  const dispatch = useAppDispatch();
  const income = useAppSelector((s) => s.income.value);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      perPaycheckAmount: 0,
      frequency: "Biweekly",
      payAnchorDate: null,
    },
  });

  const frequency = useWatch({ control, name: "frequency" });

  useEffect(() => {
    dispatch(fetchIncome());
  }, [dispatch]);

  useEffect(() => {
    if (income) {
      reset({
        perPaycheckAmount: income.perPaycheckAmount,
        frequency: income.frequency,
        payAnchorDate: income.payAnchorDate ?? null,
      });
    }
  }, [income, reset]);

  const onSubmit = async (values: IncomeFormValues) => {
    await dispatch(
      saveIncome({
        perPaycheckAmount: values.perPaycheckAmount,
        frequency: values.frequency,
        payAnchorDate: values.payAnchorDate ?? null,
      }),
    ).unwrap();
    dispatch(fetchCalculation());
  };

  return (
    <Card>
      <CardHeader title="Take-home pay" />
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2}>
            <Controller
              control={control}
              name="perPaycheckAmount"
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Per-paycheck amount"
                  type="number"
                  slotProps={{ htmlInput: { step: "0.01" } }}
                  onChange={(e) =>
                    field.onChange(parseFloat(e.target.value) || 0)
                  }
                  value={field.value ?? ""}
                  error={!!errors.perPaycheckAmount}
                  helperText={errors.perPaycheckAmount?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="frequency"
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Frequency"
                  select
                  error={!!errors.frequency}
                >
                  {PAY_FREQUENCIES.map((f) => (
                    <MenuItem key={f} value={f}>
                      {FREQ_LABELS[f]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            {(frequency === "Weekly" || frequency === "Biweekly") && (
              <Controller
                control={control}
                name="payAnchorDate"
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Date Paid"
                    type="date"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    helperText="Used to accurately calculate which paychecks fall in each month"
                  />
                )}
              />
            )}
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              Save income
            </Button>
            {income && (
              <Typography variant="body2" color="text.secondary">
                Monthly take-home: {formatCurrency(income.monthlyTakeHome)}
              </Typography>
            )}
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}
