export function SkillsSlide() {
  const skills = [
    { icon: "⚡", name: "commit", tokens: "~1,240 tokens", tool: "Claude", bg: "rgba(249,115,22,0.1)", color: "#f97316" },
    { icon: "🔍", name: "review-pr", tokens: "~2,100 tokens", tool: "Claude", bg: "rgba(249,115,22,0.1)", color: "#f97316" },
    { icon: "📋", name: "spec-issue", tokens: "~890 tokens", tool: "Cursor", bg: "rgba(168,85,247,0.1)", color: "#a855f7" },
    { icon: "🧪", name: "test-runner", tokens: "~650 tokens", tool: "Codex", bg: "rgba(34,197,94,0.1)", color: "#22c55e" },
  ];

  return (
    <div className="ob-slide-content">
      <div className="ob-slide-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </div>
      <div className="ob-slide-title">Skills & Rules</div>
      <div className="ob-slide-subtitle">
        Audit skills, system prompts, and rules that shape your AI's behavior. Track token costs before they hit your context window.
      </div>

      <div className="ob-skills-cascade">
        {skills.map((s, i) => (
          <div key={s.name} className="ob-skill-row" style={{ animationDelay: `${0.2 + i * 0.15}s` }}>
            <span style={{ fontSize: "1.1rem" }}>{s.icon}</span>
            <span className="ob-skill-name">{s.name}</span>
            <span className="ob-skill-tokens">{s.tokens}</span>
            <span className="ob-skill-badge" style={{ background: s.bg, color: s.color }}>{s.tool}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
