import { http } from "./httpClient";
import {
  fromBillWire,
  toBillWirePayload,
  type Bill,
  type BillInput,
} from "./types";

export const billsApi = {
  list: async (): Promise<Bill[]> => {
    const wire = await http.get<unknown[]>("/bills");
    return (wire as Parameters<typeof fromBillWire>[0][]).map(fromBillWire);
  },
  create: async (input: BillInput): Promise<Bill> => {
    const wire = await http.post<Parameters<typeof fromBillWire>[0]>(
      "/bills",
      toBillWirePayload(input),
    );
    return fromBillWire(wire);
  },
  update: async (id: string, input: BillInput): Promise<Bill> => {
    const wire = await http.put<Parameters<typeof fromBillWire>[0]>(
      `/bills/${id}`,
      toBillWirePayload(input),
    );
    return fromBillWire(wire);
  },
  remove: (id: string): Promise<void> => http.del<void>(`/bills/${id}`),
  markPaid: async (
    id: string,
    paidPeriod: string,
    balancePayment?: number,
  ): Promise<Bill> => {
    const body: { paidPeriod: string; balancePayment?: number } = {
      paidPeriod,
    };
    if (balancePayment !== undefined) body.balancePayment = balancePayment;
    const wire = await http.post<Parameters<typeof fromBillWire>[0]>(
      `/bills/${id}/mark-paid`,
      body,
    );
    return fromBillWire(wire);
  },
};
