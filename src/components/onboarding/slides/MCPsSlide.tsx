export function MCPsSlide() {
  return (
    <div className="ob-slide-content">
      <div className="ob-slide-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 12h4" /><path d="M14 12h4" />
        </svg>
      </div>
      <div className="ob-slide-title">MCP Servers</div>
      <div className="ob-slide-subtitle">
        See all your Model Context Protocol servers at a glance — their health, tools, and which AI agents connect to them.
      </div>

      <div className="ob-mcp-visual">
        <div className="ob-mcp-server">
          <div className="ob-mcp-icon">🗄️</div>
          <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>PostgreSQL</div>
          <div className="ob-mcp-label">stdio</div>
          <div className="ob-mcp-status" />
        </div>
        <div className="ob-mcp-connector" />
        <div className="ob-mcp-server">
          <div className="ob-mcp-icon">🔍</div>
          <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>Grep</div>
          <div className="ob-mcp-label">stdio</div>
          <div className="ob-mcp-status" />
        </div>
        <div className="ob-mcp-connector" />
        <div className="ob-mcp-server">
          <div className="ob-mcp-icon">🌐</div>
          <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>Browser</div>
          <div className="ob-mcp-label">http</div>
          <div className="ob-mcp-status" />
        </div>
      </div>
    </div>
  );
}
