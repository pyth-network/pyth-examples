import { beginCell, Cell, Dictionary, SendMode, Transaction } from "@ton/core";
import { Buffer } from "buffer";
import { HermesClient, HexString } from "@pythnetwork/hermes-client";
import { SandboxContract, TreasuryContract } from "@ton/sandbox";
import { JettonMinter } from "@ton-community/assets-sdk";

const GOVERNANCE_MAGIC = 0x5054474d;
const GOVERNANCE_MODULE = 1;
const AUTHORIZE_UPGRADE_CONTRACT_ACTION = 0;
const TARGET_CHAIN_ID = 1;

function computedGeneric(transaction: Transaction) {
    if (transaction.description.type !== "generic")
        throw "Expected generic transactionaction";
    if (transaction.description.computePhase.type !== "vm")
        throw "Compute phase expected";
    return transaction.description.computePhase;
}

export function printTxGasStats(name: string, transaction: Transaction) {
    const txComputed = computedGeneric(transaction);
    console.log(`${name} used ${txComputed.gasUsed} gas`);
    console.log(`${name} gas cost: ${txComputed.gasFees}`);
    return txComputed.gasFees;
}

export function createAuthorizeUpgradePayload(newCodeHash: Buffer): Buffer {
    const payload = Buffer.alloc(8);
    payload.writeUInt32BE(GOVERNANCE_MAGIC, 0);
    payload.writeUInt8(GOVERNANCE_MODULE, 4);
    payload.writeUInt8(AUTHORIZE_UPGRADE_CONTRACT_ACTION, 5);
    payload.writeUInt16BE(TARGET_CHAIN_ID, 6);

    return Buffer.concat([payload, newCodeHash]);
}

export function expectCompareDicts(dict1: Dictionary<bigint, Buffer>, dict2: Dictionary<bigint, Buffer>) {
    const keys1 = dict1.keys();
    const keys2 = dict2.keys();
    expect(keys1.sort()).toEqual(keys2.sort());

    for (const key of keys1) {
        expect(dict1.has(key)).toBe(true);
        expect(dict2.has(key)).toBe(true);
        expect(dict1.get(key)).toEqual(dict2.get(key));
    }
}

export const composeFeedsCell = (feeds: HexString[]): Cell => {
    if (feeds.length === 0) {
        return beginCell().storeUint(0, 8).endCell();
    }

    const reversedTail = feeds.slice(1).reverse();
    const packedTail = reversedTail.reduce(
        (prev: Cell | null, curr) => {
            const builder = beginCell().storeUint(BigInt(curr), 256);
            if (prev !== null) builder.storeRef(prev);
            return builder.endCell();
        }, null
    );
    const firstFeed = feeds[0];
    const builder = beginCell().storeUint(feeds.length, 8).storeUint(BigInt(firstFeed), 256);
    if (packedTail !== null) {
        builder.storeRef(packedTail!);
    }

    return builder.endCell();
}

export async function sendJetton(
    jetton: SandboxContract<JettonMinter>,
    from: SandboxContract<TreasuryContract>,
    message: Cell,
    value: bigint
) {
    const jwAddress = await jetton.getWalletAddress(from.address);
    return await from.send({
        value,
        to: jwAddress,
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        body: message
    });
}

export async function getPriceUpdates(hermesEndpoint: string, feedIds: HexString[]) {
    const hermesClient = new HermesClient(hermesEndpoint);
    const latestPriceUpdates = await hermesClient.getLatestPriceUpdates(feedIds, {encoding: 'hex'});

    const parsed = latestPriceUpdates.parsed;
    const binary = Buffer.from(latestPriceUpdates.binary.data[0], 'hex');

    return {binary, parsed};
}