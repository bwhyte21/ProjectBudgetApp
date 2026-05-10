import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { billsApi } from '../../api/bills';
import type { Bill, BillInput } from '../../api/types';

export interface BillsState {
  items: Bill[];
  status: 'idle' | 'loading' | 'error';
  error?: string;
}

const initialState: BillsState = { items: [], status: 'idle' };

export const fetchBills = createAsyncThunk('bills/fetch', () => billsApi.list());
export const createBill = createAsyncThunk('bills/create', (input: BillInput) => billsApi.create(input));
export const updateBill = createAsyncThunk(
  'bills/update',
  ({ id, input }: { id: string; input: BillInput }) => billsApi.update(id, input)
);
export const deleteBill = createAsyncThunk('bills/delete', async (id: string) => {
  await billsApi.remove(id);
  return id;
});

const billsSlice = createSlice({
  name: 'bills',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchBills.pending, state => {
        state.status = 'loading';
        state.error = undefined;
      })
      .addCase(fetchBills.fulfilled, (state, action: PayloadAction<Bill[]>) => {
        state.items = action.payload;
        state.status = 'idle';
      })
      .addCase(fetchBills.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message;
      })
      .addCase(createBill.fulfilled, (state, action: PayloadAction<Bill>) => {
        state.items.push(action.payload);
      })
      .addCase(updateBill.fulfilled, (state, action: PayloadAction<Bill>) => {
        const idx = state.items.findIndex(b => b.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteBill.fulfilled, (state, action: PayloadAction<string>) => {
        state.items = state.items.filter(b => b.id !== action.payload);
      });
  }
});

export default billsSlice.reducer;
