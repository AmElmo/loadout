import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { UpdateNotification } from "@/components/UpdateNotification";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { OnboardingOverlay } from "@/components/onboarding/OnboardingOverlay";
import { Home } from "@/pages/Home";
import { MCPs } from "@/pages/MCPs";
import { Skills } from "@/pages/Skills";
import { Agents } from "@/pages/Agents";
import { Rules } from "@/pages/Rules";
import { Hooks } from "@/pages/Hooks";
import { Plugins } from "@/pages/Plugins";
import { Context } from "@/pages/Context";
import { Learn } from "@/pages/Learn";
import { Repos } from "@/pages/Repos";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useShortcutStore } from "@/stores/shortcutStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useEffect, useRef } from "react";

function App() {
  const { activeTab, setSelectedRepo } = useWorkspaceStore();
  const showShortcutsModal = useShortcutStore((s) => s.showShortcutsModal);
  const showOnboarding = useOnboardingStore((s) => s.showOnboarding);
  const mainRef = useRef<HTMLElement>(null);
  useKeyboardShortcuts();

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
    // Clear selected repo when navigating away from repos tab
    if (activeTab !== "repos") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset repo selection on tab change
      setSelectedRepo(null);
    }
  }, [activeTab, setSelectedRepo]);

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
      case "plugins":
        return <Plugins />;
      case "context":
        return <Context />;
      case "repos":
        return <Repos />;
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
      <UpdateNotification />
      {showShortcutsModal && <KeyboardShortcutsModal />}
      {showOnboarding && <OnboardingOverlay />}
    </div>
  );
}

export default App;
