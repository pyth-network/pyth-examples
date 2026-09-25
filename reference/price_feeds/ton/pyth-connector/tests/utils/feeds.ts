import { Buffer } from "buffer";

export function bigintToBuffer(value: bigint, size: number): Buffer {
    if (value < 0n) {
        throw new Error('Only non-negative bigint is supported');
    }
    // it's questionable whether it stores in LE or BE
    // and what option will TVM use, now by default it's BE
    const hex = value.toString(16);
    const padded = hex.padStart(size * 2, '0');
    return Buffer.from(padded, 'hex');
}

export const packConnectedFeeds = (evaa_id: bigint, reffered_id: bigint) => {
    return Buffer.concat([bigintToBuffer(evaa_id, 32), bigintToBuffer(reffered_id, 32)]);
}
