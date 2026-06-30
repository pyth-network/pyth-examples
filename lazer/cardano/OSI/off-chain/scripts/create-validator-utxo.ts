import { Address, InlineDatum } from "@evolution-sdk/evolution";

import { formatTxHash, loadRuntimeFromEnv, makeLovelace } from "../e2e.ts";
import {
  makeEmptyOsiDatum,
  makeOsiDatumData,
  makeVerificationKeyCredential,
} from "../osi.ts";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
} as const;

const runtime = await loadRuntimeFromEnv();
const walletAddress = await runtime.client.address();
const validatorAddressBech32 = Address.toBech32(runtime.validator.address);
const defaultDeadline = BigInt(Date.now()) + 24n * 60n * 60n * 1000n;
const datum = makeEmptyOsiDatum(defaultDeadline);
const payees: readonly [string, bigint][] = [
  ["c0359ebb7d0688d79064bd118c99c8b87b5853e3af59245bb97e84d2", 10_000_000n],
  ["3f7fc2419347ac70cb5fbcdf3bb8d964727ec1c3e93b364288c22f33", 10_000_000n],
  ["28f60a6dcb45d06f76081888b6b749dc8829dcfb5e11596b3775220a", 10_000_000n],
  ["5133ea0bdd0b0d7a3461146d5e777e8b2c013929d956032d6d6e91b4", 10_000_000n],
  ["05231a2548dc81a3654e857b657960ac892c9e059af3ac4a3ed1d494", 10_000_000n],
];
for (const [pubKey, amount] of payees) {
  const credential = makeVerificationKeyCredential(pubKey);
  datum.payees.set(credential, amount);
}
const txHash = await runtime.client
  .newTx()
  .payToAddress({
    address: runtime.validator.address,
    assets: makeLovelace(runtime.fundingLovelace),
    datum: new InlineDatum.InlineDatum({
      data: makeOsiDatumData(datum),
    }),
  })
  .build()
  .then((built) => built.sign())
  .then((signed) => signed.submit());

const createdTxHash = formatTxHash(txHash);

console.log("");
console.log(`${ANSI.bold}${ANSI.green}🆕💰 OSI CREATED${ANSI.reset}`);
console.log(
  `${ANSI.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${ANSI.reset}`,
);
console.log(`${ANSI.cyan}🔗 Tx hash${ANSI.reset}      ${ANSI.bold}${createdTxHash}${ANSI.reset}`);
console.log(`${ANSI.cyan}👛 Wallet${ANSI.reset}       ${Address.toBech32(walletAddress)}`);
console.log(`${ANSI.cyan}🏛️  Validator${ANSI.reset}    ${validatorAddressBech32}`);
console.log(`${ANSI.cyan}💵 Funded${ANSI.reset}       ${formatLovelace(runtime.fundingLovelace)}`);
console.log(`${ANSI.cyan}⏰ Deadline${ANSI.reset}     ${datum.deadline.toString()}`);
console.log(`${ANSI.cyan}👥 Payees${ANSI.reset}       ${payees.length.toString()}`);
console.log("");
console.log(`${ANSI.bold}${ANSI.yellow}🚀 Next${ANSI.reset}`);
console.log(`bun run spend-validator-utxo ${createdTxHash}`);
console.log(
  `${ANSI.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${ANSI.reset}`,
);

function formatLovelace(value: bigint): string {
  const adaWhole = value / 1_000_000n;
  const adaFraction = value % 1_000_000n;

  return `${value.toLocaleString()} lovelace (${adaWhole.toLocaleString()}.${adaFraction
    .toString()
    .padStart(6, "0")} ADA)`;
}
