import { HexString } from "../types/hex-string"

export const shortenAddress = (hex: HexString): string => {
  if (hex.length < 10) {
    return hex
  }

  const start = hex.slice(0, 5)
  const end = hex.slice(-3)

  return `${start}...${end}`
}
