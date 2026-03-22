const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
});

export function formatUsd(value: number): string {
  return usdFormatter.format(value);
}

export function formatAda(value: number): string {
  return `${numberFormatter.format(value)} ADA`;
}

export function formatAdaUsd(value: number): string {
  return `${usdFormatter.format(value)} / ADA`;
}

export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}
