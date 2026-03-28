type PriceListener = (price: number) => void;

const listeners = new Set<PriceListener>();

let currentPrice = 0.26;
let intervalId: ReturnType<typeof setInterval> | null = null;

const startSimulation = () => {
  if (intervalId) return;

  intervalId = setInterval(() => {
    const volatility = 0.003;
    const drift = (Math.random() - 0.5) * 2;
    const change = currentPrice * volatility * drift;
    currentPrice = Math.max(0.20, Math.min(0.35, currentPrice + change));
    listeners.forEach(fn => fn(currentPrice));
  }, 1500);
};

const stopSimulation = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};

export const subscribe = (fn: PriceListener) => {
  listeners.add(fn);
  startSimulation();
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) stopSimulation();
  };
};

export const getPrice = () => currentPrice;

// ✅ Historial con timestamps Unix únicos en segundos
const MAX_HISTORY = 50;
const priceHistory: { time: number; value: number }[] = [];

// Seed inicial: 10 puntos separados por 1.5s cada uno
const nowSec = Math.floor(Date.now() / 1000);
for (let i = 9; i >= 0; i--) {
  priceHistory.push({
    time: nowSec - i * 2, // separados por 2 segundos
    value: +(0.24 + Math.random() * 0.04).toFixed(4),
  });
}

export const getPriceHistory = () => [...priceHistory];

export const subscribeWithHistory = (fn: PriceListener) => {
  const unsub = subscribe((price) => {
    // ✅ Timestamp único garantizado: siempre mayor al anterior
    const lastTime = priceHistory[priceHistory.length - 1]?.time ?? 0;
    const newTime = Math.max(Math.floor(Date.now() / 1000), lastTime + 1);

    priceHistory.push({ time: newTime, value: +price.toFixed(4) });

    if (priceHistory.length > MAX_HISTORY) priceHistory.shift();

    fn(price);
  });

  return unsub;
};