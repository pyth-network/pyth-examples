"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <button
      onClick={copy}
      className="ml-1 inline-flex items-center rounded px-1 py-0.5 text-[10px] text-secondary hover:text-foreground transition-colors"
      title="Copy to clipboard"
    >
      {copied
        ? <Check className="h-3 w-3 text-[var(--accent-green)]" />
        : <Copy className="h-3 w-3" />
      }
    </button>
  );
}
