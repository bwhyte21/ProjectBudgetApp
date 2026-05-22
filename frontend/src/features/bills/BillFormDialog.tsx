import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
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
      note: initial?.note ?? null,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit bill" : "Add bill"}</DialogTitle>
          <DialogDescription className="sr-only">
            {initial
              ? "Edit the details of this bill."
              : "Enter the details for a new bill."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bill-name">Bill name</Label>
                <Input
                  id="bill-name"
                  autoFocus
                  ref={field.ref}
                  name={field.name}
                  value={field.value ?? ""}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
            )}
          />
          <Controller
            control={control}
            name="monthlyAmountOwed"
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="monthlyAmountOwed">Monthly amount owed</Label>
                <Input
                  id="monthlyAmountOwed"
                  type="number"
                  step="0.01"
                  min={0}
                  ref={field.ref}
                  name={field.name}
                  onBlur={field.onBlur}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    field.onChange(v === "" ? null : parseFloat(v));
                  }}
                  aria-invalid={!!errors.monthlyAmountOwed}
                />
                {errors.monthlyAmountOwed && (
                  <p className="text-sm text-destructive">
                    {errors.monthlyAmountOwed.message}
                  </p>
                )}
              </div>
            )}
          />
          <Controller
            control={control}
            name="totalBalance"
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="totalBalance">
                  Total balance (optional, for loans / credit cards)
                </Label>
                <Input
                  id="totalBalance"
                  type="number"
                  step="0.01"
                  ref={field.ref}
                  name={field.name}
                  onBlur={field.onBlur}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    field.onChange(v === "" ? null : parseFloat(v));
                  }}
                  aria-invalid={!!errors.totalBalance}
                />
                {errors.totalBalance && (
                  <p className="text-sm text-destructive">
                    {errors.totalBalance.message}
                  </p>
                )}
              </div>
            )}
          />
          <Controller
            control={control}
            name="dueDate"
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <Label>Due date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      aria-invalid={!!errors.dueDate}
                      className={cn(
                        "justify-start text-left font-normal",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {field.value ? format(field.value, "PP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ?? undefined}
                      onSelect={(d) => field.onChange(d ?? null)}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.dueDate && (
                  <p className="text-sm text-destructive">
                    {errors.dueDate.message}
                  </p>
                )}
              </div>
            )}
          />
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category">Category</Label>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILL_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          />
          <Controller
            control={control}
            name="minimumPayment"
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="minimumPayment">
                  Minimum payment (optional)
                </Label>
                <Input
                  id="minimumPayment"
                  type="number"
                  step="0.01"
                  ref={field.ref}
                  name={field.name}
                  onBlur={field.onBlur}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    field.onChange(v === "" ? null : parseFloat(v));
                  }}
                  aria-invalid={!!errors.minimumPayment}
                />
                {errors.minimumPayment && (
                  <p className="text-sm text-destructive">
                    {errors.minimumPayment.message}
                  </p>
                )}
              </div>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {initial ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
