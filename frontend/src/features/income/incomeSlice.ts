import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { incomeApi } from '../../api/income';
import type { Income, IncomeInput } from '../../api/types';

export interface IncomeState {
  value: Income | null;
  status: 'idle' | 'loading' | 'error';
  error?: string;
}

const initialState: IncomeState = { value: null, status: 'idle' };

export const fetchIncome = createAsyncThunk('income/fetch', () => incomeApi.get());
export const saveIncome = createAsyncThunk('income/save', (input: IncomeInput) => incomeApi.save(input));

const incomeSlice = createSlice({
  name: 'income',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchIncome.pending, state => {
        state.status = 'loading';
        state.error = undefined;
      })
      .addCase(fetchIncome.fulfilled, (state, action: PayloadAction<Income | null>) => {
        state.value = action.payload;
        state.status = 'idle';
      })
      .addCase(fetchIncome.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message;
      })
      .addCase(saveIncome.fulfilled, (state, action: PayloadAction<Income>) => {
        state.value = action.payload;
        state.status = 'idle';
      });
  }
});

export default incomeSlice.reducer;
