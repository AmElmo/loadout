export function LoadoutLogo({ className, stroke = "#3B82F6", fill = "#3B82F6" }: { className?: string; stroke?: string; fill?: string }) {
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="32" cy="32" r="24" fill="none" stroke={stroke} strokeWidth="5" />
      <line x1="32" y1="8" x2="32" y2="56" stroke={stroke} strokeWidth="3" />
      <line x1="11" y1="20" x2="53" y2="44" stroke={stroke} strokeWidth="3" />
      <line x1="53" y1="20" x2="11" y2="44" stroke={stroke} strokeWidth="3" />
      <path d="M32,8 A24,24 0 0,1 52.8,20 L32,32 Z" fill={fill} />
    </svg>
  );
}
