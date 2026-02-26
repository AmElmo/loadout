interface ColumnDef {
  key: string;
  label: string;
}

interface PluginComponentSectionProps {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: Array<Record<string, any>>;
  columns?: ColumnDef[];
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description" },
];

export function PluginComponentSection({
  title,
  items,
  columns = DEFAULT_COLUMNS,
}: PluginComponentSectionProps) {
  if (items.length === 0) return null;

  return (
    <div>
      <h4 className="mb-2 text-sm font-medium text-foreground">{title}</h4>
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
                className={
                  index < items.length - 1
                    ? "border-b border-border"
                    : undefined
                }
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
