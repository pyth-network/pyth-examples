import { createCellChain } from '@pythnetwork/pyth-ton-js';
import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type SendUsdConfig = {
    pythAddress: Address;
};

export function sendUsdConfigToCell(config: SendUsdConfig): Cell {
    return beginCell().storeAddress(config.pythAddress).endCell();
}

export const Opcodes = {
    sendUsd: 1,
    parsePrice: 2,
};

export class SendUsd implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new SendUsd(address);
    }

    static createFromConfig(config: SendUsdConfig, code: Cell, workchain = 0) {
        const data = sendUsdConfigToCell(config);
        const init = { code, data };
        return new SendUsd(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendUsdPayment(
        provider: ContractProvider,
        via: Sender,
        opts: {
            queryId: number;
            recipient: Address;
            usdAmount: number;
            updateData: Buffer;
            value: bigint;
        },
    ) {
        return provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.sendUsd, 32)
                .storeUint(opts.queryId, 64)
                .storeAddress(opts.recipient)
                .storeUint(opts.usdAmount, 16)
                .storeRef(createCellChain(opts.updateData))
                .endCell(),
        });
    }

    async getPythAddress(provider: ContractProvider) {
        const result = await provider.get('get_pyth_address', []);
        return result.stack.readAddress();
    }
}
