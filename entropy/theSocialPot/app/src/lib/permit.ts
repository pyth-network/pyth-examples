import { type Address, type Hash, getAddress, type TypedDataDomain } from "viem"
import { getPublicClient } from "./viem-client"

/**
 * EIP-2612 Permit type definition
 */
const PERMIT_TYPES = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const

/**
 * Get the domain separator for EIP-2612 permit
 * For USDC on Base Sepolia, we need to read the actual domain from the contract
 */
async function getPermitDomain(
  tokenAddress: Address,
  chainId: number
): Promise<TypedDataDomain> {
  const publicClient = getPublicClient()
  
  try {
    // Try to read DOMAIN_SEPARATOR from contract (EIP-2612 standard)
    const domainSeparator = await publicClient.readContract({
      address: tokenAddress,
      abi: [
        {
          inputs: [],
          name: "DOMAIN_SEPARATOR",
          outputs: [{ name: "", type: "bytes32" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "DOMAIN_SEPARATOR",
    })
    
    // If we can read it, we can construct the domain
    // For USDC, we'll use standard values
    return {
      name: "USD Coin",
      version: "2",
      chainId,
      verifyingContract: tokenAddress,
    }
  } catch {
    // Fallback to standard USDC domain
    return {
      name: "USD Coin",
      version: "2",
      chainId,
      verifyingContract: tokenAddress,
    }
  }
}

/**
 * Get the nonce for permit
 */
async function getPermitNonce(
  tokenAddress: Address,
  owner: Address
): Promise<bigint> {
  const publicClient = getPublicClient()
  
  try {
    // Try to read nonces function (EIP-2612 standard)
    const nonce = await publicClient.readContract({
      address: tokenAddress,
      abi: [
        {
          inputs: [{ name: "owner", type: "address" }],
          name: "nonces",
          outputs: [{ name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "nonces",
      args: [owner],
    })
    return nonce as bigint
  } catch (error) {
    console.warn("Could not read nonces, token may not support permit:", error)
    throw new Error("Token does not support permit (nonces function not found)")
  }
}

/**
 * Generate permit signature for ERC20 token (EIP-2612)
 * @param tokenAddress Address of the ERC20 token
 * @param owner Address of the token owner
 * @param spender Address of the spender (lottery contract)
 * @param value Amount to approve
 * @param deadline Deadline for the permit (Unix timestamp)
 * @param chainId Chain ID
 * @returns Signature components (v, r, s)
 * @dev This function uses window.ethereum.request to sign the permit message
 */
export async function signPermit(
  tokenAddress: Address,
  owner: Address,
  spender: Address,
  value: bigint,
  deadline: bigint,
  chainId: number
): Promise<{ v: number; r: Hash; s: Hash }> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("Wallet not connected")
  }

  // Get nonce
  const nonce = await getPermitNonce(tokenAddress, owner)

  // Get domain
  const domain = await getPermitDomain(tokenAddress, chainId)

  // Prepare the message to sign
  const message = {
    owner,
    spender,
    value,
    nonce,
    deadline,
  }

  console.log("Signing permit with domain:", domain)
  console.log("Signing permit with message:", message)
  
  // Sign using ethereum.request (EIP-712)
  let signature
  try {
    signature = await (window as any).ethereum.request({
      method: "eth_signTypedData_v4",
      params: [
        owner,
        {
          domain,
          types: PERMIT_TYPES,
          primaryType: "Permit",
          message,
        },
      ],
    })
    console.log("Permit signature received:", signature)
  } catch (signError: any) {
    console.error("Error during eth_signTypedData_v4:", signError)
    throw new Error(`Failed to sign permit: ${signError?.message || JSON.stringify(signError)}`)
  }

  // Parse signature (v, r, s)
  // Signature is 65 bytes: r (32) + s (32) + v (1)
  // Remove 0x prefix
  const sigHex = signature.slice(2)
  const r = (`0x${sigHex.slice(0, 64)}` as Hash)
  const s = (`0x${sigHex.slice(64, 128)}` as Hash)
  const v = parseInt(sigHex.slice(128, 130), 16)

  return { v, r, s }
}

/**
 * Check if token supports permit (EIP-2612)
 * @param tokenAddress Address of the token
 * @param ownerAddress Address of the owner (to check nonces)
 */
export async function checkPermitSupport(
  tokenAddress: Address,
  ownerAddress?: Address
): Promise<boolean> {
  const publicClient = await import("./viem-client").then((m) => m.getPublicClient())
  
  try {
    // First check if DOMAIN_SEPARATOR exists (EIP-2612 standard)
    try {
      await publicClient.readContract({
        address: tokenAddress,
        abi: [
          {
            inputs: [],
            name: "DOMAIN_SEPARATOR",
            outputs: [{ name: "", type: "bytes32" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        functionName: "DOMAIN_SEPARATOR",
      })
    } catch {
      // DOMAIN_SEPARATOR not found, token likely doesn't support permit
      return false
    }

    // If owner address provided, also check nonces function
    if (ownerAddress) {
      try {
        await publicClient.readContract({
          address: tokenAddress,
          abi: [
            {
              inputs: [{ name: "owner", type: "address" }],
              name: "nonces",
              outputs: [{ name: "", type: "uint256" }],
              stateMutability: "view",
              type: "function",
            },
          ],
          functionName: "nonces",
          args: [ownerAddress],
        })
      } catch {
        // nonces function not found or failed
        return false
      }
    }

    return true
  } catch {
    return false
  }
}

