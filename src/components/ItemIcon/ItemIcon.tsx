import { cn } from "@/lib/utils";
import { getColorForName } from "@/lib/colors";
import { matchItemIcon, ICON_COMPONENTS } from "./iconMap";

interface ItemIconProps {
  name: string;
  description?: string;
  overrideIcon?: string;
  size?: "sm" | "md";
}

export function ItemIcon({ name, description, overrideIcon, size = "md" }: ItemIconProps) {
  const colorClass = getColorForName(name);
  const dims = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  const iconName = overrideIcon || matchItemIcon(name, description);
  const IconComponent = iconName ? ICON_COMPONENTS[iconName] : null;

  if (IconComponent) {
    const [bgClass, textClass] = colorClass.split(" ");
    return (
      <div
        className={cn(
          dims,
          bgClass,
          "flex shrink-0 items-center justify-center rounded-lg"
        )}
      >
        <IconComponent className={cn(iconSize, textClass)} />
      </div>
    );
  }

  // Fallback: letter avatar (same pattern as stdio MCPs in MCPIcon.tsx)
  const letter = name.charAt(0).toUpperCase();
  return (
    <div
      className={cn(
        dims,
        colorClass,
        "flex shrink-0 items-center justify-center rounded-lg font-semibold"
      )}
    >
      {letter}
    </div>
  );
}
