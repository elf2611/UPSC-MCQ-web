import re

with open("src/app/performance/page.tsx", "r") as f:
    content = f.read()

tooltip_impl = """
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card shadow-surface-glow p-4 rounded-xl border border-white/10">
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-2">{label}</p>
        <p className="text-primary font-display font-bold tabular-nums text-2xl">
          {payload[0].value.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">Score</span>
        </p>
      </div>
    );
  }
  return null;
};
"""

if "const CustomTooltip" not in content:
    # Inject it right after the imports
    content = content.replace('// ── Types ──────────────────────────────────────────────────────────────────', tooltip_impl + '\n// ── Types ──────────────────────────────────────────────────────────────────')

with open("src/app/performance/page.tsx", "w") as f:
    f.write(content)
