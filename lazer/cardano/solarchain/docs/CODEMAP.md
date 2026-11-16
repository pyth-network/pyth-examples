# Codemap SolarChain

## packages/config
Fuente única de verdad para variables de entorno.

## packages/shared-types
Contratos de tipos entre API, web y dominio. Incluye snapshots, dashboard summary y evidence export.

## packages/cardano-core
Provider Blockfrost, configuración de runtime Lucid y metadata compartida.

## packages/pyth-adapter
Adaptador Pyth disponible para integración posterior. No define reglas SolarChain.

## packages/solarchain-domain
Fuente de verdad del producto SolarChain: validación, unidad canónica, quote, dashboard summary y export de evidencia.

## packages/contracts-aiken
Validator Aiken para settlement mínimo e integridad básica.

## apps/solarchain-api
Orquesta requests, aplica dominio y persiste snapshots en PostgreSQL o memoria de fallback para la demo local.

## apps/solarchain-web
Dashboard de demo, intake de batch y visualización de evidencia. No contiene reglas de settlement.
