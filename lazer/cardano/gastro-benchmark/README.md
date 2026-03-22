# GastroBenchmark

`GastroBenchmark` es el microservicio de `Cuqui` para comparar ofertas de proveedores contra referencias internacionales de mercado.

La idea del sistema es simple: cuando un comerciante busca un producto dentro de `Cuqui`, no solo ve qué proveedor lo vende más barato, sino también cuánto está pagando por encima o por debajo del mercado internacional de la materia prima o commodity relacionada. Esa referencia se construye con Pyth sobre Cardano, con una arquitectura preparada para operar tanto off-chain como on-chain.

## Rol dentro de Cuqui
`Cuqui` es la plataforma principal.

`Cuqui` se encarga de:
- ingerir listas de precios de proveedores
- parsear PDFs, XLSX, DOCX, imágenes y mensajes
- normalizar productos y ofertas
- construir el catálogo comprador y la experiencia frontend

`GastroBenchmark` se encarga de:
- recibir productos u ofertas ya normalizadas desde `Cuqui`
- mapearlas a benchmarks internacionales de commodities cuando exista cobertura
- consultar precios Pyth
- calcular markup contra mercado internacional
- devolver snapshots, historial en USD y explicaciones listas para UI

En otras palabras: `Cuqui` es la plataforma; `GastroBenchmark` es la capa backend especializada que le agrega contexto de mercado internacional.

## Por qué Cardano + Pyth
Este proyecto nació para una hackathon y su base conceptual y técnica está en Cardano.

La intención del diseño es que esta capacidad de benchmark internacional viva sobre una arquitectura Cardano + Pyth:
- hoy, como microservicio backend que consulta y expone información útil para `Cuqui`
- mañana, también con validaciones y flujos on-chain más fuertes a medida que la cobertura de commodities en Pyth/Cardano madure

Por eso este repo conserva tanto la base on-chain como la capa off-chain:
- helpers e integración Cardano
- validadores Aiken
- cliente de precios Pyth
- servicio REST para consumo desde `Cuqui`

## Qué resuelve para el comerciante
Supongamos que un comerciante busca harina.

`Cuqui` puede mostrarle:
- qué proveedores la ofrecen
- a qué precio la ofrece cada uno
- cuál es el precio unitario normalizado

`GastroBenchmark` agrega:
- cuál es la referencia internacional relevante
- a qué valor está esa referencia en USD
- si el comerciante está pagando por encima, cerca o por debajo de esa referencia

La conclusión buscada no es “este proveedor es el más barato” solamente, sino:

“estoy pagando X% por encima o por debajo del mercado internacional para este insumo”.

## Limitación real hoy
La cobertura actual de commodities en Pyth/Cardano no incluye todos los productos gastronómicos que `Cuqui` puede parsear.

Eso significa que:
- algunos productos sí tendrán benchmark internacional
- otros solo podrán compararse con un proxy commodity
- muchos todavía no tendrán benchmark disponible

Eso no es un bug ni una inconsistencia del proyecto. Es parte explícita del diseño. El microservicio está preparado para crecer con la cobertura real de Pyth/Cardano sin prometer una precisión que hoy todavía no existe.

## Estado técnico actual
- Base Cardano preservada en `src/contract.ts`, `src/onchain-update.ts`, `src/transaction.ts` y los validadores Aiken
- Capa benchmark off-chain en `src/pyth.ts`, `src/benchmark-catalog.ts` y `src/benchmark-service.ts`
- API REST en `src/server.ts`
- Dashboard CLI para demo en `src/dashboard.ts`

## Flujo entre Cuqui y GastroBenchmark
1. `Cuqui` ingiere documentos de proveedores y extrae productos.
2. `Cuqui` normaliza nombres, unidades, precios y ofertas.
3. `Cuqui` consulta este microservicio con esa información normalizada.
4. `GastroBenchmark` responde con benchmark internacional, historial y comparación.
5. `Cuqui` renderiza ese resultado en el frontend para el comerciante.

## API
```text
GET  /health
GET  /feeds
GET  /benchmarks/latest
GET  /benchmarks/history?benchmarkId=3018&points=24
POST /compare/products
POST /compare/offers
```

### Input esperado desde Cuqui
```json
{
  "items": [
    {
      "catalogProductId": "prod_123",
      "productName": "Harina de maiz amarilla",
      "categoryRoot": "Harinas",
      "baseUnit": "kg",
      "baseUnitPrice": 0.22,
      "currency": "USD",
      "supplierName": "Molino Norte"
    }
  ]
}
```

### Respuesta ejemplo
```json
{
  "results": [
    {
      "benchmarkStatus": "matched",
      "comparisonStatus": "watch",
      "benchmarkKind": "direct_match",
      "comparisonUnit": "usd/kg",
      "comparisonPriceUsd": 0.177157,
      "markupPercent": 24.18,
      "explanation": "La comparacion usa un benchmark commodity disponible hoy en Pyth/Cardano y lo proyecta a la unidad normalizada del producto."
    }
  ]
}
```

## Estados relevantes de respuesta
- `matched`: hay benchmark internacional utilizable
- `market_closed_fallback_used`: se usó un punto histórico reciente
- `unit_not_comparable`: existe benchmark, pero no hay comparación confiable con la unidad normalizada actual
- `no_pyth_cardano_coverage`: el producto todavía no tiene cobertura en Pyth/Cardano
- `future_mapping_candidate`: existe idea de mapping, pero todavía no hay precio comparable útil

## Desarrollo
```bash
npm install
npm run serve
```

Dashboard:
```bash
npm run dashboard
```

Verificación:
```bash
npm test
npm run check
```

## Variables de entorno
- `PYTH_API_KEY`: requerida para snapshots e historial vía Pyth Lazer
- `PORT`: puerto HTTP del microservicio, por defecto `8080`
- `BLOCKFROST_KEY`: integración Cardano cuando se use la capa Lucid
- `WALLET_SEED`: integración Cardano para flujos on-chain

## Roadmap
- ampliar el catálogo de mappings producto -> commodity
- guardar historial persistente en USD por feed
- reforzar integración on-chain con Cardano
- consumir más commodities a medida que Pyth/Cardano se acerque a la cobertura del mercado web2
- mostrar estas comparaciones directamente dentro de `Cuqui` para comerciantes finales
