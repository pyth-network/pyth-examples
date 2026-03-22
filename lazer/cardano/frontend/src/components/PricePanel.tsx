import { formatAdaUsd } from '../utils/format';

interface PricePanelProps {
  value: number;
  onChange: (next: number) => void;
}

const MIN_PRICE = 0.1;
const MAX_PRICE = 2;

export function PricePanel({ value, onChange }: PricePanelProps): JSX.Element {
  const handleInputChange = (input: string): void => {
    const numericValue = Number(input);
    if (!Number.isNaN(numericValue)) {
      const clamped = Math.min(MAX_PRICE, Math.max(MIN_PRICE, numericValue));
      onChange(clamped);
    }
  };

  return (
    <section className="price-panel panel">
      <header>
        <h3>Mock oracle</h3>
        <span>{formatAdaUsd(value)}</span>
      </header>
      <div className="price-controls">
        <input
          type="range"
          min={MIN_PRICE}
          max={MAX_PRICE}
          step={0.01}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label="ADA price in USD"
        />
        <input
          className="price-input"
          type="number"
          min={MIN_PRICE}
          max={MAX_PRICE}
          step={0.01}
          value={value.toFixed(2)}
          onChange={(event) => handleInputChange(event.target.value)}
        />
      </div>
    </section>
  );
}
