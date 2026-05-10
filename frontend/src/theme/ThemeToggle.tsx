import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setMode, type ThemeMode } from './themeSlice';

export function ThemeToggle() {
  const mode = useAppSelector(s => s.theme.mode);
  const dispatch = useAppDispatch();

  const handle = (_: unknown, next: ThemeMode | null) => {
    if (next) dispatch(setMode(next));
  };

  return (
    <ToggleButtonGroup value={mode} exclusive onChange={handle} size="small" color="primary">
      <ToggleButton value="light" aria-label="Light mode">
        <LightModeIcon fontSize="small" />
      </ToggleButton>
      <ToggleButton value="system" aria-label="System mode">
        <SettingsBrightnessIcon fontSize="small" />
      </ToggleButton>
      <ToggleButton value="dark" aria-label="Dark mode">
        <DarkModeIcon fontSize="small" />
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
