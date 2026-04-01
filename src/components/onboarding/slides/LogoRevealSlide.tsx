import { LoadoutLogo } from "../LoadoutLogo";

export function LogoRevealSlide() {
  return (
    <div className="ob-logo-container">
      <LoadoutLogo className="ob-logo-svg" />
      <div className="ob-logo-text">Loadout</div>
      <div className="ob-logo-tagline">Gear up your AI tools</div>
    </div>
  );
}
