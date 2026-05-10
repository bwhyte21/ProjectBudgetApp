import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeState {
  mode: ThemeMode;
}

const STORAGE_KEY = 'whichtopay.themeMode';

function loadInitialMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    // localStorage unavailable
  }
  return 'system';
}

const initialState: ThemeState = { mode: loadInitialMode() };

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setMode(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload;
      try {
        localStorage.setItem(STORAGE_KEY, action.payload);
      } catch {
        // ignore
      }
    }
  }
});

export const { setMode } = themeSlice.actions;
export default themeSlice.reducer;
