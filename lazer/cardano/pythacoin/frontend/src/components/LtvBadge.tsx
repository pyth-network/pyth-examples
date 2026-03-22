interface Props {
  ltv: number;
}

export function LtvBadge({ ltv }: Props) {
  const color =
    ltv > 90
      ? "bg-red-600"
      : ltv > 75
        ? "bg-yellow-600"
        : "bg-green-600";

  return (
    <span className={`${color} text-xs font-bold px-2 py-0.5 rounded shrink-0`}>
      {ltv.toFixed(1)}% LTV
    </span>
  );
}
