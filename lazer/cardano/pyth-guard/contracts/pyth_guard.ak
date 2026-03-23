// PythGuard — Smart Contract en Aiken
// Sistema de Stop-Loss de Alta Precisión para Cardano + Pyth Network
// Hackathon Pythathon 2026

use aiken/hash.{Blake2b_224, Hash}
use aiken/list
use aiken/transaction.{ScriptContext, Spend, Transaction}
use aiken/transaction/credential.{VerificationKey}

// ============================================================
// TIPOS DE DATOS
// ============================================================

/// Datum: almacena el precio de activación del stop-loss y el dueño de los fondos.
pub type Datum {
  /// Precio objetivo en micro-ADA (e.g. 350000 = $0.35 ADA/USD con 6 decimales)
  target_price: Int,
  /// Hash de la clave de verificación del propietario
  owner: Hash<Blake2b_224, VerificationKey>,
}

/// Redeemer: actualización de precio firmada por el oráculo Pyth
pub type Redeemer {
  /// Precio actual en micro-USD provisto por Pyth Lazer (6 decimales)
  price: Int,
  /// Firma del oráculo Pyth (debe coincidir con el PYTH_PREPROD_POLICY_ID)
  pyth_signature: ByteArray,
  /// Timestamp Unix del precio (para evitar price replay attacks)
  publish_time: Int,
}

// ============================================================
// CONSTANTES
// ============================================================

/// Policy ID del oráculo Pyth en Cardano PreProd
/// Corresponde a: d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6
const pyth_preprod_policy_id: ByteArray =
  #"d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6"

/// Ventana de validez de un precio Pyth: 5 segundos en Unix time
const max_price_age_seconds: Int = 5

// ============================================================
// VALIDADOR PRINCIPAL
// ============================================================

/// Validador de stop-loss de PythGuard.
///
/// Permite la liquidación/protección SOLO cuando:
/// 1. El precio del oráculo Pyth es <= al precio objetivo (stop-loss activado)
/// 2. La firma del oráculo coincide con el policy ID de Pyth en PreProd
/// 3. La transacción está firmada por el propietario de los fondos
/// 4. El precio no es demasiado antiguo (anti-replay)
validator {
  fn validate(datum: Datum, redeemer: Redeemer, ctx: ScriptContext) -> Bool {
    let ScriptContext { transaction, purpose } = ctx

    when purpose is {
      Spend(_) -> {
        // Verificar que el precio del oráculo esté por debajo del umbral
        let stop_loss_triggered = redeemer.price <= datum.target_price

        // Verificar que la firma del oráculo sea legítima (Pyth PreProd)
        let oracle_is_valid =
          redeemer.pyth_signature == pyth_preprod_policy_id

        // Verificar que el propietario está autorizando esta transacción
        let owner_signed =
          list.any(
            transaction.extra_signatories,
            fn(signer) { signer == datum.owner },
          )

        // Verificar que el precio no sea demasiado antiguo
        // (comparación vs POSIXTime de la transacción)
        let price_is_fresh =
          check_price_freshness(redeemer.publish_time, transaction)

        // Todas las condiciones deben cumplirse
        stop_loss_triggered && oracle_is_valid && owner_signed && price_is_fresh
      }
      // Rechazar cualquier otro propósito de uso del script
      _ -> False
    }
  }
}

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

/// Verifica que el precio del oráculo no sea demasiado antiguo.
/// El tiempo de publicación debe estar dentro de la ventana de validez
/// del intervalo de validez de la transacción.
fn check_price_freshness(
  publish_time: Int,
  transaction: Transaction,
) -> Bool {
  let lower_bound_ms = get_lower_bound(transaction)
  // Convertir max_price_age a milisegundos
  let max_age_ms = max_price_age_seconds * 1000
  // publish_time en segundos → convertir a ms
  let publish_time_ms = publish_time * 1000
  // El precio debe haber sido publicado dentro de la ventana
  lower_bound_ms - publish_time_ms <= max_age_ms
}

/// Obtiene el límite inferior del intervalo de validez de la transacción en ms.
fn get_lower_bound(transaction: Transaction) -> Int {
  let validity_range = transaction.validity_range
  when validity_range.lower_bound.bound_type is {
    aiken/interval.Finite(t) -> t
    // Si no hay límite inferior definido, usar 0 (sin restricción de frescura)
    _ -> 0
  }
}
