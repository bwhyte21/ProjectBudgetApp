import { http } from './httpClient';
import { fromRankedWire, type CalculationResult, type RankedBill } from './types';

interface CalculationWire extends Omit<CalculationResult, 'rankedBills'> {
  rankedBills: Parameters<typeof fromRankedWire>[0][];
}

export const calculationApi = {
  run: async (): Promise<CalculationResult> => {
    const wire = await http.post<CalculationWire>('/calculation');
    return {
      monthlyTakeHome: wire.monthlyTakeHome,
      totalMonthlyOwed: wire.totalMonthlyOwed,
      leftover: wire.leftover,
      rankedBills: wire.rankedBills.map(fromRankedWire) as RankedBill[]
    };
  }
};
