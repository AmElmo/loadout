import type { ReactNode, MouseEvent } from "react";
import { cn } from "@/lib/utils";

interface DialogOverlayProps {
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * Shared modal backdrop that closes the dialog when clicking outside the content.
 * Wrap your modal content with this instead of a raw `<div className="fixed inset-0 ...">`.
 */
export function DialogOverlay({ onClose, children, className }: DialogOverlayProps) {
  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4",
        className,
      )}
      onClick={handleBackdropClick}
    >
      {children}
    </div>
  );
}
