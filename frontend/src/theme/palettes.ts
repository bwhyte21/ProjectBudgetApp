import type { PaletteOptions } from '@mui/material/styles';

export const darkPalette: PaletteOptions = {
  mode: 'dark',
  primary: { main: '#456882' },
  secondary: { main: '#234C6A' },
  background: { default: '#1B3C53', paper: '#234C6A' },
  text: { primary: '#D2C1B6', secondary: '#D2C1B6' }
};

export const lightPalette: PaletteOptions = {
  mode: 'light',
  primary: { main: '#81A6C6' },
  secondary: { main: '#AACDDC' },
  background: { default: '#F3E3D0', paper: '#FFFFFF' },
  text: { primary: '#2A2A2A', secondary: '#5A5A5A' }
};
