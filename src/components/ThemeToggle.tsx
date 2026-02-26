import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/themeStore";

const options = [
  { value: "light" as const, icon: Sun, label: "Light" },
  { value: "dark" as const, icon: Moon, label: "Dark" },
  { value: "system" as const, icon: Monitor, label: "System" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="flex items-center gap-0.5 rounded-md bg-muted p-0.5">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          className={cn(
            "rounded-sm p-1 transition-colors",
            theme === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="h-3 w-3" />
        </button>
      ))}
    </div>
  );
}
