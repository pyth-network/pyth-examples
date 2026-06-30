import {
  Address,
  Bytes,
  Credential,
  Data,
  Plutus,
  TSchema,
  type Data as PlutusData,
} from "@evolution-sdk/evolution";

export const OsiPaymentCredentialSchema = Plutus.Credential.PaymentCredential;

export const OsiDatumSchema = TSchema.Struct(
  {
    deadline: TSchema.Integer,
    payees: TSchema.Map(OsiPaymentCredentialSchema, TSchema.Integer),
  },
  { index: 0 },
);

export const OsiRedeemerSchema = TSchema.Variant({
  Fund: {},
  Payout: {},
});

export const OsiDatumCodec = Data.withSchema(OsiDatumSchema);
export const OsiRedeemerCodec = Data.withSchema(OsiRedeemerSchema);

export type OsiPaymentCredential = typeof OsiPaymentCredentialSchema.Type;
export type OsiDatum = typeof OsiDatumSchema.Type;
export type OsiRedeemer = typeof OsiRedeemerSchema.Type;

export type OsiExamplePayee = {
  address: string;
  paymentKeyHash: string;
  quoteAmount: bigint;
};

export const EXAMPLE_PREPROD_PAYEES: readonly OsiExamplePayee[] = [
  {
    address: "addr_test1vz7upneaquh4td8kycdyr8d4x9cdvv7y99j2kzun0rzxx9slapnsh",
    paymentKeyHash: "bdc0cf3d072f55b4f6261a419db53170d633c42964ab0b9378c46316",
    quoteAmount: 10_000_000n,
  },
  {
    address: "addr_test1vrnqcm69r8mmcgp000mp8scyum6kgqndhgmmzcqyw085ctqztm5sn",
    paymentKeyHash: "e60c6f4519f7bc202f7bf613c304e6f564026dba37b1600473cf4c2c",
    quoteAmount: 10_000_000n,
  },
  {
    address: "addr_test1vzx8f6qul48nddykx8zwqxzrhftyyfnfjv9atxhxtdl926cjud93m",
    paymentKeyHash: "8c74e81cfd4f36b49631c4e01843ba56422669930bd59ae65b7e556b",
    quoteAmount: 10_000_000n,
  },
  {
    address: "addr_test1vrf6sj0emxffff7w42ksy3pvtcymmq4rsvxzsfxs7erf9tc7mvj5y",
    paymentKeyHash: "d3a849f9d99294a7ceaaad02442c5e09bd82a3830c2824d0f64692af",
    quoteAmount: 10_000_000n,
  },
  {
    address: "addr_test1vrjqqz0dty8xv86hyw5ddwj3lkkzxk057hltkqgxhsg2dcgt8rk5s",
    paymentKeyHash: "e40009ed590e661f5723a8d6ba51fdac2359f4f5febb0106bc10a6e1",
    quoteAmount: 10_000_000n,
  },
] as const;

export function makeVerificationKeyCredential(
  verificationKeyHashHex: string,
): OsiPaymentCredential {
  return {
    VerificationKey: {
      hash: Bytes.fromHex(verificationKeyHashHex),
    },
  };
}

export function makeScriptCredential(scriptHashHex: string): OsiPaymentCredential {
  return {
    Script: {
      hash: Bytes.fromHex(scriptHashHex),
    },
  };
}

export function makeOsiDatumData(datum: OsiDatum): PlutusData.Data {
  return OsiDatumCodec.toData(datum);
}

export function decodeOsiDatumData(data: Data.Constr): OsiDatum {
  return OsiDatumCodec.fromData(data);
}

export function makeEmptyOsiDatum(deadline: bigint): OsiDatum {
  return {
    deadline,
    payees: new Map(),
  };
}

export function makeExamplePreprodOsiDatum(deadline: bigint): OsiDatum {
  return {
    deadline,
    payees: new Map(
      EXAMPLE_PREPROD_PAYEES.map((payee) => [
        makeVerificationKeyCredential(payee.paymentKeyHash),
        payee.quoteAmount,
      ]),
    ),
  };
}

export function makeFundRedeemerData(): PlutusData.Data {
  return OsiRedeemerCodec.toData({ Fund: {} });
}

export function makePayoutRedeemerData(): PlutusData.Data {
  return OsiRedeemerCodec.toData({ Payout: {} });
}

export function paymentCredentialToAddress(
  paymentCredential: OsiPaymentCredential,
  networkId: 0 | 1,
): Address.Address {
  if ("VerificationKey" in paymentCredential) {
    return new Address.Address({
      networkId,
      paymentCredential: Credential.makeKeyHash(
        paymentCredential.VerificationKey.hash,
      ),
    });
  }

  return new Address.Address({
    networkId,
    paymentCredential: Credential.makeScriptHash(paymentCredential.Script.hash),
  });
}
