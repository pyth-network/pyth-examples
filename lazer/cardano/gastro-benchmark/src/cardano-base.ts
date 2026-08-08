import type { CardanoCapability } from "./types";

export const CARDANO_BASE_CONTEXT: CardanoCapability = {
  cardanoEnabled: true,
  pythCardanoSdkInstalled: true,
  lucidAvailable: false,
  note: "Cardano remains the architectural base. Live commodity comparison currently relies on Pyth Lazer off-chain reads plus Cardano-specific helpers where available.",
};

export function getCardanoCapability(): CardanoCapability {
  return CARDANO_BASE_CONTEXT;
}
