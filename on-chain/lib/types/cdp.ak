/// Estado del CDP (Collateralized Debt Position) almacenado en el datum del pool UTxO.
///
/// - `ada_locked`     : colateral depositado, en lovelaces (1 ADA = 1_000_000)
/// - `minted_amount`  : deuda emitida en synth tokens, en micro-USD (6 decimales)
/// - `owner`          : hash de la clave del dueño de esta posición
pub type CdpDatum {
  ada_locked: Int,
  minted_amount: Int,
  owner: ByteArray,
}
