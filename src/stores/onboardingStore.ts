import { create } from "zustand";
import { persist } from "zustand/middleware";

export const TOTAL_SLIDES = 6;

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  showOnboarding: boolean;
  currentSlide: number;

  setShowOnboarding: (show: boolean) => void;
  goToSlide: (n: number) => void;
  nextSlide: () => void;
  prevSlide: () => void;
  completeOnboarding: () => void;
  replayOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      hasCompletedOnboarding: false,
      showOnboarding: false,
      currentSlide: 0,

      setShowOnboarding: (show) => set({ showOnboarding: show }),

      goToSlide: (n) => {
        if (n >= 0 && n < TOTAL_SLIDES) set({ currentSlide: n });
      },

      nextSlide: () => {
        const { currentSlide } = get();
        if (currentSlide < TOTAL_SLIDES - 1) set({ currentSlide: currentSlide + 1 });
      },

      prevSlide: () => {
        const { currentSlide } = get();
        if (currentSlide > 0) set({ currentSlide: currentSlide - 1 });
      },

      completeOnboarding: () => {
        set({ hasCompletedOnboarding: true, showOnboarding: false, currentSlide: 0 });
      },

      replayOnboarding: () => {
        set({ showOnboarding: true, currentSlide: 0 });
      },
    }),
    {
      name: "loadout-onboarding",
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
      onRehydrateStorage: () => (state) => {
        // On first launch (hasn't completed), show the onboarding
        if (state && !state.hasCompletedOnboarding) {
          state.showOnboarding = true;
        }
      },
    }
  )
);
