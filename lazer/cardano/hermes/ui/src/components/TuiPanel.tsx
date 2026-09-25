import { cn } from "@/lib/utils"

interface TuiPanelProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function TuiPanel({ title, children, className }: TuiPanelProps) {
  return (
    <div className={cn("border border-border font-mono text-xs", className)}>
      <div className="flex items-center border-b border-border px-2 py-0.5">
        <span className="shrink-0 text-muted-foreground">┌─</span>
        <span className="shrink-0 px-1 text-foreground">[ {title} ]</span>
        <span className="min-w-0 flex-1 overflow-hidden text-muted-foreground">
          {"─".repeat(200)}
        </span>
        <span className="shrink-0 text-muted-foreground">─┐</span>
      </div>
      <div className="p-2">{children}</div>
    </div>
  )
}
