# Norma operativa unificada — SolarChain + Tokenized Commodities

Este monorepo define una **plataforma Cardano común** para ambos equipos y dos capas de dominio separadas.  
Objetivo: **baja fricción**, **misma disciplina técnica**, **mínima duplicación**, **máximo foco de hackathon**.

---

## 1. Stack estándar obligatorio

- **On-chain:** Aiken
- **Off-chain blockchain:** TypeScript + Node.js 20 + Lucid
- **Proveedor:** Blockfrost
- **Oracle de precio:** Pyth
- **Backend producto:** Fastify + PostgreSQL
- **Front:** Next.js + TypeScript
- **Red:** Cardano PreProd
- **Tokenización:** Native Assets
- **Metadata dinámica:** CIP-68 / transaction metadata según el caso

---

## 2. Regla madre de arquitectura

### Lo compartido
- conexión Cardano
- provider
- tipos
- fetch de Pyth
- helpers de metadata / tx
- disciplina de CI
- convenciones de carpetas
- estrategia de logs, errores y validaciones

### Lo NO compartido
- reglas de negocio
- datums / redeemers específicos
- endpoints de dominio
- dashboards
- contratos por caso de uso

---

## 3. Squads y responsabilidades

### Squad Platform / Shared Core
Responsable de:
- `packages/config`
- `packages/shared-types`
- `packages/cardano-core`
- `packages/pyth-adapter`
- pipelines, calidad y normalización del repo

### Squad SolarChain
Responsable de:
- `packages/solarchain-domain`
- `apps/solarchain-api`
- `apps/solarchain-web`
- validator `solarchain_settlement.ak`

### Squad Tokenized Commodities
Responsable de:
- `packages/commodities-domain`
- `apps/tokenized-commodities-api`
- `apps/tokenized-commodities-web`
- validator `commodity_escrow.ak`

### Regla de ownership
Nadie modifica dominio ajeno sin PR y review del owner.  
Lo compartido requiere review del Squad Platform.

---

## 4. Estructura del monorepo

```text
apps/
  solarchain-api/
  solarchain-web/
  tokenized-commodities-api/
  tokenized-commodities-web/

packages/
  config/
  shared-types/
  cardano-core/
  pyth-adapter/
  solarchain-domain/
  commodities-domain/
  contracts-aiken/
```

---

## 5. Flujo de trabajo obligatorio

1. Pull del branch principal.
2. Crear branch por feature:
   - `feat/solarchain-*`
   - `feat/commodities-*`
   - `feat/platform-*`
3. Implementar.
4. Ejecutar:
   - `npm run typecheck`
   - `npm run build`
5. Abrir PR.
6. Review técnico y de seguridad.
7. Merge.

---

## 6. Convenciones mínimas

- Node **20+** obligatorio.
- ESM obligatorio.
- Ningún secreto hardcodeado.
- Ningún endpoint escribe en chain sin validación previa.
- Ningún contrato on-chain hace trabajo que puede vivir off-chain.
- Telemetría cruda de SolarChain **no se sube on-chain**.
- Contratos de commodities **no centralizan todo en un solo UTxO**.
- Pyth solo se usa para pricing / settlement references, no para inventar datos físicos.

---

## 7. Checklist de implementación — 72 horas

## Hora 0 a 6
- [ ] Clonar repo
- [ ] Copiar `.env.example` a `.env`
- [ ] Levantar Postgres
- [ ] Verificar Blockfrost
- [ ] Verificar token Pyth
- [ ] Ejecutar API de health en ambos productos

## Hora 6 a 18
- [ ] Compilar Aiken
- [ ] Exportar `plutus.json`
- [ ] Conectar Lucid a PreProd
- [ ] Probar lectura de wallet / UTxOs
- [ ] Probar fetch de update firmado de Pyth

## Hora 18 a 36
- [ ] SolarChain: endpoint de batch + settlement
- [ ] Commodities: endpoint de acuerdo + settlement
- [ ] Persistencia de snapshots en Postgres
- [ ] Metadata para txs y eventos

## Hora 36 a 54
- [ ] Demo UI SolarChain
- [ ] Demo UI Commodities
- [ ] Integración API -> shared core -> chain builder
- [ ] Logs estructurados
- [ ] Manejo de errores y validaciones

## Hora 54 a 72
- [ ] Dry run end-to-end en PreProd
- [ ] QA funcional
- [ ] QA de seguridad
- [ ] Definir narrativa de pitch
- [ ] Congelar scope
- [ ] Preparar video/demo final

---

## 8. Runbook local

```bash
cp .env.example .env
docker compose up -d
npm install

npm run dev:solarchain:api
npm run dev:commodities:api
npm run dev:solarchain:web
npm run dev:commodities:web
```

---

## 9. Riesgos operativos que NO se permiten

- meter Haskell/Plutus como estándar base de hackathon
- reimplementar providers u oráculos por producto
- meter microservicios innecesarios
- subir documentos o telemetría completa on-chain
- centralizar el estado de commodities en un único UTxO

---

## 10. Entregable mínimo de cada producto

### SolarChain
- alta de batch energético
- snapshot off-chain
- settlement candidate
- tx builder de liquidación
- dashboard con generación / ahorro / equivalencia

### Tokenized Commodities
- alta de acuerdo
- pricing reference desde Pyth
- cálculo de settlement
- builder de tx de liquidación
- dashboard con posición, cap, floor y vencimiento

---

## Tokenized Commodities package notes

- Product docs: `docs/tokenized-commodities/`
- Example quote request: `examples/commodity-quote-request.json`
- Example dispute request: `examples/commodity-dispute-request.json`
- API port: `4020`
- Web port: `3001`
