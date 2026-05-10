import { z } from "zod";
import { BILL_CATEGORIES } from "../../api/types";

export const billSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(80, "Name must be 80 characters or fewer"),
  monthlyAmountOwed: z
    .number({ message: "Required" })
    .min(0.01, "Must be greater than zero")
    .nullable()
    .refine((v) => v !== null, { message: "Required" }),
  totalBalance: z.number().min(0).max(10_000_000).nullable().optional(),
  dueDate: z
    .date({ message: "Required" })
    .nullable()
    .refine((v) => v !== null, { message: "Required" }),
  category: z.enum(BILL_CATEGORIES as [string, ...string[]]),
  minimumPayment: z.number().min(0).max(1_000_000).nullable().optional(),
});

export type BillFormValues = z.input<typeof billSchema>;
export type BillFormOutput = z.output<typeof billSchema>;
