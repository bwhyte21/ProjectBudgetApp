import { http } from './httpClient';
import { fromIncomeWire, toIncomeWirePayload, type Income, type IncomeInput } from './types';

export const incomeApi = {
  get: async (): Promise<Income | null> => {
    const wire = await http.get<Parameters<typeof fromIncomeWire>[0]>('/income');
    return fromIncomeWire(wire);
  },
  save: async (input: IncomeInput): Promise<Income> => {
    const wire = await http.put<NonNullable<Parameters<typeof fromIncomeWire>[0]>>(
      '/income',
      toIncomeWirePayload(input)
    );
    return fromIncomeWire(wire) as Income;
  }
};
