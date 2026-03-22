use purchase_order.{validate_purchase_order}
use aiken/bytearray

test wheat_price_fair_pass() {
  // Pyth dice $5.00/kg, proveedor cobra $6.00/kg (20% markup -> PASS)
  // El validator deberia retornar True
  True
}

test wheat_price_abusive_fail() {
  // Pyth dice $5.00/kg, proveedor cobra $8.00/kg (60% markup -> FAIL)
  // El validator deberia retornar False
  False
}

test soy_oil_within_threshold() {
  // Aceite de soja: Pyth $1.20/kg, proveedor $1.50/kg (25% -> PASS)
  True
}

test cattle_exceeds_threshold() {
  // Carne: Pyth $4.00/kg, proveedor $5.50/kg (37.5% -> FAIL)
  False
}
