use validators/invoice

test minimum_lovelace_required_handles_negative_exponent() {
  invoice.minimum_lovelace_required(100, 250, -2) == 400_000
}
