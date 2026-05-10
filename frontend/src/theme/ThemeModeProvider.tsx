import { useMemo, type ReactNode } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useAppSelector } from '../store/hooks';
import { darkPalette, lightPalette } from './palettes';

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const mode = useAppSelector(s => s.theme.mode);
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  const theme = useMemo(() => {
    const effective = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;
    return createTheme({
      palette: effective === 'dark' ? darkPalette : lightPalette,
      shape: { borderRadius: 8 }
    });
  }, [mode, prefersDark]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
