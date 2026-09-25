import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

// Create a public client for ENS resolution on Ethereum mainnet
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
})

/**
 * Fetches the ENS name for a given Ethereum address
 * @param address - The Ethereum address to resolve
 * @returns The ENS name if found, otherwise null
 */
export async function getEnsName(address: string): Promise<string | null> {
  try {
    if (!address || !address.startsWith('0x')) {
      return null
    }

    // Resolve the address to an ENS name
    const ensName = await publicClient.getEnsName({
      address: address as `0x${string}`,
    })

    return ensName
  } catch (error) {
    console.error('Error fetching ENS name:', error)
    return null
  }
}

/**
 * Fetches the ENS avatar for a given ENS name
 * @param ensName - The ENS name to get the avatar for
 * @returns The avatar URL if found, otherwise null
 */
export async function getEnsAvatar(ensName: string): Promise<string | null> {
  try {
    if (!ensName) {
      return null
    }

    const avatar = await publicClient.getEnsAvatar({
      name: ensName,
    })

    return avatar
  } catch (error) {
    console.error('Error fetching ENS avatar:', error)
    return null
  }
}

/**
 * Hook-like function to fetch both ENS name and avatar
 * @param address - The Ethereum address to resolve
 * @returns Object containing ENS name and avatar URL
 */
export async function getEnsData(address: string): Promise<{
  name: string | null
  avatar: string | null
}> {
  try {
    const name = await getEnsName(address)

    if (name) {
      const avatar = await getEnsAvatar(name)
      return { name, avatar }
    }

    return { name: null, avatar: null }
  } catch (error) {
    console.error('Error fetching ENS data:', error)
    return { name: null, avatar: null }
  }
}
