import { configureStore } from '@reduxjs/toolkit';
import billsReducer from '../features/bills/billsSlice';
import incomeReducer from '../features/income/incomeSlice';
import calculationReducer from '../features/calculation/calculationSlice';
import themeReducer from '../theme/themeSlice';

export const store = configureStore({
  reducer: {
    bills: billsReducer,
    income: incomeReducer,
    calculation: calculationReducer,
    theme: themeReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
