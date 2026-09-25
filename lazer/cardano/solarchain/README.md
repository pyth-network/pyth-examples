# SolarChain Cardano MVP

SolarChain es una capa de trazabilidad y settlement para beneficio solar verificable.
No es un trading system. No es un carbon market. No es un bono verde. No es un sistema de subsidios.

## Corrección aplicada respecto del mock inicial

Se removió la narrativa incorrecta de:

- dividendos,
- tokenomics de dashboard,
- supply/holders,
- métricas que harían parecer a SolarChain un activo de trading.

El dashboard ahora muestra:

- evidencia energética,
- referencias climáticas y económicas,
- settlement preview,
- snapshots persistidos,
- export de evidencia.

## Unidad canónica del MVP

La unidad de settlement del MVP es **sKWh**.

- `1 sKWh = 1 kWh solar verificable asignable según regla del sitio`
- `Wh` queda como evidencia cruda off-chain
- el settlement usa solo **sKWh enteros**

## Regla de asignación activa

- `EXPORTED_ENERGY_ONLY`

La energía asignable se calcula como:

```text
assignableWh = max(totalGeneratedWh - totalConsumedWh, 0)
settlementSKwh = floor(assignableWh / 1000)
```

## Estructura

```text
packages/
  config/
  shared-types/
  cardano-core/
  pyth-adapter/
  solarchain-domain/
  contracts-aiken/

apps/
  solarchain-api/
  solarchain-web/
```

## Endpoints

- `GET /health`
- `GET /site`
- `GET /dashboard/summary`
- `GET /snapshots?limit=8`
- `GET /snapshots/:snapshotId/evidence`
- `POST /batches/quote`
- `POST /batches/prepare-settlement`
- `POST /snapshots/ingest`

## Run local

```bash
cp .env.example .env
npm install
npm run test
npm run typecheck
npm run dev:api
npm run dev:web
```
