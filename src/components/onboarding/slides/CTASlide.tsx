import { LoadoutLogo } from "../LoadoutLogo";
import { useOnboardingStore } from "@/stores/onboardingStore";

export function CTASlide() {
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);

  return (
    <div className="ob-slide-content">
      <LoadoutLogo className="ob-cta-logo" />
      <div className="ob-slide-title" style={{ fontSize: "2.8rem" }}>
        Gear up your AI tools.
      </div>
      <button className="ob-cta-btn" onClick={completeOnboarding}>
        Open Dashboard
      </button>
    </div>
  );
}
