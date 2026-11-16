import { HydraHandler } from "./offchain/hydra/handler.js";
import { HydraProvider } from "./offchain/hydra/provider.js";
import type { Market } from "./types.js";
import { CML, Lucid, Data, validatorToAddress, credentialToRewardAddress } from '@lucid-evolution/lucid'
import fs from 'fs'
import path from 'path'
import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";
import assert from "assert";

export const MARKET_DURATION_MS = 5 * 60 * 1000; // 5 minutes


assert(process.env.PYTH_STATE_ASSET_UNIT)
assert(process.env.HYDRA_NODE_PRIVATE_KEY)
assert(process.env.CONTROL_TOKEN_POLICY_ID)

const PYTH_STATE_ASSET_UNIT = process.env.PYTH_STATE_ASSET_UNIT;
const HYDRA_NODE_PRIVATE_KEY = process.env.HYDRA_NODE_PRIVATE_KEY;
const CONTROL_TOKEN_POLICY_ID = process.env.CONTROL_TOKEN_POLICY_ID;
const BTC_PRICE_FEED = 1;

export async function createMarket(strikePrice: number): Promise<Market> {
  // TODO: change to env var
  const HYDRA_NODE_URL = "ws://localhost:4011"
  const handler = new HydraHandler(HYDRA_NODE_URL)
  const provider = new HydraProvider(handler)
  // TODO: setup testnet id
  const lucid = await Lucid(provider, "Preprod")

  // TODO: change to env var
  const pythStateUtxo = await lucid.utxoByUnit(PYTH_STATE_ASSET_UNIT)
  console.log("pythStateUtxo:", pythStateUtxo)
  // TODO: parse pyth state datum to get withdraw script field
  const pythStateDatum = Data.from<PythStateDatum>(pythStateUtxo.datum ?? "", PythStateDatum)


  // connect "admin" wallet: hydra credentials wallet

  const sk = Buffer.from(HYDRA_NODE_PRIVATE_KEY, 'hex')
  const privateKey = CML.PrivateKey.from_normal_bytes(sk.subarray(2))
  lucid.selectWallet.fromPrivateKey(privateKey.to_bech32())
  console.log(await lucid.wallet().getUtxos())
  const [seedUtxo,] = await lucid.wallet().getUtxos()

  // TODO: get market script address
  // instantiate market script (with timestamp parameter)
  const marketScriptAddress = await lucid.wallet().address()

  const lazer = await PythLazerClient.create({ token: process.env.PYTH_ACCESS_TOKEN ?? "", webSocketPoolConfig: {} });

  const latestPrice = await lazer.getLatestPrice({
    channel: "fixed_rate@200ms",
    formats: ["solana"],
    jsonBinaryEncoding: "hex",
    priceFeedIds: [BTC_PRICE_FEED],
    properties: ["price", "exponent", "feedUpdateTimestamp"],
  });

  if (!latestPrice.solana?.data) {
    throw new Error("Missing update payload");
  }

  // const update = Data.fromJson(`0x${latestPrice.solana.data}`)
  // console.log("latestPrice:", latestPrice)
  // console.log("update:", update)
  //
  const maybeParsedPrice = latestPrice.parsed?.priceFeeds?.at(0);
  assert(maybeParsedPrice, "Could not find latest price for feed",);
  const price = maybeParsedPrice.price;
  const exponent = maybeParsedPrice.exponent;

  assert(price && exponent, "Price not found");


  const rawSignature = [latestPrice.solana.data]
  const update = Data.to(rawSignature as any, Data.Array(Data.Bytes()))
  console.log("pythStateDatum.withdraw_script", pythStateDatum.withdraw_script)


  // TODO: get control token policy, form plutus json ??
  const controlTokenAsset = `${CONTROL_TOKEN_POLICY_ID}${seedUtxo.txHash}`


  const marketInlineDatum = Data.to<MarketDatum>({
    startPrice: {
      numerator: BigInt(price),
      denominator: BigInt((10 ** exponent).toFixed(0)),
    },
    endPrice: null,
    remainingShares: 0n,
  }, MarketDatum)

  const now = Date.now();
  const tx = await lucid
    .newTx()
    .readFrom([pythStateUtxo])
    .collectFrom([seedUtxo])
    .mintAssets({ [controlTokenAsset]: 1n }, Data.void())
    .attach.Script({ type: "PlutusV3", script: "46450101002499" })
    .pay.ToContract(marketScriptAddress, { kind: "inline", value: marketInlineDatum }, { [controlTokenAsset]: 1n })
    .withdraw(
      credentialToRewardAddress("Preprod", { type: "Script", hash: pythStateDatum.withdraw_script }),
      0n,
      update
    )
    .attach.WithdrawalValidator({ type: "PlutusV3", script: "590ab60101003229800aba4aba2aba1aba0aab9faab9eaab9dab9a9bae002488888888966002646465300130063754003370e90014dc3a4001300a0039805001244444b30013370e9003002c4c8c966002600c601a6ea800e2b3001300e3754007159800980298069baa301130120028a518b20188b201e8b2018375a602000260186ea801a264b300130010068cc004c040c034dd5003cdd6001488c8cc00400400c88cc00c004c0080092223300100222598008014660024602c602e602e0032301630170019ba54800244b3001300b30133754005132323259800980d80144c8c9660026020003159800980c9baa00280345901a456600260220031323259800980f80140222c80e0dd6980e800980c9baa0028acc004c0340062b3001301937540050068b20348b202e405c80b8c05cdd5000980d001c59018192cc004c05c0062b3001337129002180b000c5a2601e602c00280aa2c80c0dd5180c800980c800980a1baa0028b202448888cc8966002601e602e6ea800a2646464646644b300130220038992cc004c058c078dd5000c4c8c8c8ca60026eb4c0980066eb8c0980126eb4c09800e6eb8c0980092222598009815802c4cc060dd59815007112cc00400a26603401844b30010028acc004c08cc0a8dd500f44cc88cc89660026644b30013371e6eb8c0d0c0d4c0d4c0d4c0c4dd500d800c528c4c8cc004004dd5981018191baa01c2259800800c528456600264b30013371e6eb8c0d000401226600e606600200b14a08190c0d80062946266004004606e0028189034205e3001302f375404a6eb8c0c8c0bcdd501144c9289919800800811112cc00400629344c8cc89263259800cc004dd7181018199baa0019bae302130333754003375c606c60666ea800572a8acc004c8c966002605a60686ea800629422605a60686ea8c0e0c0d4dd5000a06632598009816981a1baa0018a60103d87a8000898109981bcc004cc020c0e0c0d4dd50009803981a9baa02ba6103d87a8000a60103d879800040cc97ae040cc64660020026eacc088c0d4dd500f912cc004006298103d87a80008992cc004cdc78021bae3036001898119981c981b800a5eb82266006006607600481a8c0e40050371bae30203033375400310018b20628b2062325980099b8f48900375c606c606e003130360018b2062323235980099b8f375c606e00291104b9011a82008919191919191919911981f98149981f98200039981f9ba90013303f30400024bd701981f9820182080125eb80d6600266e252000001892cc004cdc48011b8d00189981f1ba93300a0020013303e3753300100299b81371a0020050015c612f5c11640e91640e46eb8c0f8c0fc008dd7181f0021bad303d001323303c375066f29281bae303d0013303c303d303e0014bd702cc004cdc4a40086e340062660766ea4cc01d20040013303b375330014801266e00dc6800a40070015c612f5c11640dc6eb8c0ecc0f0004d6600294624b30013371290201b8d00189981d1ba93300648100004cc0e8dd4cc005204099b80371a002901fc0057184bd704590364590351bae303a303b001300100259800a51892cc004cdc4a4100026e340062660706ea4cc0112080010013303837533001482000666e00dc6800a40ff0015c612f5c11640d11640cd1640c86eb8c0dcc0e00056600266e252008371a00513303537526600290040011981a9ba99800a4011337006e3400920078012e3097ae08b20623718900019801801981b0011bae303400140c91640b444b300130040018a518acc004c01000a29422b3001980099baf9800981918179baa002981918179baa001919192cc004c0a8c0c4dd5181a981b00144006264b3001302b001899ba548008cc0d4dd419b80375a606c60666ea800920024bd704566002605400310028801206240c460626ea8005030181a00098181baa001400c98103d87b8000a50a5140b51980099baf9800980e18179baa002980e18179baa001919192cc004c0a8c0c4dd5181a981b00144006264b3001302b001899ba548008cc0d4dd419b80375a606c60666ea800920014bd704566002605400310028801206240c460626ea8005030181a00098181baa001400c98103d8798000a50a5140b514a0816902d205a2303130323032303230323032303230320012323232332259800981400145284566002604a0051980099baf30343031375400298103d87b8000a50a5140bd13233225980098158014528c566002605800513322598009817181a9baa30233036375400d13371000400313371200400281a0dd6981b981a1baa00359800981618199baa30213034375400f1001899b80001480090324528206440c860626ea8004dd6981a98191baa004303430313754002817902f18171baa001303230330033031302e3754002606000260586ea8004888c8cc89660026050005159800981418181baa0018a60103d87a80008a6103d879800040bd15980098128014566002604a60606ea80062980103d87a80008a6103d87b800040bd13322598009815000c530103d87b80008acc004c0ac006264b30013371000600314c0103d87980008acc004cdc4000801c530103d87b80008a6103d87a800040c88190dd6981b18199baa0038a6103d879800040c48188dd6981a18189baa00330303754002817902f18171baa001300200330010038b2052899191980b18160010980198188021bae302c001302e00240b11323233014302b00213003302f004375c6052002605800481522c8140604c002604a0026048002603e6ea80062c80e8c08401a2c80f8dd7180f8009bab301f002301f001301e001301d0013018375400516405864b3001300e301637540031301a3017375400316405464660020026eb0c010c05cdd5006912cc004006298103d87a80008992cc006600266ebc00530103d87a8000a50a51405d1001899801801980e801202e325980099912cc00400a294226530013259800980a180e1baa00189bad301d302037566040603a6ea8006290002036301f0019baf301f30200019bab003488966002003159800980100344cc01400d20008a5040751325980099baf301f0014c010140008acc004cc018010dd6981018119bab3020001898019ba630240028a5040791598009980300224001130030078a50407880f0c0880050200ca60020033756601260386ea8c024c070dd5002488cc080008cc080dd3000a5eb810011112cc00400a26600298103d87a80004bd6f7b63044ca60026eb8c0780066eacc07c00660460069112cc004cdc8a441000038acc004cdc7a441000038998029807198121ba60024bd70000c4cc015300103d87a8000006408119800803c006446600e0046604c66ec0dd48029ba6004001401c8100604200480fa2942294229410201ba63301b337606ea4058dd31980d99bb0301c3019375498118d8799f4a507974682053746174654850797468204f7073ff004c010101004bd6f7b63025eb7bdb1808928c566002602260306ea8c070c064dd5180e180c9baa300630193754003132598009807180c9baa001898031980e180e980d1baa0014bd704590181803980c9baa30063019375400316405d14c103d87a8000405c603600280c88966002601e602e6ea800a2646464b3001301f002899803180f00189980300080245901c180e800980e800980c1baa0028b202c44c8c008c05c00cdd7180a801202645900b1b874801100a0c024c028004c024004c010dd5005452689b2b20042611e581cd799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e60001" })
    .validFrom(now - 60_000)
    .validTo(now + 60_000)
    .complete()

  console.log(tx.toJSON())



  return {
    id: crypto.randomUUID(),
    startTime: now,
    endTime: now + MARKET_DURATION_MS,
    strikePrice,
  };
}

/**
 * Load user's public key from credentials file
 * TODO there's a better way to do this?
 */
export function loadHydraCredentialsPublicKey(): string {
  console.log("loadHydraCredentialsPublicKey cwd:", process.cwd())
  const vkPath = path.join(process.cwd(), '../infra/credentials', 'hydra-funds.sk')
  const vk = JSON.parse(fs.readFileSync(vkPath, 'utf8'))
  const vkBytes = Buffer.from("5820245120cdf333f8ea69114a2b3f05bcbc0d5c8e8486ca94c020623d5cca822e04", 'hex')
  const publicKey = CML.PublicKey.from_bytes(vkBytes.subarray(2))
  return publicKey.to_bech32()
}

// Minimal schema matching the on-chain Pyth state datum layout.
// Only the `withdraw_script` field is used; the preceding fields
// are defined to keep positional alignment with the Plutus struct.
// biome-ignore assist/source/useSortedKeys: order-sensistive


const PythStateDatumSchema = Data.Object({
  governance: Data.Object({
    wormhole: Data.Bytes(),
    emitter_chain: Data.Integer(),
    emitter_address: Data.Bytes(),
    seen_sequence: Data.Integer(),
  }),
  trusted_signers: Data.Map(Data.Any(), Data.Any()),
  deprecated_withdraw_scripts: Data.Map(Data.Any(), Data.Any()),
  withdraw_script: Data.Bytes(),
});
type PythStateDatum = Data.Static<typeof PythStateDatumSchema>;
const PythStateDatum = PythStateDatumSchema as unknown as PythStateDatum


const MarketDatumSchema = Data.Object({
  startPrice: Data.Object({
    numerator: Data.Integer(),
    denominator: Data.Integer(),
  }),
  endPrice: Data.Nullable(
    Data.Object({
      numerator: Data.Integer(),
      denominator: Data.Integer(),
    })
  ),
  remainingShares: Data.Integer(),
});
type MarketDatum = Data.Static<typeof MarketDatumSchema>;
const MarketDatum = MarketDatumSchema as unknown as MarketDatum
