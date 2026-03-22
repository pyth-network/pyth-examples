use cardano/transaction.{Transaction, OutputReference}
use cardano/script_context.{ScriptContext}

// Max markup permitido: 30%
const max_markup_numerator: Int = 1300
const max_markup_denominator: Int = 1000

type PurchaseOrderDatum {
  supplier_id: ByteArray,
  supplier_price: Int,
  quantity: Int,
  buyer_pkh: ByteArray,
}

type PurchaseOrderRedeemer {
  pyth_price: Int,
}

validator gastro_benchmark {
  spend(_datum: Option<Data>, _redeemer: Data, _utxo: OutputReference, _self: Transaction) {
    // TODO: Implement Pyth price validation logic
    // Por ahora retorna True para que compile
    True
  }
}
