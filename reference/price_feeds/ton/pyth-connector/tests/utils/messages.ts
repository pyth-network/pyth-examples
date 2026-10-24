import { Address, beginCell, Cell, Dictionary } from "@ton/core";
import { JETTON_OPCODES, OPCODES } from "./opcodes";

export function makeOnchainGetterPayload(args: {
    // queryId: number | bigint,
    publishTimeGap: number,
    maxStaleness: number,
    updateDataCell: Cell,
    pythPriceIds: Cell,
    operationBody: Cell
}) {

    return beginCell()
        .storeUint(OPCODES.ONCHAIN_GETTER_OPERATION, 32)
        .storeUint(args.publishTimeGap, 64)
        .storeUint(args.maxStaleness, 64)
        .storeRef(args.updateDataCell)
        .storeRef(args.pythPriceIds)
        .storeRef(args.operationBody)
        .endCell();
}

export function makeTransferMessage(args: {
    queryId: bigint,
    jettonAmount: bigint,
    sender: Address, // for excesses
    payloadDestination: Address,
    notificationBody: Cell,
    forwardAmount: bigint,
}) {
    const TRANSFER_JETTON_OP_CODE = JETTON_OPCODES.TRANSFER;
    return beginCell()
        .storeUint(TRANSFER_JETTON_OP_CODE, 32)
        .storeUint(args.queryId, 64)
        .storeCoins(args.jettonAmount)
        .storeAddress(args.payloadDestination)
        .storeAddress(args.sender)
        .storeBit(0)
        .storeCoins(args.forwardAmount)
        .storeBit(1)
        .storeRef(args.notificationBody)
        .endCell();
}

export function makePythProxyPayloadMessage(args: {
    queryId: number | bigint,
    transferredAmount: number | bigint,
}) {
    return beginCell()
        .storeUint(OPCODES.PROXY_OPERATION, 32)
        .storeUint(args.queryId, 64)
        .storeRef(
            beginCell()
                .storeUint(args.transferredAmount, 64)
                .endCell()
        )
        .endCell();
}

export function parsePythProxyLogBody(cell: Cell): {    
    queryId: number,
    op: number,
    dictCell: Cell,
} {
    const s = cell.beginParse();
    const op = s.loadUint(8);  
    expect(s.remainingRefs).toBeGreaterThan(0); 
    const s2 = s.loadRef().beginParse();
    const queryId = Number(s2.loadUintBig(64));
    const dictCell = s2.loadRef();

    return { queryId, op, dictCell };
}

export const PYTH_UPDATE_FEEDS_OP_CODE = 5;

export function makePythProxyMessage(args: {
    updateDataCell: Cell,
    pythPriceIds: Cell,
    minPublishTime: number,
    maxPublishTime: number,
    targetAddress: Address,
    queryId: number | bigint,
    proxyPayload: Cell,
    transferredAmount: number | bigint,
}) {
    return beginCell()
        .storeUint(PYTH_UPDATE_FEEDS_OP_CODE, 32)
        .storeRef(args.updateDataCell)
        .storeRef(args.pythPriceIds)
        .storeUint(args.minPublishTime, 64)
        .storeUint(args.maxPublishTime, 64)
        .storeAddress(args.targetAddress)
        .storeRef(args.proxyPayload)
        .endCell();
}

