import { buildPrimaryLiveFeedRequest, PythLiveCollector } from "../index.js";

const collector = await PythLiveCollector.create();
const request = buildPrimaryLiveFeedRequest();
const result = await collector.fetchAndPublish(request);

console.log(
  JSON.stringify(
    {
      feed: {
        assetId: request.assetId,
        feedId: request.feedId,
        symbol: request.symbol,
        resolvedPriceFeedId: result.resolvedPriceFeedId,
      },
      snapshot: result.snapshot,
      witness: {
        pythPolicyId: result.witness.pythPolicyId,
        pythStateReference: result.witness.pythStateReference,
        signedUpdateHexLength: result.witness.signedUpdateHex.length,
      },
    },
    null,
    2,
  ),
);
