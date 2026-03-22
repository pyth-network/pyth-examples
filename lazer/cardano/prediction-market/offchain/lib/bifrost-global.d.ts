import { CardanoWallet } from "./bifrost-types";

declare global {
    interface Window {
        cardano: Record<string, CardanoWallet>;
    }
}

export { };
