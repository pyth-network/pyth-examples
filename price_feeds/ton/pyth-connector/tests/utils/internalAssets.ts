import sha256 from "crypto-js/sha256";

export function sha256Hash(input: string): bigint {
    const hash = sha256(input);
    const hashHex = hash.toString();
    return BigInt('0x' + hashHex);
}

export const INTERNAL_ASSET_ID = {
    TON:            sha256Hash('TON'),
    USDT:           sha256Hash('USDT'),
    jUSDT:          sha256Hash('jUSDT'),
    jUSDC:          sha256Hash('jUSDC'),
    stTON:          sha256Hash('stTON'),
    tsTON:          sha256Hash('tsTON'),
    uTON:           sha256Hash('uTON'),

    // LP
    TONUSDT_DEDUST: sha256Hash('TONUSDT_DEDUST'),
    TONUSDT_STONFI: sha256Hash('TONUSDT_STONFI'),
    TON_STORM:      sha256Hash('TON_STORM'),
    USDT_STORM:     sha256Hash('USDT_STORM'),

    // ALTS
    NOT:            sha256Hash('NOT'),
    DOGS:           sha256Hash('DOGS'),
    CATI:           sha256Hash('CATI'),
};
