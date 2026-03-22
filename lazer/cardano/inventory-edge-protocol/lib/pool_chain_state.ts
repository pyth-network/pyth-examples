/**
 * Estado del pool derivado solo de la cadena: UTxOs del script `liquidity_pool`
 * + datums de vaults del usuario (deuda y coberturas).
 */
import type { UTxO } from "@evolution-sdk/evolution/UTxO";

import { listPoolDepositsOnChain } from "./pool_onchain.js";
import { listVaultPositions, readInlineDatum } from "./transactions.js";
import { decodeVaultDatum } from "./vault_datum_decode.js";
import { createPreprodSigningClient } from "./evolution_client.js";
import { paymentKeyHashBytes } from "./vault_address.js";

export type PoolReservationRow = {
  nftPolicyHex: string;
  nftNameHex: string;
  payoutLovelace: string;
  vaultRef: string;
};

/** Compatible con la UI / API previa; métricas “históricas” quedan en 0 (no on-chain). */
export type PoolStateFromChain = {
  /** Suma lovelace en script pool (tu owner). */
  poolScriptTotalLovelace: string;
  availableLovelace: string;
  encumberedLovelace: string;
  deployedToLoansLovelace: string;
  totalDepositedLovelace: string;
  totalPaidOutLovelace: string;
  totalRepaidPrincipalLovelace: string;
  profitsFromLoansLovelace: string;
  profitsFromInsuranceLovelace: string;
  reservations: PoolReservationRow[];
  outstandingLoans: Record<string, string>;
};

function requireMnemonic(): string {
  const m = process.env.CARDANO_MNEMONIC?.trim();
  if (!m) throw new Error("Missing CARDANO_MNEMONIC");
  return m;
}

export function nftLoanKey(nftPolicyHex: string, nftNameHex: string): string {
  return `${nftPolicyHex.toLowerCase()}|${nftNameHex.toLowerCase()}`;
}

export async function getPoolStateFromChain(): Promise<PoolStateFromChain> {
  const mnemonic = requireMnemonic();
  const client = createPreprodSigningClient(mnemonic);
  const addr = await client.address();
  const ownerHex = Buffer.from(paymentKeyHashBytes(addr))
    .toString("hex")
    .toLowerCase();

  const poolRows = await listPoolDepositsOnChain();
  let poolTotal = 0n;
  for (const r of poolRows) {
    poolTotal += BigInt(r.lovelace);
  }

  const vaults = await listVaultPositions();
  let deployed = 0n;
  let encumbered = 0n;
  const reservations: PoolReservationRow[] = [];
  const outstandingLoans: Record<string, string> = {};

  for (const row of vaults) {
    const d = row.datum;
    if (d.ownerKeyHashHex.toLowerCase() !== ownerHex) continue;

    deployed += d.debtLovelace;
    if (d.debtLovelace > 0n) {
      const k = nftLoanKey(d.nftPolicyHex, d.nftNameHex);
      const prev = BigInt(outstandingLoans[k] ?? "0");
      outstandingLoans[k] = (prev + d.debtLovelace).toString();
    }
    if (d.hedge.tag === "some") {
      encumbered += d.hedge.payoutLovelace;
      reservations.push({
        nftPolicyHex: d.nftPolicyHex.toLowerCase(),
        nftNameHex: d.nftNameHex.toLowerCase(),
        payoutLovelace: d.hedge.payoutLovelace.toString(),
        vaultRef: row.ref,
      });
    }
  }

  let available = poolTotal - deployed - encumbered;
  if (available < 0n) available = 0n;

  return {
    poolScriptTotalLovelace: poolTotal.toString(),
    availableLovelace: available.toString(),
    encumberedLovelace: encumbered.toString(),
    deployedToLoansLovelace: deployed.toString(),
    totalDepositedLovelace: "0",
    totalPaidOutLovelace: "0",
    totalRepaidPrincipalLovelace: "0",
    profitsFromLoansLovelace: "0",
    profitsFromInsuranceLovelace: "0",
    reservations,
    outstandingLoans,
  };
}

/**
 * Liquidez efectiva para un nuevo payout de hedge: disponible on-chain + payout ya
 * reservado en el datum de esta vault (se reemplaza en la misma tx).
 */
export async function effectiveAvailableForHedgePayout(
  vaultUtxo: UTxO,
): Promise<bigint> {
  const st = await getPoolStateFromChain();
  const base = BigInt(st.availableLovelace);
  const decoded = decodeVaultDatum(readInlineDatum(vaultUtxo));
  const prev =
    decoded.hedge.tag === "some" ? decoded.hedge.payoutLovelace : 0n;
  return base + prev;
}
