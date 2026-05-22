import { useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      <CardHeader>
        <CardTitle>Take-home pay</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Controller
            control={control}
            name="perPaycheckAmount"
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="perPaycheckAmount">Per-paycheck amount</Label>
                <Input
                  id="perPaycheckAmount"
                  type="number"
                  step="0.01"
                  ref={field.ref}
                  name={field.name}
                  onBlur={field.onBlur}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(parseFloat(e.target.value) || 0)
                  }
                  aria-invalid={!!errors.perPaycheckAmount}
                />
                {errors.perPaycheckAmount && (
                  <p className="text-sm text-destructive">
                    {errors.perPaycheckAmount.message}
                  </p>
                )}
              </div>
            )}
          />
          <Controller
            control={control}
            name="frequency"
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="frequency">Frequency</Label>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="frequency" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAY_FREQUENCIES.map((f) => (
                      <SelectItem key={f} value={f}>
                        {FREQ_LABELS[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          />
          {(frequency === "Weekly" || frequency === "Biweekly") && (
            <Controller
              control={control}
              name="payAnchorDate"
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="payAnchorDate">Date Paid</Label>
                  <Input
                    id="payAnchorDate"
                    type="date"
                    ref={field.ref}
                    name={field.name}
                    onBlur={field.onBlur}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Used to accurately calculate which paychecks fall in each
                    month
                  </p>
                </div>
              )}
            />
          )}
          <Button type="submit" disabled={isSubmitting}>
            Save income
          </Button>
          {income && (
            <p className="text-sm text-muted-foreground">
              Monthly take-home: {formatCurrency(income.monthlyTakeHome)}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
