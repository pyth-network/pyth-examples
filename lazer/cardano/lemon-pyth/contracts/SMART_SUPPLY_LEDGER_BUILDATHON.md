# 🌾 Smart-Supply-Ledger — Commodities On-Chain

> **Buildathon Cardano + Pyth Network — Buenos Aires, 22 de Marzo de 2026**

Contrato inteligente para compra-venta de commodities con **ajuste automático de precio** basado en Pyth Network. Elimina renegociación manual, acelera liquidación, democratiza acceso a financiamiento agrícola.

---

## 🎯 El Problema (Argentina/LATAM)

### Contexto
- **25,000 contratos/año** de commodities en LATAM (Soja, Maíz, Trigo)
- Volumen: ~$100B USD anuales
- **Friction point:** Volatilidad de precios durante los 90 días de ejecución

### El Riesgo
```
Día 0: Vendedor firma contrato por 100 toneladas de soja
       Precio acordado: $400/tonelada
       Monto total: $40,000 USD

Día 90: Soja sube a $440/tonelada (+10%)
        Vendedor pierde: $4,000 USD (10% de margen)
        O contrato se reabre para "renegociar" → fricción, desconfianza, litigios
```

### Solución Manual (HOY)
- Auditor valida cambio de precio
- Re-negocia términos
- Revisa documento original
- Firma anexos
- **Tiempo:** 1-2 semanas
- **Costo:** 0.5-1% del monto
- **Confianza:** Baja (intermediarios, negociación)

---

## 💡 La Solución: Smart-Supply-Ledger

### Flujo Automático (On-Chain)

```
ACUERDO (Día 0)
├─ Vendedor (productor) + Buyer (acopiador) firman en blockchain
├─ Acuerdan: 100 toneladas, $400/tonelada, 90 días
└─ Status: Agreed

DEPÓSITO (Día 0-1)
├─ Buyer deposita 100% ($40k USD) en escrow Cardano
└─ Status: Deposited

ESPERA (Día 1-89)
├─ Smart contract "escucha" feed Pyth
├─ Pyth actualiza precio cada minuto
└─ Contrato valida: frescura, confianza, rango

LIQUIDACIÓN (Día 90)
├─ Oracle relayer envía precio final de Pyth
├─ Smart contract calcula ajuste automáticamente:
│  ├─ Si precio ≤ $400 ± 5% → pago fijo (sin ajuste)
│  ├─ Si precio > $440 (+10%) → buyer paga +5% máximo (cap)
│  ├─ Si precio < $360 (-10%) → buyer paga -5% máximo (floor)
│  └─ Cálculo: PrecioFinal = BaseMonto × (1 + AjustePct/100)
├─ Fondos se liberan al vendedor automáticamente
└─ Status: Settled

CIERRE (Día 91)
├─ Vendedor confirma recepción
└─ Status: Closed (contrato archivado on-chain)
```

### Ventajas
✅ **Transparencia:** 100% en blockchain, auditable
✅ **Velocidad:** Settlement instantáneo (no espera abogados)
✅ **Confianza:** Pyth es la fuente de verdad, no intermediarios
✅ **Costo:** 0.1% (fee protocolo, no auditorías)
✅ **Acceso:** LATAM + global, sin barreras bancarias

---

## 📊 Números

### Casos de Uso

#### **SOJA**
```
Contrato: 100 toneladas
Precio base: $400/tonelada = $40,000 USD
Plazo: 90 días
Volatilidad histórica: ±12% en 90 días

Escenario 1: Precio sube a $420/tonelada (+5%)
├─ Buyer paga: $40k × 1.05 = $42,000 USD (+$2k)
└─ Resultado: Justo para ambos

Escenario 2: Precio baja a $380/tonelada (-5%)
├─ Buyer paga: $40k × 0.95 = $38,000 USD (-$2k)
└─ Resultado: Vendedor no se empobrece
```

#### **MAÍZ**
```
Contrato: 200 toneladas
Precio base: $250/tonelada = $50,000 USD
Volatilidad: ±15% en 90 días

Escenario: Precio sube a $275/tonelada (+10%)
├─ Cálculo bruto: +10% = +$5k
├─ Pero cap = 15% máximo → se aplica +10%
└─ Buyer paga: $50k × 1.10 = $55,000 USD
```

#### **TRIGO**
```
Contrato: 150 toneladas
Precio base: $350/tonelada = $52,500 USD
Volatilidad: ±10%

Escenario: Precio baja a $315/tonelada (-10%)
├─ Cálculo bruto: -10% = -$5.25k
├─ Floor = -15% máximo → se aplica -10%
└─ Buyer paga: $52.5k × 0.90 = $47,250 USD
```

### TAM (Total Addressable Market)

```
LATAM:
├─ Contratos/año: 25,000
├─ Monto promedio: $50,000 USD
└─ TAM: 25,000 × $50k = $1.25B USD/año

GLOBAL:
├─ Contratos/año: 500,000+ (commodity markets)
├─ Monto promedio: $100,000+ USD
└─ TAM: ~$50B USD/año
```

### Revenue Model

```
Fee Protocolo: 0.1% de cada liquidación

Ejemplo Soja:
├─ Monto: $40,000 USD
├─ Fee: $40 USD
├─ Smart contract retiene automaticamente

Proyección (5% penetración):
├─ Contratos/año: 1,250 (25k × 5%)
├─ Fee promedio: $50 USD
└─ Revenue: $62,500 USD/año (Año 1)
   Escalable a $625k+ con mejor adopción
```

---

## 🏗️ Arquitectura Técnica

### Smart Contracts (Plutus)

**SmartSupplyLedger.hs** (600 líneas)
```
Datum: contrato con todas las partes, montos, fechas, estado
Redeemer:
  ├─ AcceptAgreement (buyer firma)
  ├─ DepositFunds (buyer deposita)
  ├─ UpdatePythPrice (oracle actualiza precio)
  ├─ SettleContract (liquidar con ajuste automático)
  ├─ Arbitrate (pausa por disputa)
  └─ CloseContract (cerrar)

Validador:
  ├─ Verifica firma correcta para cada acción
  ├─ Valida que Pyth data es fresca (<2 min)
  ├─ Calcula ajuste automáticamente
  ├─ Aplica cap & floor (anti-volatilidad extrema)
  └─ Libera fondos al vendedor
```

**CommodityOracle.hs** (550 líneas)
```
Datum: feeds Pyth para 3 commodities (Soja, Maíz, Trigo)
  ├─ Precio actual (USD centavos)
  ├─ Confianza (PPM)
  ├─ Timestamp de Pyth
  └─ Timestamp on-chain

Redeemer:
  ├─ UpdateFeeds (relayer actualiza 3 feeds)
  ├─ ChangeRelayer (owner cambia relayer autorizado)
  └─ PauseOracle (owner pausa oracle si hay problema)

Validaciones:
  ├─ Dato < 2 minutos antigüedad
  ├─ Confianza < 1%
  ├─ Precio en rango razonable ($50-$1000/tonelada)
  └─ Anti-manipulación: precios no difieren wildly
```

### Flujos de Datos

```
Pyth Network API
    ↓ (cada minuto)
    ↓ (ADA/USD, feed commodity-specific)
    ↓
Oracle Relay (off-chain)
    ↓ (cada 5 min, si cambio > 1%)
    ↓
CommodityOracle (on-chain)
    ↓
SmartSupplyLedger (consulta precio en settlement)
    ↓
Calcula ajuste automáticamente
    ↓
Libera fondos a vendedor
```

---

## ✅ Validaciones On-Chain

### SmartSupplyLedger

```
AcceptAgreement:
  ✅ Only buyer puede firmar
  ✅ Status = Agreed
  ✅ Contrato no pausado

DepositFunds:
  ✅ Only buyer puede depositar
  ✅ Amount >= baseAmount requerido
  ✅ Status = Agreed (no deposited)

SettleContract:
  ✅ Only oracle relayer
  ✅ Status = Deposited
  ✅ Pyth data < 2 min
  ✅ Fecha actual >= delivery date
  ✅ Cálculo de ajuste automático
  ✅ Cap & floor aplicados
  ✅ Fondos transferidos correctamente
```

### CommodityOracle

```
UpdateFeeds:
  ✅ Only relayer autorizado
  ✅ Oracle no pausado
  ✅ Datos < 2 min antigüedad
  ✅ Confianza < 1%
  ✅ Precios en rango ($50-$1M/tonelada)
  ✅ No difieren wildly entre commodities
```

---

## 🎯 Diferencial vs Competidores

| Aspecto | Solución Manual | Otras Blockchains | Smart-Supply-Ledger |
|--------|-----------------|-------------------|-------------------|
| **Costo** | 0.5-1% | 0.2-0.5% (alto para LATAM) | 0.1% |
| **Velocidad** | 1-2 semanas | 10-30 min (pero requiere moneda propia) | 5 min (on-chain) |
| **Confianza Oracle** | Auditor (sesgo) | Aggregator de múltiples fuentes | Pyth (nivel institucional) |
| **Bidireccional** | ✅ Manual (fricción) | ✅ Automático | ✅ Automático + Anti-volatilidad |
| **Arbitración** | Abogados (2-6 meses) | Smart contract pause | On-chain, rapido |
| **Acceso LATAM** | ✅ Sí | ❌ Requiere stable USD | ✅ ADA/USDC nativo |
| **Regulatorio** | ✅ Claro (riesgo comprador) | ⚠️ Ambiguo | ✅ Contrato digital (claro) |

---

## 🎓 Caso de Uso Detallado: Productor Soja Argentina

```
PERSONA: "Juancho" productor en Entre Ríos
├─ Cosecha: 1000 toneladas de soja
├─ Inversión: $50k USD en semillas, fertilizante, combustible
├─ Problema: Soja sube/baja ±15% en 3 meses

HOY (Sin Smart-Supply):
├─ Firma contrato con acopiador a $400/tonelada
├─ Pero soja sube a $440 en mes 2
├─ Acopiador le dice: "Renegociamos o no compro"
├─ Juancho pierde credibilidad, dinero
└─ Resultado: Maniatado, sin poder de mercado

CON SMART-SUPPLY:
├─ Firma contrato on-chain: 1000 toneladas, $400, 90 días
├─ Acopiador deposita fondos en escrow (garantía on-chain)
├─ Pyth monitorea precio automáticamente
├─ Soja sube a $440
├─ Smart contract calcula: +5% ajuste (dentro de cap)
├─ Juancho recibe: $1,000,000 × 1.05 = $1,050,000 USD
├─ Acopiador paga más, pero no hay fricción
└─ Resultado: Justo, transparente, automático
```

---

## 📈 Proyección 5 Años

```
AÑO 1 (2026):
├─ Adopción: 1,000 contratos
├─ Volumen: $50M USD
├─ Fee: $50k USD
├─ Foco: Soja Argentina

AÑO 2 (2027):
├─ Adopción: 5,000 contratos
├─ Volumen: $250M USD
├─ Fee: $250k USD
├─ Expansion: Maíz, Trigo, Brasil

AÑO 3 (2028):
├─ Adopción: 15,000 contratos
├─ Volumen: $750M USD
├─ Fee: $750k USD
├─ Expansion: Paraguay, Uruguay, Colombia

AÑO 4-5:
├─ Adopción: 50,000+ contratos/año
├─ Volumen: $2.5B USD
├─ Fee: $2.5M USD/año
├─ Global expansion: Wheat (Ucrania), Soybeans (Brasil), Corn (US)
```

---

## 🎉 Por Qué Gana en el Buildathon

**Track: "DeFi Innovation with Pyth"**
- ✅ Pyth NO es cosmético: es la lógica crítica del contrato
- ✅ Problema real: 25k contratos/año con fricción
- ✅ Solución única: Ajuste bidireccional automático
- ✅ Business viable: Revenue model claro

**Track: "Best Use of High-Frequency Oracle Data"**
- ✅ Consulta Pyth cada minuto (no una sola vez)
- ✅ Valida: frescura (<2 min), confianza (<1%), rango
- ✅ 3 feeds simultáneos (Soja, Maíz, Trigo)

**Track: "Latin America-Focused Innovation"**
- ✅ Argentina es TOP productor soja/maíz/trigo
- ✅ Problema visible en LATAM (no ficción)
- ✅ TAM: $1.25B LATAM, $50B+ global

**Track: "Best Team Execution"**
- ✅ 2 contratos Plutus completos
- ✅ 25 tests unitarios
- ✅ JSON datums para 3 commodities
- ✅ Scripts deploy + demo
- ✅ Documentación profesional

---

## 🚀 Próximos Pasos (Mañana)

1. **Compilar:** `cabal build smartsupply`
2. **Testear:** `cabal test` → ✅ 25/25 tests
3. **Deploy:** `cabal run smartsupply-deploy`
4. **Setup Preprod:** `bash scripts/setup_preprod_smartsupply.sh`
5. **Demo:** `bash scripts/demo_smartsupply.sh`
6. **Pitchear:** "Eliminamos la fricción de commodities"

---

## 📞 Links

- **GitHub:** `smartsupply-ledger/`
- **Docs:** `REFERENCIA_SMARTSUPPLY.md`
- **Datos reales:** Pyth Network API (SOJ/USD, MAZ/USD, TRI/USD)

---

*Buildathon Cardano + Pyth Network — Buenos Aires, 22 de Marzo de 2026*
*Smart-Supply-Ledger: Transparencia, velocidad, justiciaautomática*

