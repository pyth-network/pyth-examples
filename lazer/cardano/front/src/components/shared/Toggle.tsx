"use client";

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  color?: string;
}

export default function Toggle({
  label,
  checked,
  onChange,
  color = "var(--accent-green)",
}: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2">
      <span className="text-sm text-secondary">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative h-6 w-10 rounded-full transition-colors"
        style={{
          backgroundColor: checked ? color : "var(--border-light)",
        }}
      >
        <span
          className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform"
          style={{
            transform: checked ? "translateX(16px)" : "translateX(0)",
          }}
        />
      </button>
    </label>
  );
}
