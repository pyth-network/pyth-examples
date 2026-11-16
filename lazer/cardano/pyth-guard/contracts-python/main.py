import requests
import os
import json
import sys

# --- CONFIGURACIÓN ---
# ID de Pyth para ADA/USD (Pyth ID Network)
ADA_USD_FEED = "0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f"
# Hash del script de Pyth en Preview/PreProd Testnet
PYTH_SCRIPT_HASH = bytes.fromhex("f6a62c0b472f7783921b790d5656f7093259ba8790326847844a4286")

def obtener_datos_pyth():
    print("[1/3] Consultando precio en Pyth Hermes...")
    url = f"https://hermes.pyth.network/v2/updates/price/latest?ids[]={ADA_USD_FEED}"
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"      ERROR al consultar Pyth: {e}")
        sys.exit(1)
    
    data = r.json()
    parsed = data.get("parsed", [])
    if not parsed:
        print("      ERROR: No se encontraron datos de precio en la respuesta.")
        sys.exit(1)

    price_data = parsed[0]["price"]
    precio_raw = int(price_data["price"])
    exponente  = int(price_data["expo"])
    precio_real = precio_raw * (10 ** exponente)
    
    # El 'VAA' es la prueba criptográfica que Cardano necesita
    binary_data = data.get("binary", {}).get("data", [])
    vaa_hex = binary_data[0] if binary_data else "N/A"
    
    print(f"      Precio Raw : {precio_raw}")
    print(f"      Exponente  : {exponente}")
    print(f"      Precio Real: ${precio_real:.6f} USD")
    return precio_raw, vaa_hex

def compilar_contrato():
    print("[2/3] Compilando contrato Python a Plutus...")
    contract_path = os.path.join(os.path.dirname(__file__), "contract.py")
    exit_code = os.system(f"opshin build {contract_path}")
    if exit_code != 0:
        print("      ERROR: Falló la compilación del contrato con OpShin.")
        print("      Asegurate de tener opshin instalado: pip install opshin")
        sys.exit(1)
    print("      Contrato guardado en build/contract.py/script.plutus")

def simular_transaccion(precio_raw: int, vaa: str):
    print("[3/3] Construyendo transacción de Cardano (simulación)...")
    
    # Precio mínimo: $0.40 USD en precio raw de Pyth (8 decimales → 40000000)
    PRECIO_MINIMO = 40_000_000
    
    print(f"      Precio Oracle (Redeemer) : {precio_raw}")
    print(f"      Precio Mínimo (Datum)    : {PRECIO_MINIMO}")
    
    if precio_raw >= PRECIO_MINIMO:
        print("      ✅ VALIDACIÓN OK: El precio supera el mínimo.")
    else:
        print("      ⚠️  VALIDACIÓN FALLA: Precio insuficiente. Stop-Loss se activaría.")
    
    print(f"      VAA de Pyth (proof)      : {vaa[:40]}...")
    print("      ¡Transacción lista para firmar con PyCardano!")

def main():
    try:
        compilar_contrato()
        precio, vaa = obtener_datos_pyth()
        simular_transaccion(precio, vaa)
        print("\n--- PROCESO COMPLETADO EXITOSAMENTE ---")
    except SystemExit:
        pass
    except Exception as e:
        print(f"\nERROR INESPERADO: {e}")
        raise

if __name__ == "__main__":
    main()
