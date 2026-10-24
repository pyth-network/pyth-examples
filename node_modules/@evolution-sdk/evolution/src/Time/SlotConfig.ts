import type * as Network from "../Network.js"

/**
 * Slot configuration for a Cardano network.
 * Defines the relationship between slots and Unix time.
 *
 * @category Time
 * @since 2.0.0
 */
export interface SlotConfig {
  /**
   * Unix timestamp (in milliseconds) of the network start (Shelley era).
   */
  readonly zeroTime: bigint

  /**
   * First slot number of the Shelley era.
   */
  readonly zeroSlot: bigint

  /**
   * Duration of each slot in milliseconds (typically 1000ms = 1 second).
   */
  readonly slotLength: number
}

/**
 * Network-specific slot configurations for all Cardano networks.
 *
 * - **Mainnet**: Production network starting at Shelley era
 * - **Preview**: Preview testnet for protocol updates
 * - **Preprod**: Pre-production testnet
 * - **Custom**: Customizable for emulator/devnet (initialized with zeros)
 *
 * @category Time
 * @since 2.0.0
 */
export const SLOT_CONFIG_NETWORK: Record<Network.Network, SlotConfig> = {
  Mainnet: {
    zeroTime: 1596059091000n, // Shelley era start
    zeroSlot: 4492800n,
    slotLength: 1000
  },
  Preview: {
    zeroTime: 1666656000000n,
    zeroSlot: 0n,
    slotLength: 1000
  },
  Preprod: {
    zeroTime: 1654041600000n + 1728000000n, // 1655769600000n
    zeroSlot: 86400n,
    slotLength: 1000
  },
  Custom: {
    zeroTime: 0n,
    zeroSlot: 0n,
    slotLength: 0
  }
}

/**
 * Get slot configuration for a network.
 *
 * @param network - The network to get configuration for
 * @returns Slot configuration for the network
 *
 * @category Time
 * @since 2.0.0
 */
export const getSlotConfig = (network: Network.Network): SlotConfig => SLOT_CONFIG_NETWORK[network]
