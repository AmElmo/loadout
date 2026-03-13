import { type ReactNode, useState } from "react";
import { ChevronRight } from "lucide-react";
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
  expandableKey?: string;
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
  expandableKey,
}: PluginComponentSectionProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

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
              {expandableKey && (
                <th className="w-6 px-1 py-2" />
              )}
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
            {items.map((item, index) => {
              const hasContent = expandableKey && item[expandableKey];
              const isExpanded = expandedIndex === index;

              return (
                <tr
                  key={index}
                  className={cn(
                    index < items.length - 1 && !isExpanded
                      ? "border-b border-border"
                      : undefined,
                    hasContent && "cursor-pointer hover:bg-muted/30",
                  )}
                  onClick={
                    hasContent
                      ? () => setExpandedIndex(isExpanded ? null : index)
                      : undefined
                  }
                >
                  {expandableKey && (
                    <td className="w-6 px-1 py-2 text-center">
                      {hasContent && (
                        <ChevronRight
                          className={cn(
                            "inline-block h-3.5 w-3.5 text-muted-foreground transition-transform",
                            isExpanded && "rotate-90",
                          )}
                        />
                      )}
                    </td>
                  )}
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
              );
            })}
          </tbody>
        </table>

        {/* Expanded content panel (rendered outside the table for proper layout) */}
        {expandedIndex !== null &&
          expandableKey &&
          items[expandedIndex]?.[expandableKey] && (
            <div className="border-t border-border bg-muted/20 px-4 py-3">
              <pre className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                {items[expandedIndex][expandableKey]}
              </pre>
            </div>
          )}
      </div>
    </div>
  );
}
