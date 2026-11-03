interface Props {
  step: number;
  text: string;
  visible: boolean;
}

export default function Hint({ step, text, visible }: Props) {
  if (!visible) return null;

  const isDone = step === 0;

  return (
    <div className={`floating-hint ${isDone ? "floating-hint-done" : ""}`}>
      <div className="floating-hint-arrow" />
      <span className={`floating-hint-badge ${isDone ? "floating-hint-badge-done" : ""}`}>
        {isDone ? "\u2713" : step}
      </span>
      <span className="floating-hint-text">{text}</span>
    </div>
  );
}
