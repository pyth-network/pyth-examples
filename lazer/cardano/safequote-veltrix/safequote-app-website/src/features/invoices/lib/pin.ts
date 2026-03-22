import { blake2b } from "@noble/hashes/blake2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { textToHex } from "@/features/invoices/lib/encoding";

export function normalizePin(pin: string) {
  return pin.trim();
}

export function pinToBytesHex(pin: string) {
  return textToHex(normalizePin(pin));
}

export function hashPin(pin: string) {
  const bytes = new TextEncoder().encode(normalizePin(pin));
  return bytesToHex(blake2b(bytes, { dkLen: 32 }));
}