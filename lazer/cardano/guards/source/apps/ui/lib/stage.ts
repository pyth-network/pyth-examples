import { RiskStage } from "@/lib/types";

type StageTone = "green" | "yellow" | "red";

interface StageAppearance {
  label: string;
  tone: StageTone;
  dotClass: string;
  textClass: string;
  chipClass: string;
  chartColor: string;
}

const STAGE_APPEARANCE: Record<RiskStage, StageAppearance> = {
  normal: {
    label: "Normal",
    tone: "green",
    dotClass: "bg-green",
    textClass: "text-green",
    chipClass: "chip-green",
    chartColor: "#22c55e",
  },
  watch: {
    label: "Watch",
    tone: "yellow",
    dotClass: "bg-yellow",
    textClass: "text-yellow",
    chipClass: "chip-yellow",
    chartColor: "#f0bf5f",
  },
  partial_derisk: {
    label: "Partial De-Risk",
    tone: "red",
    dotClass: "bg-red",
    textClass: "text-red",
    chipClass: "chip-red",
    chartColor: "#ef6f6c",
  },
  full_exit: {
    label: "Full Stable Exit",
    tone: "red",
    dotClass: "bg-red",
    textClass: "text-red",
    chipClass: "chip-red",
    chartColor: "#ef6f6c",
  },
  frozen: {
    label: "Frozen",
    tone: "red",
    dotClass: "bg-red",
    textClass: "text-red",
    chipClass: "chip-red",
    chartColor: "#ef6f6c",
  },
};

export function getStageAppearance(stage: RiskStage): StageAppearance {
  return STAGE_APPEARANCE[stage]!;
}
