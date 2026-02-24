/**
 * Get a consistent color class string for a given name.
 * Returns full Tailwind class strings (e.g., "bg-red-500/10 text-red-500")
 * so they are statically detectable by Tailwind's purge/scan.
 */
export function getColorForName(name: string): string {
  const colors = [
    "bg-red-500/10 text-red-500",
    "bg-orange-500/10 text-orange-500",
    "bg-amber-500/10 text-amber-500",
    "bg-yellow-500/10 text-yellow-500",
    "bg-lime-500/10 text-lime-500",
    "bg-green-500/10 text-green-500",
    "bg-emerald-500/10 text-emerald-500",
    "bg-teal-500/10 text-teal-500",
    "bg-cyan-500/10 text-cyan-500",
    "bg-sky-500/10 text-sky-500",
    "bg-blue-500/10 text-blue-500",
    "bg-indigo-500/10 text-indigo-500",
    "bg-violet-500/10 text-violet-500",
    "bg-purple-500/10 text-purple-500",
    "bg-fuchsia-500/10 text-fuchsia-500",
    "bg-pink-500/10 text-pink-500",
  ];

  // Simple hash of name to pick a consistent color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
}
