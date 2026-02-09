import { Server, Sparkles, FileText, Anchor } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspaceStore";

const navItems = [
  { id: "mcps" as const, label: "MCPs", icon: Server },
  { id: "skills" as const, label: "Skills", icon: Sparkles },
  { id: "rules" as const, label: "Rules", icon: FileText },
  { id: "hooks" as const, label: "Hooks", icon: Anchor },
];

export function Sidebar() {
  const { activeTab, setActiveTab } = useWorkspaceStore();

  return (
    <aside className="flex h-full w-[200px] flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <h1 className="text-lg font-semibold tracking-tight text-sidebar-foreground">
          Loadout
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Version */}
      <div className="border-t border-sidebar-border p-4">
        <p className="text-xs text-muted-foreground">v0.1.0</p>
      </div>
    </aside>
  );
}
