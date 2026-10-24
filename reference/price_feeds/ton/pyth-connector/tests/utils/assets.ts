import {Dictionary} from "@ton/ton";
import {Buffer} from "buffer";

import {INTERNAL_ASSET_ID as ASSET_ID} from "./internalAssets";
import { packConnectedFeeds } from "./feeds";

export const PYTH_TON_PRICE_FEED_ID = "0x8963217838ab4cf5cadc172203c1f0b763fbaa45f346d8ee50ba994bbcac3026";
export const PYTH_USDT_PRICE_FEED_ID = "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b";
export const PYTH_STTON_PRICE_FEED_ID = "0x9145e059026a4d5a46f3b96408f7e572e33b3257b9c2dbe8dba551c772762002";
export const PYTH_TSTON_PRICE_FEED_ID = "0x3d1784128eeab5961ec60648fe497d3901eebd211b7f51e4bb0db9f024977d25";
export const PYTH_USDC_PRICE_FEED_ID = "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a";

export const PYTH_WTON_PRICE_FEED_ID = "0xff00ff7838ab4cf5cadc172203c1f0b763fbaa45f346d8ee50ba994bbcff00ff";
export const PYTH_BUX_PRICE_FEED_ID = "0xff00ffdc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688ff00ff";

export const INTERNAL_TON_PRICE_FEED_ID = ASSET_ID.TON;
export const INTERNAL_USDT_PRICE_FEED_ID = ASSET_ID.jUSDT;
export const INTERNAL_STTON_PRICE_FEED_ID = ASSET_ID.stTON;
export const INTERNAL_TSTON_PRICE_FEED_ID = ASSET_ID.tsTON;
export const INTERNAL_USDC_PRICE_FEED_ID = ASSET_ID.jUSDC;

export const INTERNAL_WTON_PRICE_FEED_ID = ASSET_ID.TON_STORM;
export const INTERNAL_BUX_PRICE_FEED_ID = ASSET_ID.USDT_STORM;

export const TEST_FEEDS_MAP: Dictionary<bigint, Buffer> = (()=>{
    const map = Dictionary.empty<bigint, Buffer>();
    map.set(BigInt(PYTH_TON_PRICE_FEED_ID), packConnectedFeeds(INTERNAL_TON_PRICE_FEED_ID, 0n));
    map.set(BigInt(PYTH_USDT_PRICE_FEED_ID), packConnectedFeeds(INTERNAL_USDT_PRICE_FEED_ID, 0n));
    map.set(BigInt(PYTH_STTON_PRICE_FEED_ID), packConnectedFeeds(INTERNAL_STTON_PRICE_FEED_ID, BigInt(PYTH_TON_PRICE_FEED_ID)));
    map.set(BigInt(PYTH_TSTON_PRICE_FEED_ID), packConnectedFeeds(INTERNAL_TSTON_PRICE_FEED_ID, BigInt(PYTH_TON_PRICE_FEED_ID)));
    map.set(BigInt(PYTH_USDC_PRICE_FEED_ID), packConnectedFeeds(INTERNAL_USDC_PRICE_FEED_ID, 0n));

    map.set(BigInt(PYTH_WTON_PRICE_FEED_ID), packConnectedFeeds(INTERNAL_WTON_PRICE_FEED_ID, BigInt(PYTH_TON_PRICE_FEED_ID)));
    map.set(BigInt(PYTH_BUX_PRICE_FEED_ID), packConnectedFeeds(INTERNAL_BUX_PRICE_FEED_ID, BigInt(PYTH_USDT_PRICE_FEED_ID)));
    return map;
})();

export const TEST_FEEDS = [
    PYTH_TON_PRICE_FEED_ID,
    PYTH_USDT_PRICE_FEED_ID, PYTH_USDC_PRICE_FEED_ID,
    PYTH_STTON_PRICE_FEED_ID, PYTH_TSTON_PRICE_FEED_ID,
    PYTH_WTON_PRICE_FEED_ID, PYTH_BUX_PRICE_FEED_ID
];

export const TEST_FEED_NAMES = new Map<string, string>()
    .set(PYTH_TON_PRICE_FEED_ID.slice(2), 'TON')
    .set(PYTH_USDT_PRICE_FEED_ID.slice(2), 'USDT')
    .set(PYTH_USDC_PRICE_FEED_ID.slice(2), 'USDC')
    .set(PYTH_STTON_PRICE_FEED_ID.slice(2), 'stTON')
    .set(PYTH_TSTON_PRICE_FEED_ID.slice(2), 'tsTON')
    .set(PYTH_WTON_PRICE_FEED_ID.slice(2), 'wTON')
    .set(PYTH_BUX_PRICE_FEED_ID.slice(2), 'BUX');
