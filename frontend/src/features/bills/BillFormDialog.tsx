import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { format, parseISO } from "date-fns";
import {
  billSchema,
  type BillFormValues,
  type BillFormOutput,
} from "./billSchema";
import {
  BILL_CATEGORIES,
  type Bill,
  type BillCategory,
  type BillInput,
} from "../../api/types";
import { CATEGORY_LABELS } from "../../api/categoryLabels";

interface Props {
  open: boolean;
  initial?: Bill | null;
  onClose: () => void;
  onSubmit: (input: BillInput) => Promise<void>;
}

const empty: BillFormValues = {
  name: "",
  monthlyAmountOwed: null,
  totalBalance: null,
  dueDate: null,
  category: "Other",
  minimumPayment: null,
};

export function BillFormDialog({ open, initial, onClose, onSubmit }: Props) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BillFormValues, unknown, BillFormOutput>({
    resolver: zodResolver(billSchema),
    defaultValues: empty,
  });

  useEffect(() => {
    if (open) {
      reset(
        initial
          ? {
              name: initial.name,
              monthlyAmountOwed: initial.monthlyAmountOwed,
              totalBalance: initial.totalBalance ?? null,
              dueDate: parseISO(initial.dueDate.substring(0, 10) + "T00:00:00"),
              category: initial.category,
              minimumPayment: initial.minimumPayment ?? null,
            }
          : empty,
      );
    }
  }, [open, initial, reset]);

  const submit = async (values: BillFormOutput) => {
    await onSubmit({
      name: values.name.trim(),
      monthlyAmountOwed: values.monthlyAmountOwed,
      totalBalance: values.totalBalance ?? null,
      dueDate: format(values.dueDate, "yyyy-MM-dd"),
      category: values.category as BillCategory,
      minimumPayment: values.minimumPayment ?? null,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial ? "Edit bill" : "Add bill"}</DialogTitle>
      <form onSubmit={handleSubmit(submit)}>
        <DialogContent>
          <Stack spacing={2}>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Bill name"
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  autoFocus
                />
              )}
            />
            <Controller
              control={control}
              name="monthlyAmountOwed"
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Monthly amount owed"
                  type="number"
                  slotProps={{ htmlInput: { step: "0.01", min: 0 } }}
                  onChange={(e) => {
                    const v = e.target.value;
                    field.onChange(v === "" ? null : parseFloat(v));
                  }}
                  value={field.value ?? ""}
                  error={!!errors.monthlyAmountOwed}
                  helperText={errors.monthlyAmountOwed?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="totalBalance"
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Total balance (optional, for loans / credit cards)"
                  type="number"
                  slotProps={{ htmlInput: { step: "0.01" } }}
                  onChange={(e) => {
                    const v = e.target.value;
                    field.onChange(v === "" ? null : parseFloat(v));
                  }}
                  value={field.value ?? ""}
                  error={!!errors.totalBalance}
                  helperText={errors.totalBalance?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="dueDate"
              render={({ field }) => (
                <DatePicker
                  label="Due date"
                  value={field.value}
                  onChange={(d) => field.onChange(d)}
                  slotProps={{
                    textField: {
                      error: !!errors.dueDate,
                      helperText: errors.dueDate?.message,
                    },
                  }}
                />
              )}
            />
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Category"
                  select
                  error={!!errors.category}
                >
                  {BILL_CATEGORIES.map((c) => (
                    <MenuItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              control={control}
              name="minimumPayment"
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Minimum payment (optional)"
                  type="number"
                  slotProps={{ htmlInput: { step: "0.01" } }}
                  onChange={(e) => {
                    const v = e.target.value;
                    field.onChange(v === "" ? null : parseFloat(v));
                  }}
                  value={field.value ?? ""}
                  error={!!errors.minimumPayment}
                  helperText={errors.minimumPayment?.message}
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {initial ? "Save" : "Add"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
