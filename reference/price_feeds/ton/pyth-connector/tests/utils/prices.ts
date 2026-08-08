import {Cell, Dictionary} from "@ton/core";
import {Maybe} from "@ton/core/dist/utils/maybe";
import {beginCell} from "@ton/ton";
import {
    INTERNAL_BUX_PRICE_FEED_ID,
    INTERNAL_STTON_PRICE_FEED_ID,
    INTERNAL_TON_PRICE_FEED_ID,
    INTERNAL_TSTON_PRICE_FEED_ID,
    INTERNAL_USDC_PRICE_FEED_ID,
    INTERNAL_USDT_PRICE_FEED_ID, INTERNAL_WTON_PRICE_FEED_ID, PYTH_BUX_PRICE_FEED_ID,
    PYTH_STTON_PRICE_FEED_ID,
    PYTH_TON_PRICE_FEED_ID,
    PYTH_TSTON_PRICE_FEED_ID,
    PYTH_USDC_PRICE_FEED_ID,
    PYTH_USDT_PRICE_FEED_ID, PYTH_WTON_PRICE_FEED_ID
} from "./assets";

export type PythPrice = {
    priceId: bigint,    // pyth price feed
    price: bigint,      // price value
    digits: number,     // decimals
    publishTime: number // publish time timestamp
};

export function packPriceCell(price: PythPrice, nextCell: Maybe<Cell>) {
    const conf = price.priceId % 65536n;
    // console.log('current price: ', price);
    const builder = beginCell()
        .storeUint(price.priceId, 256)
        .storeInt(price.price, 64)
        .storeUint(conf, 64)
        .storeInt(-price.digits, 32)         // we receive e.g. 8, but need to store -8
        .storeUint(price.publishTime, 64)
        .storeUint(price.publishTime, 64)    // prev publish time (fake)
        .storeInt(price.price, 64)           // ema price (fake)
        .storeInt(conf + 1n, 64)        // ema conf (fake)

    if (nextCell) {
        builder.storeRef(nextCell);
    }

    return builder.endCell();
}

export type PythAssetInfo = {
    pythFeedId: string, // pyth feed id of asset
    decimals: number,   // original evaa asset decimals
    digits: number,     // pyth feed asset decimals
    conf: number        // some identifier related to pyth price feed object
};

const PYTH_ASSET_CONFIG_MAP = new Map<string, PythAssetInfo>()
    .set('TON', {pythFeedId: PYTH_TON_PRICE_FEED_ID, decimals: 9, digits: 8, conf: 12345})
    .set('USDC', {pythFeedId: PYTH_USDC_PRICE_FEED_ID, decimals: 6, digits: 8, conf: 12346})
    .set('USDT', {pythFeedId: PYTH_USDT_PRICE_FEED_ID, decimals: 6, digits: 10, conf: 12347})
    .set('TSTON', {pythFeedId: PYTH_TSTON_PRICE_FEED_ID, decimals: 9, digits: 8, conf: 12348})
    .set('STTON', {pythFeedId: PYTH_STTON_PRICE_FEED_ID, decimals: 9, digits: 8, conf: 12349})
    .set('WTON', {pythFeedId: PYTH_WTON_PRICE_FEED_ID, decimals: 9, digits: 8, conf: 12350})
    .set('BUX', {pythFeedId: PYTH_BUX_PRICE_FEED_ID, decimals: 6, digits: 10, conf: 12351});

const EVAA_ASSETS_MAP = new Map<string, bigint>()
    .set('TON', INTERNAL_TON_PRICE_FEED_ID)
    .set('USDC', INTERNAL_USDC_PRICE_FEED_ID)
    .set('USDT', INTERNAL_USDT_PRICE_FEED_ID)
    .set('TSTON', INTERNAL_TSTON_PRICE_FEED_ID)
    .set('STTON', INTERNAL_STTON_PRICE_FEED_ID)
    .set('WTON', INTERNAL_WTON_PRICE_FEED_ID)
    .set('BUX', INTERNAL_BUX_PRICE_FEED_ID);

function makePrice(assetName: string, assetPrice: bigint, timestampGetter: () => number) {
    const timestamp = timestampGetter();
    if (!PYTH_ASSET_CONFIG_MAP.has(assetName)) {
        throw new Error(`No feed config for asset: ${assetName}`);
    }

    const feedConfig = PYTH_ASSET_CONFIG_MAP.get(assetName)!;
    const price = assetPrice; // * (10n ** BigInt(feedConfig.decimals)) / (10n ** BigInt(feedConfig.digits));

    return {
        priceId: BigInt(feedConfig.pythFeedId),
        price,
        digits: feedConfig.digits,
        publishTime: timestamp,
    } as PythPrice;
}

export function collectPriceFeeds(pricesObject: Object) {
    const feeds: string[] = [];

    const entries = Object.entries(pricesObject);
    for (const [k, v] of entries) {
        if (!PYTH_ASSET_CONFIG_MAP.has(k)) {
            throw new Error(`No feed config for asset: ${k}`);
        }
        feeds.push(PYTH_ASSET_CONFIG_MAP.get(k)?.pythFeedId!);
    }
    return feeds;
}

export function makePricesDict(pricesObject: Object, pricePrecisionMultiplier: number): Dictionary<bigint, bigint>  {
    const dict = Dictionary.empty<bigint, bigint>();
    const entries = Object.entries(pricesObject);
    for (const [k, v] of entries) {
        if (!PYTH_ASSET_CONFIG_MAP.has(k)) {
            throw new Error(`No feed config for asset: ${k}`);
        }

        const cfg = PYTH_ASSET_CONFIG_MAP.get(k)!;
        let value = (typeof v === 'number') ? BigInt(Math.round(v * pricePrecisionMultiplier)) : BigInt(v);
        if (!EVAA_ASSETS_MAP.has(k)) throw new Error(`No evaa_id for asset ${k}`);
        const evaaId = EVAA_ASSETS_MAP.get(k)!;
        // console.warn({k, v, evaaId, value});
        dict.set(evaaId, value);
    }
    return dict;
}

export function makePythPrices(pricesObject: Object, timeGetter: () => number) {
    const pythPrices: PythPrice[] = [];
    const entries = Object.entries(pricesObject);
    for (const [k, v] of entries) {
        if (!PYTH_ASSET_CONFIG_MAP.has(k)) {
            throw new Error(`No feed config for asset: ${k}`);
        }

        const cfg = PYTH_ASSET_CONFIG_MAP.get(k)!;
        let value = (typeof v === 'number') ? BigInt(Math.round(v * 10 ** cfg.digits)) : BigInt(v);
        pythPrices.push(makePrice(k, value, timeGetter));

    }

    return pythPrices;
}

const FEEDS_CONFORMITY = new Map<bigint, string[]>()
    .set(INTERNAL_BUX_PRICE_FEED_ID, [PYTH_BUX_PRICE_FEED_ID, PYTH_USDT_PRICE_FEED_ID])
    .set(INTERNAL_WTON_PRICE_FEED_ID, [PYTH_WTON_PRICE_FEED_ID, PYTH_TON_PRICE_FEED_ID])
    .set(INTERNAL_STTON_PRICE_FEED_ID, [PYTH_STTON_PRICE_FEED_ID, PYTH_TON_PRICE_FEED_ID])
    .set(INTERNAL_TSTON_PRICE_FEED_ID, [PYTH_TSTON_PRICE_FEED_ID, PYTH_TON_PRICE_FEED_ID])
    .set(INTERNAL_USDC_PRICE_FEED_ID, [PYTH_USDC_PRICE_FEED_ID])
    .set(INTERNAL_USDT_PRICE_FEED_ID, [PYTH_USDT_PRICE_FEED_ID])
    .set(INTERNAL_TON_PRICE_FEED_ID, [PYTH_TON_PRICE_FEED_ID]);

/**
 * collects list of pyth feeds required to get specified evaa list of ids
 * @param evaaIds
 */
function collectRequiredPythFeeds(evaaIds: bigint[]): string[] {
    const set = new Set<string>();
    for (const id of evaaIds) {
        if (!FEEDS_CONFORMITY.has(id)) throw new Error(`Evaa id ${id} not found in the map`);
        const feeds = FEEDS_CONFORMITY.get(id)!;
        for (const feed of feeds) {
            set.add(feed);
        }
    }
    return [...set.keys()];
}

export const packPythPrices = (feeds: PythPrice[] | null): Cell => {
    if (!feeds || feeds.length === 0) {
        return beginCell().storeUint(0, 8).endCell();
    }

    const reversedTail = feeds.slice(1).reverse();
    const packedTail = reversedTail.reduce(
        (prev: Cell | null, curr) => {
            const builder = beginCell().storeSlice(packPriceCell(curr, prev).beginParse());
            return builder.endCell();
        }, null
    );
    const firstFeed = feeds[0];
    const builder = beginCell()
        .storeUint(feeds.length, 8)
        .storeSlice(packPriceCell(firstFeed, packedTail).beginParse());


    return builder.endCell();
}

export function packNamedPrices(namedPrices: Object, timeGetter: () => number) {
    const pythPrices = makePythPrices(namedPrices, timeGetter);
    // console.log('pyth prices: ', pythPrices);
    return packPythPrices(pythPrices);
}