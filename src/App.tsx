import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { MCPs } from "@/pages/MCPs";
import { Skills } from "@/pages/Skills";
import { Config } from "@/pages/Config";
import { useWorkspaceStore } from "@/stores/workspaceStore";

function App() {
  const { activeTab } = useWorkspaceStore();

  const renderPage = () => {
    switch (activeTab) {
      case "mcps":
        return <MCPs />;
      case "skills":
        return <Skills />;
      case "config":
        return <Config />;
      default:
        return <MCPs />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">{renderPage()}</main>
      </div>
    </div>
  );
}

export default App;
