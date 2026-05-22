import { Sun, Moon, MonitorCog } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setMode, type ThemeMode } from "./themeSlice";

export function ThemeToggle() {
  const mode = useAppSelector((s) => s.theme.mode);
  const dispatch = useAppDispatch();

  const handle = (next: string) => {
    if (next) dispatch(setMode(next as ThemeMode));
  };

  return (
    <ToggleGroup
      type="single"
      value={mode}
      onValueChange={handle}
      variant="outline"
      size="sm"
      className="bg-card"
    >
      <ToggleGroupItem value="light" aria-label="Light mode">
        <Sun className="size-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="system" aria-label="System mode">
        <MonitorCog className="size-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="dark" aria-label="Dark mode">
        <Moon className="size-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
