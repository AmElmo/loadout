import { useState, useRef, useEffect, type MouseEvent } from "react";
import { FolderOpen, ChevronDown } from "lucide-react";
import { revealInFileManager } from "@/lib/api/system";
import { ToolLogo } from "@/components/ToolLogo";
import { toolLabel } from "@/config/tools";
import type { SourceTool } from "@/types";
import { Button, type ButtonProps } from "./button";
import { cn } from "@/lib/utils";

interface PathOption {
  tool: SourceTool;
  path: string;
}

interface OpenPathButtonProps extends Omit<ButtonProps, "onClick"> {
  path: string;
  label?: string;
  /** When provided, shows a dropdown to pick which tool's location to open */
  paths?: PathOption[];
}

export function OpenPathButton({
  path,
  label = "Open Location",
  paths,
  disabled,
  title,
  ...buttonProps
}: OpenPathButtonProps) {
  const [opening, setOpening] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const hasMultiple = paths && paths.length > 1;

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const openPath = async (targetPath: string) => {
    if (!targetPath) return;
    try {
      setOpening(true);
      await revealInFileManager(targetPath);
    } catch (error) {
      console.error("Failed to reveal path:", targetPath, error);
    } finally {
      setOpening(false);
      setMenuOpen(false);
    }
  };

  const handleOpen = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    await openPath(path);
  };

  const handleChevronClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setMenuOpen((prev) => !prev);
  };

  // Single path — simple button
  if (!hasMultiple) {
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

  // Multiple paths — split button with dropdown
  return (
    <div className="relative" ref={menuRef}>
      <div className="flex">
        <Button
          {...buttonProps}
          disabled={disabled || opening}
          onClick={handleOpen}
          title={title ?? path}
          className={cn(buttonProps.className, "rounded-r-none border-r-0")}
        >
          <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
          {opening ? "Opening..." : label}
        </Button>
        <Button
          {...buttonProps}
          disabled={disabled || opening}
          onClick={handleChevronClick}
          className={cn(buttonProps.className, "rounded-l-none px-1.5")}
          aria-label="Choose tool location"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>

      {menuOpen && (
        <div className="absolute bottom-full right-0 z-50 mb-1 min-w-[180px] rounded-md border border-border bg-background py-1 shadow-md">
          {paths.map((option) => (
            <button
              key={option.tool}
              onClick={(e) => {
                e.stopPropagation();
                openPath(option.path);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent"
            >
              <ToolLogo tool={option.tool} size={12} />
              <span className="font-medium">{toolLabel(option.tool)}</span>
              <span className="ml-auto truncate font-mono text-[10px] text-muted-foreground max-w-[200px]" title={option.path}>
                {option.path.split("/").slice(-3).join("/")}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
