import { z } from "zod";
import { PAY_FREQUENCIES } from "../../api/types";

export const incomeSchema = z.object({
  perPaycheckAmount: z
    .number({ message: "Required" })
    .min(0.01, "Must be greater than zero"),
  frequency: z.enum(PAY_FREQUENCIES),
  payAnchorDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
    .nullable()
    .optional(),
});

export type IncomeFormValues = z.infer<typeof incomeSchema>;
