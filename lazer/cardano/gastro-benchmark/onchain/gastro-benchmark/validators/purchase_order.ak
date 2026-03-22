use aiken/list
use aiken/bytearray
use pyth

// Policy ID de Pyth para Cardano PreProd
const pyth_policy_id: ByteArray =
  #"d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6"

// Max markup permitido: 30% = 1300/1000
const max_markup_numerator: Int = 1300
const max_markup_denominator: Int = 1000

// Feed IDs para commodities
const WHEAT_FEED_ID: ByteArray =
  #"6e5d9b6a7b3a9f8c2d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c"
const SOY_OIL_FEED_ID: ByteArray =
  #"1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b"
const CATTLE_FEED_ID: ByteArray =
  #"2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c"

type PurchaseOrderDatum {
  supplier_id: ByteArray,
  product_feed_id: ByteArray,
  supplier_price: Int,
  quantity: Int,
  buyer_pkh: ByteArray,
}

type PurchaseOrderRedeemer {
  pyth_updates: List<pyth.PriceFeed>,
}

validator {
  fn validate_purchase_order(
    datum: PurchaseOrderDatum,
    redeemer: PurchaseOrderRedeemer,
    ctx: ScriptContext,
  ) -> Bool {
    // 1. Extraer el precio Pyth del update correspondiente
    let maybe_feed =
      list.find(
        redeemer.pyth_updates,
        fn(feed) { feed.id == datum.product_feed_id },
      )

    expect Some(feed) = maybe_feed

    // 2. Validar que el update de Pyth es legitimo
    let pyth_valid = pyth.verify_update(pyth_policy_id, feed, ctx)

    // 3. Calcular precio maximo permitido = pyth_price x 1.30
    let pyth_price = feed.price.price
    let max_allowed_price =
      pyth_price * max_markup_numerator / max_markup_denominator

    // 4. Validar que el proveedor no cobra de mas
    let price_valid = datum.supplier_price <= max_allowed_price

    // 5. Validar que firma el comprador
    let buyer_signed =
      list.has(ctx.transaction.extra_signatories, datum.buyer_pkh)

    pyth_valid && price_valid && buyer_signed
  }
}
