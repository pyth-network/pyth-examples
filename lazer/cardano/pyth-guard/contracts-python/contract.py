from opshin.prelude import *

@datum
class VentaProtegida(Datum):
    vendedor: PubKeyHash
    precio_minimo: int    # Precio base en USD (ej: 500000 para $0.50)
    pyth_script_id: bytes # Hash del validador de Pyth (Mainnet/Preprod)

def validator(datum: VentaProtegida, redeemer: int, context: ScriptContext) -> None:
    tx_info = context.tx_info
    
    # 1. Verificar firma del dueño
    assert datum.vendedor in tx_info.signatories, "Firma del vendedor requerida"

    # 2. Verificar que Pyth validó el precio en esta Tx
    # En Cardano, Pyth usa un 'withdrawal' (retiro) de 0 ADA para inyectar el precio.
    pyth_verificado = False
    for staking_cred, amount in tx_info.withdrawals.items():
        if isinstance(staking_cred, ScriptCredential):
            if staking_cred.credential_hash == datum.pyth_script_id:
                pyth_verificado = True
    
    assert pyth_verificado, "No se encontro la prueba de Pyth en la transaccion"

    # 3. Validar precio (el redeemer es el precio que enviamos desde el main)
    assert redeemer >= datum.precio_minimo, "Precio insuficiente segun el oraculo"
