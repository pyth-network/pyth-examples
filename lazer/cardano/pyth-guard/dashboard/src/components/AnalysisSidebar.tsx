import { useState } from "react";
import {
  TrendingUp,
  GitCommitHorizontal,
  Ruler,
  Pencil,
  BarChart2,
  Minus,
  Crosshair,
} from "lucide-react";

const TOOLS = [
  { id: "trend",       icon: TrendingUp,           label: "Línea de Tendencia" },
  { id: "fibonacci",   icon: GitCommitHorizontal,   label: "Fibonacci" },
  { id: "ruler",       icon: Ruler,                 label: "Regla" },
  { id: "brush",       icon: Pencil,                label: "Pincel" },
  { id: "horizontal",  icon: Minus,                 label: "Línea Horizontal" },
  { id: "crosshair",   icon: Crosshair,             label: "Retícula" },
];

const INDICATOR_TOOLS = [
  { id: "indicators",  icon: BarChart2,             label: "Indicadores" },
];

export default function AnalysisSidebar() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <aside className="analysis-sidebar">
      {TOOLS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          className={`tool-btn ${active === id ? "active" : ""}`}
          title={label}
          onClick={() => setActive(active === id ? null : id)}
        >
          <Icon size={16} />
        </button>
      ))}

      <div className="tool-separator" />

      {INDICATOR_TOOLS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          className={`tool-btn ${active === id ? "active" : ""}`}
          title={label}
          onClick={() => setActive(active === id ? null : id)}
        >
          <Icon size={16} />
        </button>
      ))}
    </aside>
  );
}
