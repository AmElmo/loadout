import { useState, type MouseEvent } from "react";
import { FolderOpen } from "lucide-react";
import { revealInFileManager } from "@/lib/api/system";
import { Button, type ButtonProps } from "./button";

interface OpenPathButtonProps extends Omit<ButtonProps, "onClick"> {
  path: string;
  label?: string;
}

export function OpenPathButton({
  path,
  label = "Open Location",
  disabled,
  title,
  ...buttonProps
}: OpenPathButtonProps) {
  const [opening, setOpening] = useState(false);

  const handleOpen = async (
    event: MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    if (!path) return;

    try {
      setOpening(true);
      await revealInFileManager(path);
    } catch (error) {
      console.error("Failed to reveal path:", path, error);
    } finally {
      setOpening(false);
    }
  };

  return (
    <Button
      {...buttonProps}
      disabled={disabled || opening}
      onClick={handleOpen}
      title={title ?? path}
    >
      <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
      {opening ? "Opening..." : label}
    </Button>
  );
}
