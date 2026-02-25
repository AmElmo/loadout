import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Home } from "@/pages/Home";
import { MCPs } from "@/pages/MCPs";
import { Skills } from "@/pages/Skills";
import { Agents } from "@/pages/Agents";
import { Rules } from "@/pages/Rules";
import { Hooks } from "@/pages/Hooks";
import { Context } from "@/pages/Context";
import { Learn } from "@/pages/Learn";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useEffect, useRef } from "react";

function App() {
  const { activeTab } = useWorkspaceStore();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [activeTab]);

  const renderPage = () => {
    switch (activeTab) {
      case "home":
        return <Home />;
      case "mcps":
        return <MCPs />;
      case "skills":
        return <Skills />;
      case "agents":
        return <Agents />;
      case "rules":
        return <Rules />;
      case "hooks":
        return <Hooks />;
      case "context":
        return <Context />;
      case "learn":
        return <Learn />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main ref={mainRef} className="flex-1 overflow-auto">{renderPage()}</main>
      </div>
    </div>
  );
}

export default App;
