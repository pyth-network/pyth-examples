export default function PiggyIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* body */}
      <ellipse cx="62" cy="68" rx="38" ry="32" fill="#F2B8A0" />
      {/* snout */}
      <ellipse cx="90" cy="72" rx="13" ry="10" fill="#E8907A" />
      <circle cx="87" cy="72" r="2.5" fill="#C25B4E" />
      <circle cx="93" cy="72" r="2.5" fill="#C25B4E" />
      {/* eye */}
      <circle cx="74" cy="58" r="4" fill="white" />
      <circle cx="75" cy="58" r="2" fill="#2D1F1A" />
      {/* ear */}
      <ellipse cx="52" cy="42" rx="9" ry="11" fill="#F2B8A0" transform="rotate(-15 52 42)" />
      <ellipse cx="52" cy="43" rx="5" ry="6.5" fill="#E8907A" transform="rotate(-15 52 43)" />
      {/* coin slot */}
      <rect x="55" y="36" width="14" height="3" rx="1.5" fill="#C25B4E" />
      {/* legs */}
      <rect x="36" y="93" width="10" height="14" rx="5" fill="#F2B8A0" />
      <rect x="52" y="95" width="10" height="12" rx="5" fill="#F2B8A0" />
      <rect x="68" y="95" width="10" height="12" rx="5" fill="#F2B8A0" />
      <rect x="84" y="93" width="10" height="14" rx="5" fill="#F2B8A0" />
      {/* tail */}
      <path
        d="M24 60 Q14 52 18 44 Q22 36 28 44"
        stroke="#E8907A"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
