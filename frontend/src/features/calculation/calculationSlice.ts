import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { calculationApi } from '../../api/calculation';
import type { CalculationResult } from '../../api/types';

export interface CalculationState {
  result: CalculationResult | null;
  status: 'idle' | 'loading' | 'error';
  error?: string;
}

const initialState: CalculationState = { result: null, status: 'idle' };

export const fetchCalculation = createAsyncThunk('calculation/run', () => calculationApi.run());

const calculationSlice = createSlice({
  name: 'calculation',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchCalculation.pending, state => {
        state.status = 'loading';
        state.error = undefined;
      })
      .addCase(fetchCalculation.fulfilled, (state, action: PayloadAction<CalculationResult>) => {
        state.result = action.payload;
        state.status = 'idle';
      })
      .addCase(fetchCalculation.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message;
      });
  }
});

export default calculationSlice.reducer;
