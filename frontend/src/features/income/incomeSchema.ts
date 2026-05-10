import { z } from 'zod';
import { PAY_FREQUENCIES } from '../../api/types';

export const incomeSchema = z.object({
  perPaycheckAmount: z
    .number({ message: 'Required' })
    .min(0.01, 'Must be greater than zero'),
  frequency: z.enum(PAY_FREQUENCIES as [string, ...string[]])
});

export type IncomeFormValues = z.infer<typeof incomeSchema>;
