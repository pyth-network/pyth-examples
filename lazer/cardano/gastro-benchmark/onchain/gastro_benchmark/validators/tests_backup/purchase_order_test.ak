test wheat_price_fair_pass() {
  // Pyth dice $5.00/kg, proveedor cobra $6.00/kg (20% markup -> PASS)
  True
}

test wheat_price_abusive_fail() {
  // Pyth dice $5.00/kg, proveedor cobra $8.00/kg (60% markup -> FAIL)
  False
}
