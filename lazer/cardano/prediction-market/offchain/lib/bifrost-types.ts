export type Paginate = {
    page: number,
    limit: number,
};

type Brand<Base, Tag extends string> = Base & { __brand: Tag };

export type Value = Brand<unknown, 'Value'>;
export type Transaction = Brand<unknown, 'Transaction'>;
export type TransactionUnspentOutput = Brand<unknown, 'TransactionUnspentOutput'>;
export type TransactionWitnessSet = Brand<unknown, 'TransactionWitnessSet'>;
export type CoseSign1 = Brand<unknown, 'CoseSign1'>;
export type CoseKey = Brand<unknown, 'CoseKey'>;

declare const CborHexBrand: unique symbol;
export type CborHex<T> = string & { readonly [CborHexBrand]: T };

export type AddressHex = string;
export type AddressBech32 = string;
export type DataSignature = {
    signature: CborHex<CoseSign1>,
    key: CborHex<CoseKey>,
};

export type CardanoWallet = {
    id: string;
    name: string;
    apiVersion: string;
    icon: string;
    enable(): Promise<CardanoWalletApi>;
    isEnabled(): Promise<boolean>;
};

export type CardanoWalletApi = {
    getNetworkId: () => Promise<number>;
    getUsedAddresses: () => Promise<Array<AddressHex>>;
    getUnusedAddresses: () => Promise<Array<AddressHex>>;
    getChangeAddress: () => Promise<AddressHex>;
    getRewardAddresses: () => Promise<Array<AddressHex>>;
    getBalance: () => Promise<CborHex<Value>>;
    getUtxos: (amount: CborHex<Value> | undefined, paginate: Paginate | undefined) => Promise<Array<CborHex<TransactionUnspentOutput>>>;
    signTx: (tx: CborHex<Transaction>, partialSign?: boolean) => Promise<CborHex<TransactionWitnessSet>>;
    signData: (address: AddressHex | AddressBech32, payload: string) => Promise<DataSignature>;
    submitTx: (txHex: string) => Promise<string>;
    on(eventName: string, callback: (...args: unknown[]) => unknown): void;
    off(eventName: string, callback: (...args: unknown[]) => unknown): void;
    experimental: {
        getCollateral: () => Promise<Array<CborHex<TransactionUnspentOutput>>>;
    };
};
