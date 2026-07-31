import { TreasuryPosition } from "@/lib/types";

interface AccountsTableProps {
  positions: TreasuryPosition[];
}

export function AccountsTable({ positions }: AccountsTableProps) {
  const total = positions.reduce((s, p) => s + p.fiatValue, 0);

  return (
    <div className="glass-panel overflow-hidden">
      <div className="px-5 py-4 border-b border-line">
        <h3 className="text-sm font-semibold text-text">Treasury Accounts</h3>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-line-soft">
            <th className="px-5 py-3 text-left eyebrow">Asset</th>
            <th className="px-5 py-3 text-left eyebrow">Role</th>
            <th className="px-5 py-3 text-right eyebrow">Balance</th>
            <th className="px-5 py-3 text-right eyebrow">Fiat Value</th>
            <th className="px-5 py-3 text-right eyebrow">Weight</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos) => (
            <tr
              key={pos.assetId}
              className="border-b border-line-soft/50 hover:bg-panel-hover transition-colors"
            >
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      pos.role === "risk"
                        ? "bg-accent-muted text-accent"
                        : "bg-green-muted text-green"
                    }`}
                  >
                    {pos.symbol.slice(0, 2)}
                  </div>
                  <span className="text-sm font-semibold text-text">
                    {pos.symbol}
                  </span>
                </div>
              </td>
              <td className="px-5 py-3.5">
                <span
                  className={`chip ${
                    pos.role === "risk" ? "chip-blue" : "chip-green"
                  }`}
                >
                  {pos.role === "risk" ? "Hot Risk" : "Stable Reserve"}
                </span>
              </td>
              <td className="px-5 py-3.5 text-right font-mono text-sm text-text">
                {pos.amount.toLocaleString()}
              </td>
              <td className="px-5 py-3.5 text-right font-mono text-sm text-text">
                ${pos.fiatValue.toLocaleString()}
              </td>
              <td className="px-5 py-3.5 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="w-16 h-1.5 bg-line rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        pos.role === "risk" ? "bg-accent" : "bg-green"
                      }`}
                      style={{ width: `${pos.weight * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-text-secondary w-10 text-right">
                    {(pos.weight * 100).toFixed(0)}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-panel-hover/50">
            <td className="px-5 py-3 text-sm font-semibold text-text" colSpan={3}>
              Total
            </td>
            <td className="px-5 py-3 text-right font-mono text-sm font-semibold text-text">
              ${total.toLocaleString()}
            </td>
            <td className="px-5 py-3 text-right font-mono text-xs text-text-secondary">
              100%
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
