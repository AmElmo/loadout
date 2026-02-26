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

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
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
