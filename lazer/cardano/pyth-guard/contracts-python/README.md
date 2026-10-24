# PythGuard — contracts-python

Implementación alternativa del smart contract de stop-loss usando **OpShin** y **PyCardano**.

## Setup

```bash
cd contracts-python
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
```

## Uso

```bash
python main.py
```

Esto:
1. Compila `contract.py` a Plutus script using OpShin
2. Consulta el precio ADA/USD en Pyth Hermes API
3. Simula la validación de la transacción Cardano

## Archivos

| File | Description |
|---|---|
| `contract.py` | Smart contract OpShin (Python → Plutus) |
| `main.py` | Orchestrator: precio feed + compilación + TX simulada |
| `requirements.txt` | Dependencias Python |
