import {
  priceFeedIdDoge,
  priceFeedIdEth,
  priceFeedIdSol,
  priceFeedIdXrp,
} from "./price-feeds.js";

export const predictions: { creatorFid: bigint; priceFeedId: `0x${string}` }[] =
  [
    { creatorFid: BigInt(193), priceFeedId: priceFeedIdEth },
    { creatorFid: BigInt(7479), priceFeedId: priceFeedIdSol },
    { creatorFid: BigInt(409644), priceFeedId: priceFeedIdXrp },
    { creatorFid: BigInt(217248), priceFeedId: priceFeedIdDoge },
  ];
