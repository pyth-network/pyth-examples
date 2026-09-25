/// Calcula health ratio como porcentaje entero.
/// Retorna: 140 = 140%, 120 = 120%, etc.
/// Requiere debt_amount > 0.
pub fn health_ratio(
  ada_locked: Int,
  debt_amount: Int,
  raw_price: Int,
  exponent: Int,
) -> Int {
  expect debt_amount > 0
  let abs_exp = if exponent < 0 { -exponent } else { exponent }
  let collateral_value = ada_locked * raw_price / pow(10, abs_exp)
  collateral_value * 100 / debt_amount
}

/// Verifica si health >= maintenance_ratio.
pub fn can_adjust(health: Int, maintenance: Int) -> Bool {
  health >= maintenance
}

/// Verifica si health < liquidation_ratio.
pub fn is_liquidatable(health: Int, liquidation: Int) -> Bool {
  health < liquidation
}

/// Calcula ADA (lovelaces) a entregar al liquidador (deuda + penalty).
pub fn liquidator_payout(
  debt_amount: Int,
  penalty_pct: Int,
  raw_price: Int,
  exponent: Int,
) -> Int {
  let debt_with_penalty = debt_amount + debt_amount * penalty_pct / 100
  let abs_exp = if exponent < 0 { -exponent } else { exponent }
  debt_with_penalty * pow(10, abs_exp) / raw_price
}

/// Calcula ADA (lovelaces) a entregar al protocolo como fee.
pub fn protocol_payout(
  debt_amount: Int,
  fee_pct: Int,
  raw_price: Int,
  exponent: Int,
) -> Int {
  let fee_amount = debt_amount * fee_pct / 100
  let abs_exp = if exponent < 0 { -exponent } else { exponent }
  fee_amount * pow(10, abs_exp) / raw_price
}

/// Convierte ADA (lovelaces) a synth tokens (micro-USD).
/// Dirección forward del oracle: ADA → synth USD.
///
/// synth_amount = ada_lovelaces * raw_price / 10^abs_exp
///
/// Ejemplo (ADA/USD $0.70, exponent=-8):
///   1_000_000 lovelaces → 700_000 micro-USD ($0.70)
pub fn compute_expected_synth_amount(
  ada_lovelaces: Int,
  raw_price: Int,
  exponent: Int,
) -> Int {
  let abs_exp = if exponent < 0 { -exponent } else { exponent }
  ada_lovelaces * raw_price / pow(10, abs_exp)
}

fn pow(base: Int, exp: Int) -> Int {
  if exp == 0 {
    1
  } else {
    base * pow(base, exp - 1)
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────
//
// Parámetros comunes:
//   raw_price = 70_000_000  (ADA/USD $0.70 con exponent=-8)
//   exponent  = -8
//   ada_locked en lovelaces (1 ADA = 1_000_000)
//   debt_amount en micro-USD (6 decimales, igual que lovelaces)

// pow -------------------------------------------------------------------------

test pow_zero() {
  pow(10, 0) == 1
}

test pow_one() {
  pow(10, 1) == 10
}

test pow_eight() {
  pow(10, 8) == 100_000_000
}

// health_ratio ----------------------------------------------------------------

// 1.5 ADA bloqueado ($1.05) vs $0.70 deuda → 150%
test health_ratio_150pct() {
  health_ratio(1_500_000, 700_000, 70_000_000, -8) == 150
}

// 1 ADA ($0.70) vs $0.70 deuda → exactamente 100%
test health_ratio_100pct() {
  health_ratio(1_000_000, 700_000, 70_000_000, -8) == 100
}

// 2 ADA ($1.40) vs $0.70 deuda → 200%
test health_ratio_200pct() {
  health_ratio(2_000_000, 700_000, 70_000_000, -8) == 200
}

// debt_amount == 0 debe fallar (expect debt_amount > 0)
test health_ratio_zero_debt_fails() fail {
  health_ratio(1_000_000, 0, 70_000_000, -8) == 0
}

// can_adjust ------------------------------------------------------------------

// health == maintenance → permitido (borde exacto)
test can_adjust_at_boundary() {
  can_adjust(150, 150) == True
}

// health > maintenance → permitido
test can_adjust_above() {
  can_adjust(200, 150) == True
}

// health < maintenance → bloqueado
test can_adjust_below() {
  can_adjust(149, 150) == False
}

// is_liquidatable -------------------------------------------------------------

// health < liquidation → liquidable
test is_liquidatable_below() {
  is_liquidatable(119, 120) == True
}

// health == liquidation → NO liquidable (borde exacto)
test is_liquidatable_at_boundary() {
  is_liquidatable(120, 120) == False
}

// health > liquidation → NO liquidable
test is_liquidatable_above() {
  is_liquidatable(150, 120) == False
}

// liquidator_payout -----------------------------------------------------------

// $0.70 deuda + 8% penalty → 1_080_000 lovelaces (1.08 ADA)
// debt_with_penalty = 700_000 + 56_000 = 756_000
// ada = 756_000 * 10^8 / 70_000_000 = 1_080_000
test liquidator_payout_8pct() {
  liquidator_payout(700_000, 8, 70_000_000, -8) == 1_080_000
}

// 0% penalty → recupera exactamente 1 ADA (1_000_000 lovelaces)
test liquidator_payout_zero_penalty() {
  liquidator_payout(700_000, 0, 70_000_000, -8) == 1_000_000
}

// protocol_payout -------------------------------------------------------------

// $0.70 deuda, 2% fee → 20_000 lovelaces (0.02 ADA = $0.014)
// fee = 700_000 * 2 / 100 = 14_000
// ada = 14_000 * 10^8 / 70_000_000 = 20_000
test protocol_payout_2pct() {
  protocol_payout(700_000, 2, 70_000_000, -8) == 20_000
}

// 0% fee → 0 lovelaces
test protocol_payout_zero_fee() {
  protocol_payout(700_000, 0, 70_000_000, -8) == 0
}

// compute_expected_synth_amount -----------------------------------------------

// 1 ADA ($0.70) → 700_000 micro-USD
test synth_amount_1_ada() {
  compute_expected_synth_amount(1_000_000, 70_000_000, -8) == 700_000
}

// 2 ADA ($1.40) → 1_400_000 micro-USD
test synth_amount_2_ada() {
  compute_expected_synth_amount(2_000_000, 70_000_000, -8) == 1_400_000
}

// 1.5 ADA ($1.05) → 1_050_000 micro-USD
test synth_amount_1_5_ada() {
  compute_expected_synth_amount(1_500_000, 70_000_000, -8) == 1_050_000
}

// inverso: synth→ADA y luego ADA→synth debe recuperar el valor original
// 700_000 micro-USD → 1_000_000 lovelaces → 700_000 micro-USD
test synth_amount_round_trip() {
  let lovelaces = 1_000_000
  let synth = compute_expected_synth_amount(lovelaces, 70_000_000, -8)
  synth == 700_000
}

// compute_expected_synth_amount (Burn — valor negativo) -----------------------

// Burn 1 ADA: -1_000_000 lovelaces → -700_000 micro-USD (synth a quemar)
test synth_amount_burn_1_ada() {
  compute_expected_synth_amount(-1_000_000, 70_000_000, -8) == -700_000
}

// Burn 2 ADA: -2_000_000 lovelaces → -1_400_000 micro-USD
test synth_amount_burn_2_ada() {
  compute_expected_synth_amount(-2_000_000, 70_000_000, -8) == -1_400_000
}

// Burn 1.5 ADA: -1_500_000 lovelaces → -1_050_000 micro-USD
test synth_amount_burn_1_5_ada() {
  compute_expected_synth_amount(-1_500_000, 70_000_000, -8) == -1_050_000
}

// Simetría: mint y burn deben ser exactamente opuestos
test synth_amount_mint_burn_symmetry() {
  let mint = compute_expected_synth_amount(1_000_000, 70_000_000, -8)
  let burn = compute_expected_synth_amount(-1_000_000, 70_000_000, -8)
  mint == -burn
}
