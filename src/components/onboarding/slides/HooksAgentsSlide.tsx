const CARDS = [
  { label: "Hooks", color: "#f97316" },
  { label: "Subagents", color: "#3b82f6" },
  { label: "Plugins", color: "#22c55e" },
  { label: "Context Window", color: "#a855f7" },
  { label: "Repos", color: "#f43f5e" },
  { label: "Rules", color: "#14b8a6" },
  { label: "Learn", color: "#f59e0b" },
];

export function HooksAgentsSlide() {
  return (
    <div className="ob-slide-content">
      <div className="ob-slide-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </div>
      <div className="ob-slide-title">Hooks, Agents & more</div>
      <div className="ob-slide-subtitle">
        Event-driven hooks, subagent configurations, plugins — manage every layer of your AI stack.
      </div>

      <div className="ob-feature-cards">
        {CARDS.map((card, i) => (
          <div
            key={card.label}
            className="ob-feature-card"
            style={{ animationDelay: `${0.3 + i * 0.1}s` }}
          >
            <div className="ob-card-dot" style={{ background: card.color }} />
            {card.label}
          </div>
        ))}
      </div>
    </div>
  );
}
