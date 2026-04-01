import { useEffect, useCallback } from "react";
import { useOnboardingStore, TOTAL_SLIDES } from "@/stores/onboardingStore";
import { LogoRevealSlide } from "./slides/LogoRevealSlide";
import { ToolsOrbitSlide } from "./slides/ToolsOrbitSlide";
import { MCPsSlide } from "./slides/MCPsSlide";
import { SkillsSlide } from "./slides/SkillsSlide";
import { HooksAgentsSlide } from "./slides/HooksAgentsSlide";
import { CTASlide } from "./slides/CTASlide";

const SLIDES = [LogoRevealSlide, ToolsOrbitSlide, MCPsSlide, SkillsSlide, HooksAgentsSlide, CTASlide];

export function OnboardingOverlay() {
  const { currentSlide, goToSlide, nextSlide, prevSlide, completeOnboarding } = useOnboardingStore();

  const isLastSlide = currentSlide === TOTAL_SLIDES - 1;

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        nextSlide();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevSlide();
      }
      if (e.key === "Escape") {
        completeOnboarding();
      }
    },
    [nextSlide, prevSlide, completeOnboarding]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Auto-advance from logo slide after 2.5s
  useEffect(() => {
    if (currentSlide !== 0) return;
    const timer = setTimeout(() => nextSlide(), 2500);
    return () => clearTimeout(timer);
  }, [currentSlide, nextSlide]);

  return (
    <div className="ob-overlay">
      {/* Progress bar */}
      <div
        className="ob-progress-bar"
        style={{ width: `${(currentSlide / (TOTAL_SLIDES - 1)) * 100}%` }}
      />

      {/* Background effects */}
      <div className="ob-bg-grid" />
      <div className="ob-bg-glow" />

      {/* Slides */}
      <div className="ob-slides">
        {SLIDES.map((SlideComponent, i) => (
          <div
            key={i}
            className={`ob-slide ${currentSlide === i ? "ob-slide-active" : ""}`}
          >
            <SlideComponent />
          </div>
        ))}
      </div>

      {/* Bottom navigation */}
      {!isLastSlide && (
        <div className="ob-nav-bar">
          <button className="ob-nav-btn ob-nav-secondary" onClick={completeOnboarding}>
            Skip
          </button>
          <div className="ob-nav-dots">
            {Array.from({ length: TOTAL_SLIDES }, (_, i) => (
              <button
                key={i}
                className={`ob-nav-dot ${currentSlide === i ? "ob-nav-dot-active" : ""}`}
                onClick={() => goToSlide(i)}
              />
            ))}
          </div>
          <button className="ob-nav-btn ob-nav-primary" onClick={nextSlide}>
            Next
          </button>
        </div>
      )}

      <div className="ob-kbd-hint">
        Press <kbd>→</kbd> or <kbd>Space</kbd> to continue
      </div>
    </div>
  );
}
