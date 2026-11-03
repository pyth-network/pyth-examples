import {
  fetchLatestSignedUpdate,
  readLazerToken,
} from "../e2e.ts";

const ADA_USD_FEED_ID = 16;
const USDT_USD_FEED_ID = 8;

const lazerToken = readLazerToken();
const update = await fetchLatestSignedUpdate(lazerToken, [
  ADA_USD_FEED_ID,
  USDT_USD_FEED_ID,
]);

console.log(`Queried feed ids: ${ADA_USD_FEED_ID}, ${USDT_USD_FEED_ID}`);
console.log("Signed update hex:");
console.log(update.signedUpdateHex);
console.log("Parsed payload:");
console.dir(update.parsed, { depth: null, colors: true });
