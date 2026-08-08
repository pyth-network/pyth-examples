// Gastro Benchmark - Purchase Order Validator

use aiken/list
use aiken/bytearray

// Max markup: 30%
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

validator {
  fn validate_purchase_order(
    datum: PurchaseOrderDatum,
    redeemer: PurchaseOrderRedeemer,
    ctx: ScriptContext,
  ) -> Bool {
    // Maximo permitido = pyth_price x 1.30
    let max_allowed_price =
      redeemer.pyth_price * max_markup_numerator / max_markup_denominator

    // Validar precio
    let price_valid = datum.supplier_price <= max_allowed_price

    // Validar firma del comprador
    let buyer_signed =
      list.has(ctx.transaction.extra_signatories, datum.buyer_pkh)

    price_valid && buyer_signed
  }
}
