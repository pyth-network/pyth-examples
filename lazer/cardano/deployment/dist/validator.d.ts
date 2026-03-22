import { type SpendingValidator, type Network } from "@lucid-evolution/lucid";
export interface ValidatorParams {
    usdAmountCents: bigint;
    userPaymentKeyHash: string;
    userStakeKeyHash?: string;
    sponsorPaymentKeyHash: string;
    sponsorStakeKeyHash?: string;
    pythPolicyId: string;
}
export declare function getCompiledCode(): string;
export declare function buildValidator(params: ValidatorParams): SpendingValidator;
export declare function getScriptAddress(validator: SpendingValidator, network: Network): string;
