"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface JsonViewerProps {
  data: unknown;
  label?: string;
  defaultOpen?: boolean;
}

export default function JsonViewer({
  data,
  label,
  defaultOpen = false,
}: JsonViewerProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (data === null || data === undefined) {
    return (
      <div className="text-xs text-muted italic">
        {label ? `${label}: ` : ""}—
      </div>
    );
  }

  const json = JSON.stringify(data, null, 2);

  return (
    <div>
      {label && (
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 text-xs font-medium text-secondary hover:text-foreground mb-1"
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {label}
        </button>
      )}
      {(open || !label) && (
        <pre className="overflow-auto rounded bg-[var(--bg-primary)] p-2 text-[11px] leading-relaxed text-secondary max-h-48 border border-border">
          {json}
        </pre>
      )}
    </div>
  );
}
