import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ColumnDef {
  key: string;
  label: string;
}

interface PluginComponentSectionProps {
  title: string;
  icon?: ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: Array<Record<string, any>>;
  columns?: ColumnDef[];
  onItemClick?: (index: number) => void;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description" },
];

export function PluginComponentSection({
  title,
  icon,
  items,
  columns = DEFAULT_COLUMNS,
  onItemClick,
}: PluginComponentSectionProps) {
  if (items.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {icon && (
          <span className="text-muted-foreground">{icon}</span>
        )}
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
      </div>
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr
                key={index}
                className={cn(
                  index < items.length - 1
                    ? "border-b border-border"
                    : undefined,
                  onItemClick && "cursor-pointer hover:bg-muted/30",
                )}
                onClick={onItemClick ? () => onItemClick(index) : undefined}
              >
                {columns.map((col) => {
                  const value = item[col.key];
                  return (
                    <td
                      key={col.key}
                      className="px-3 py-2 text-xs text-muted-foreground"
                    >
                      {value != null ? String(value) : "\u2014"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
