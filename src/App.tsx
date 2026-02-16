import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { MCPs } from "@/pages/MCPs";
import { Skills } from "@/pages/Skills";
import { Rules } from "@/pages/Rules";
import { Hooks } from "@/pages/Hooks";
import { Context } from "@/pages/Context";
import { useWorkspaceStore } from "@/stores/workspaceStore";

function App() {
  const { activeTab } = useWorkspaceStore();

  const renderPage = () => {
    switch (activeTab) {
      case "mcps":
        return <MCPs />;
      case "skills":
        return <Skills />;
      case "rules":
        return <Rules />;
      case "hooks":
        return <Hooks />;
      case "context":
        return <Context />;
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
