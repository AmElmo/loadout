import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light" | "system";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

function getSystemTheme(): "dark" | "light" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

const VALID_THEMES: ReadonlySet<string> = new Set(["dark", "light", "system"]);

function normalizeTheme(value: unknown): Theme {
  return typeof value === "string" && VALID_THEMES.has(value)
    ? (value as Theme)
    : "system";
}

function applyTheme(theme: Theme) {
  const safe = normalizeTheme(theme);
  const resolved = safe === "system" ? getSystemTheme() : safe;
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(resolved);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "system" as Theme,
      setTheme: (theme: Theme) => {
        set({ theme });
        applyTheme(theme);
      },
    }),
    {
      name: "loadout-theme",
    }
  )
);

// Apply theme on store rehydration
useThemeStore.persist.onFinishHydration((state) => {
  applyTheme(state.theme);
});

// Listen for OS theme changes when "system" is selected
const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
mediaQuery.addEventListener("change", () => {
  const { theme } = useThemeStore.getState();
  if (theme === "system") {
    applyTheme("system");
  }
});
