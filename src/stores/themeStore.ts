import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light" | "system";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

function getSystemDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: Theme) {
  const isDark = theme === "system" ? getSystemDark() : theme === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.classList.toggle("light", !isDark);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
    }),
    {
      name: "loadout-theme",
    }
  )
);

// Apply theme on store hydration (after localStorage is read)
useThemeStore.persist.onFinishHydration((state) => {
  applyTheme(state.theme);
});

// Listen for OS theme changes when in "system" mode
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => {
    const { theme } = useThemeStore.getState();
    if (theme === "system") {
      applyTheme("system");
    }
  });
