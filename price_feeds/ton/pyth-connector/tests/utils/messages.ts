import { Address, beginCell, Cell } from "@ton/core";
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
        .storeRef(beginCell().endCell())
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