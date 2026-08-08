export const formatPrice = (price, precision = 2) => {
  if (!price) return "0.00";
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(price);
};

export const formatVolume = (vol) => {
  if (vol >= 1000000) return (vol / 1000000).toFixed(2) + 'M';
  if (vol >= 1000) return (vol / 1000).toFixed(1) + 'K';
  return vol.toFixed(2);
};