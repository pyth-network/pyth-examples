import {createCellChain} from '@pythnetwork/pyth-ton-js';
import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Dictionary,
    Sender,
    SendMode
} from '@ton/core';

export type PythConnectorConfig = {
    pythAddress: Address;
    ids: Dictionary<bigint, Buffer>;
};

export function makeEmptyIds(): Dictionary<bigint, Buffer> {
    return Dictionary.empty(
        Dictionary.Keys.BigInt(256),
        Dictionary.Values.Buffer(64));
}

export function PythConnectorConfigToCell(config: PythConnectorConfig): Cell {
    return beginCell()
        .storeAddress(config.pythAddress)
        .storeDict(makeEmptyIds())
        .endCell();
}

export const Opcodes = {
    customOperationUnique: 1,
    configure: 2,
    customOperation: 3,
    parseUniquePriceFeedUpdates: 6,
};

export type EvaaPythTuple = {
    evaa_id: bigint;
    reffered_id: bigint;
};

export class PythConnector implements Contract {
    constructor(
        readonly address: Address,
        readonly ids: Dictionary<bigint, Buffer>,
        readonly init?: { code: Cell; data: Cell },
    ) {
    }

    static createFromAddress(address: Address) {
        return new PythConnector(address, makeEmptyIds());
    }

    static createFromConfig(config: PythConnectorConfig, code: Cell, workchain = 0) {
        const data = PythConnectorConfigToCell(config);
        const init = {code, data};
        return new PythConnector(contractAddress(workchain, init), config.ids, init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendConfigure(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            pythAddress: Address;
            feedsMap: Dictionary<bigint, Buffer>;
        }
    ) {
        console.log('feedsMap: ', opts.feedsMap);
        return provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.configure, 32)
                .storeAddress(opts.pythAddress)
                .storeDict(opts.feedsMap, Dictionary.Keys.BigUint(256), Dictionary.Values.Buffer(64))
                .endCell()
        })
    }

    async sendCustomOperation(
        provider: ContractProvider,
        via: Sender,
        opts: {
            queryId: number;
            value: bigint;
            updateData: Buffer;
            pythPriceIds: Cell;
            publishTimeGap: number;
            maxStaleness: number;
            payload: Cell;
        }
    ) {
        return provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.customOperation, 32)
                .storeUint(opts.queryId, 64)
                .storeUint(opts.publishTimeGap, 64)
                .storeUint(opts.maxStaleness, 64)
                .storeRef(createCellChain(opts.updateData))
                .storeRef(opts.pythPriceIds)
                .storeMaybeRef(opts.payload)
                .endCell(),
        });
    }



    async sendOnchainGetterOperation(provider: ContractProvider, via: Sender, opts: {
    }) {

    }

    async sendWithdrawLikeJetton(provider: ContractProvider, via: Sender, opts: {
        queryId: number;
        value: bigint;
        updateData: Buffer;
        pythPriceIds: Cell;
        publishTimeGap: number;
        maxStaleness: number;

    }) {}

    async getPythAddress(provider: ContractProvider) {
        const result = await provider.get('get_pyth_address', []);
        return result.stack.readAddress();
    }

    async getFeedsMap(provider: ContractProvider) {
        const result = await provider.get('get_feeds_dict', []);
        const stack = result.stack;
        if (stack.remaining === 0) {
            return Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Buffer(64));
        }

        const dictCell = stack.readCell();
        return Dictionary.loadDirect(Dictionary.Keys.BigUint(256), Dictionary.Values.Buffer(64), dictCell);
    }
}
