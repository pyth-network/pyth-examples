import { RiskLadderStep, RiskStage } from "@/lib/types";

const stages: {
  stepId: RiskLadderStep;
  label: string;
  trigger: string;
  action: string;
  color: string;
  bg: string;
}[] = [
  {
    stepId: "normal",
    label: "Normal",
    trigger: "Drawdown < 300bps",
    action: "Hold current allocation. Monitor oracle feeds.",
    color: "text-green",
    bg: "bg-green-muted",
  },
  {
    stepId: "watch",
    label: "Watch",
    trigger: "Drawdown > 300bps",
    action: "Increase monitoring frequency. Prepare execution routes.",
    color: "text-yellow",
    bg: "bg-yellow-muted",
  },
  {
    stepId: "partial_derisk",
    label: "Partial De-Risk",
    trigger: "Drawdown > 700bps",
    action: "Swap portion of risk asset to stable. Target 50% stable ratio.",
    color: "text-red",
    bg: "bg-red-muted",
  },
  {
    stepId: "full_exit",
    label: "Full Stable Exit",
    trigger: "Drawdown > 1200bps or floor breached",
    action:
      "Emergency swap all risk to stable. Protect fiat-denominated floor.",
    color: "text-red",
    bg: "bg-red-muted",
  },
  {
    stepId: "frozen",
    label: "Frozen",
    trigger: "Oracle stale or confidence too wide",
    action:
      "Pause automated execution until oracle quality and freshness recover.",
    color: "text-red",
    bg: "bg-red-muted",
  },
  {
    stepId: "auto_reentry",
    label: "Auto Re-Entry",
    trigger: "Recovery > 500bps after cooldown",
    action:
      "Gradually restore risk allocation. Resume normal monitoring.",
    color: "text-accent",
    bg: "bg-accent-muted",
  },
];

interface RiskLadderProps {
  currentStage: RiskStage;
  activeStep?: RiskLadderStep;
}

export function RiskLadder({ currentStage, activeStep }: RiskLadderProps) {
  const resolvedActiveStep = activeStep ?? currentStage;

  return (
    <div className="glass-panel overflow-hidden">
      <div className="px-5 py-4 border-b border-line">
        <h3 className="text-sm font-semibold text-text">Risk Ladder</h3>
        <p className="text-xs text-text-muted mt-1">
          Automated escalation based on oracle drawdown signals
        </p>
      </div>
      <div className="p-5 space-y-3">
        {stages.map((s, i) => {
          const isActive = resolvedActiveStep === s.stepId;
          return (
            <div
              key={s.stepId}
              className={`relative flex gap-4 p-4 rounded-xl border transition-all duration-200 ${
                isActive
                  ? `${s.bg} border-current/10 ${s.color}`
                  : "border-line-soft hover:border-line hover:bg-panel-hover"
              }`}
            >
              {/* Step indicator */}
              <div className="flex flex-col items-center gap-1 pt-0.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    isActive
                      ? `${s.bg} ${s.color}`
                      : "bg-panel-hover text-text-muted"
                  }`}
                >
                  {i + 1}
                </div>
                {i < stages.length - 1 && (
                  <div className="w-px h-full min-h-[20px] bg-line-soft" />
                )}
              </div>
              {/* Content */}
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <h4
                    className={`text-sm font-semibold ${
                      isActive ? s.color : "text-text"
                    }`}
                  >
                    {s.label}
                  </h4>
                  {isActive && (
                    <span className={`chip ${s.bg} ${s.color}`}>ACTIVE</span>
                  )}
                </div>
                <p className="text-xs font-mono text-text-muted">
                  Trigger: {s.trigger}
                </p>
                <p className="text-xs text-text-secondary">{s.action}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
