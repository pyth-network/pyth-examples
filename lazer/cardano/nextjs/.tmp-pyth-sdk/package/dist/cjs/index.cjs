"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get getPythScriptHash () {
        return getPythScriptHash;
    },
    get getPythState () {
        return getPythState;
    }
});
const _evolution = require("@evolution-sdk/evolution");
const PYTH_STATE_NFT = _evolution.AssetName.fromBytes(Buffer.from("Pyth State", "utf-8"));
// Minimal schema matching the on-chain Pyth state datum layout.
// Only the `withdraw_script` field is used; the preceding fields
// are defined to keep positional alignment with the Plutus struct.
// biome-ignore assist/source/useSortedKeys: order-sensistive
const PythStateDatum = _evolution.TSchema.Struct({
    // biome-ignore assist/source/useSortedKeys: order-sensitive
    governance: _evolution.TSchema.Struct({
        wormhole: _evolution.TSchema.ByteArray,
        emitter_chain: _evolution.TSchema.Integer,
        emitter_address: _evolution.TSchema.ByteArray,
        seen_sequence: _evolution.TSchema.Integer
    }),
    trusted_signers: _evolution.TSchema.Map(_evolution.TSchema.PlutusData, _evolution.TSchema.PlutusData),
    deprecated_withdraw_scripts: _evolution.TSchema.Map(_evolution.TSchema.PlutusData, _evolution.TSchema.PlutusData),
    withdraw_script: _evolution.TSchema.ByteArray
});
async function getPythState(policyId, client) {
    const unit = policyId + _evolution.AssetName.toHex(PYTH_STATE_NFT);
    return await client.getUtxoByUnit(unit);
}
function getPythScriptHash(pythState) {
    if (!_evolution.DatumOption.isInlineDatum(pythState.datumOption)) {
        throw new TypeError("State NFT UTxO does not have an inline datum");
    }
    const { data } = pythState.datumOption;
    if (!(data instanceof _evolution.Data.Constr)) {
        throw new TypeError("State NFT datum is not a Constr");
    }
    const state = _evolution.Schema.decodeSync(PythStateDatum)(data);
    return Buffer.from(state.withdraw_script).toString("hex");
}
