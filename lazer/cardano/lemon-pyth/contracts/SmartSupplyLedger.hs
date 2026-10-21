{-# LANGUAGE DataKinds             #-}
{-# LANGUAGE DeriveAnyClass        #-}
{-# LANGUAGE DeriveGeneric         #-}
{-# LANGUAGE FlexibleContexts      #-}
{-# LANGUAGE MultiParamTypeClasses #-}
{-# LANGUAGE NoImplicitPrelude     #-}
{-# LANGUAGE OverloadedStrings     #-}
{-# LANGUAGE ScopedTypeVariables   #-}
{-# LANGUAGE TemplateHaskell       #-}
{-# LANGUAGE TypeApplications      #-}
{-# LANGUAGE TypeFamilies          #-}
{-# LANGUAGE TypeOperators         #-}

-- | SmartSupplyLedger.hs: Contrato inteligente para commodities con ajuste automático de precio
--   Permite firmar contratos de compra-venta con precio indexado a Pyth Network.
--   Flujo: Acuerdo → Depósito → Liquidación (con ajuste automático si hay volatilidad)
--   Buildathon Cardano + Pyth Network — Buenos Aires, 22 de Marzo de 2026.

module SmartSupplyLedger
  ( CommodityType (..)
  , ContractStatus (..)
  , SmartSupplyDatum (..)
  , SmartSupplyRedeemer (..)
  , typedValidator
  , validator
  , validatorHash
  , validatorAddress
  ) where

import Data.Aeson           (FromJSON, ToJSON)
import GHC.Generics         (Generic)
import Ledger               hiding (singleton)
import Ledger.Ada           as Ada
import qualified Ledger.Typed.Scripts as Scripts
import Ledger.Value         as Value
import qualified PlutusTx
import PlutusTx.Prelude     hiding (Semigroup (..), unless)
import Prelude              (Show)

-- ---------------------------------------------------------------------------
-- TIPOS DE DATOS
-- ---------------------------------------------------------------------------

-- | Tipos de commodities soportadas
data CommodityType
  = Soja                      -- ^ Soja (Glycine max)
  | Maiz                      -- ^ Maíz
  | Trigo                     -- ^ Trigo
  deriving stock    (Show, Generic, Eq)
  deriving anyclass (FromJSON, ToJSON)

PlutusTx.makeIsDataIndexed ''CommodityType
  [ ('Soja,  0)
  , ('Maiz,  1)
  , ('Trigo, 2)
  ]
PlutusTx.makeLift ''CommodityType

-- | Estados del contrato
data ContractStatus
  = Agreed                    -- ^ Acuerdo firmado, esperando depósito
  | Deposited                 -- ^ Fondos en escrow, esperando fecha de liquidación
  | Settled                   -- ^ Liquidado, contrato cerrado
  deriving stock    (Show, Generic, Eq)
  deriving anyclass (FromJSON, ToJSON)

PlutusTx.makeIsDataIndexed ''ContractStatus
  [ ('Agreed,    0)
  , ('Deposited, 1)
  , ('Settled,   2)
  ]
PlutusTx.makeLift ''ContractStatus

-- | Datum principal del contrato
data SmartSupplyDatum = SmartSupplyDatum
  { -- Identificación del contrato
    ssdContractId           :: BuiltinByteString
    -- ^ ID único del contrato
  , ssdCommodity            :: CommodityType
    -- ^ Tipo de commodity (Soja/Maíz/Trigo)
    
    -- Partes del contrato
  , ssdVendor               :: PubKeyHash
    -- ^ Vendedor (productor/acopiador)
  , ssdBuyer                :: PubKeyHash
    -- ^ Comprador (industria/exportador)
  , ssdArbitrator           :: PubKeyHash
    -- ^ Árbitro que resuelve disputas si es necesario
    
    -- Detalles de la transacción
  , ssdQuantityTonnes       :: Integer
    -- ^ Cantidad en toneladas (× 1000 para precisión: 100 = 100,000)
  , ssdBasePriceUsdCents    :: Integer
    -- ^ Precio base en USD centavos. Ej: 30000 = $300/tonelada
  , ssdTotalBaseAmountUsdCents :: Integer
    -- ^ Monto total base = cantidad × precio (USD centavos)
    
    -- Ajuste de precio
  , ssdMinAdjustmentPct     :: Integer
    -- ^ Mínimo para activar ajuste. Ej: 500 = 5%
  , ssdMaxCap               :: Integer
    -- ^ Cap máximo de ajuste (piso). Ej: 1500 = 15% máximo abajo
  , ssdMaxFloor             :: Integer
    -- ^ Floor máximo de ajuste (techo). Ej: 1500 = 15% máximo arriba
    
    -- Línea de tiempo
  , ssdAgreementDateMs      :: POSIXTime
    -- ^ Fecha del acuerdo
  , ssdDeliveryDateMs       :: POSIXTime
    -- ^ Fecha esperada de entrega (trigger de liquidación)
  , ssdSettlementDateMs     :: POSIXTime
    -- ^ Fecha real de liquidación (llena al settlement)
    
    -- Estado y datos de liquidación
  , ssdStatus               :: ContractStatus
    -- ^ Estado actual del contrato
  , ssdPythPriceUsdCents    :: Integer
    -- ^ Precio de Pyth al momento del settlement (0 si no liquidado)
  , ssdFinalAdjustmentPct   :: Integer
    -- ^ Ajuste final aplicado (0 si no liquidado)
  , ssdFinalAmountUsdCents  :: Integer
    -- ^ Monto final pagado (base + ajuste)
  , ssdOracleRelayer        :: PubKeyHash
    -- ^ Oracle que proporciona feeds Pyth
  , ssdPaused               :: Bool
    -- ^ ¿Contrato pausado por arbitraje?
  } deriving stock    (Show, Generic)
    deriving anyclass (FromJSON, ToJSON)

PlutusTx.makeIsDataIndexed ''SmartSupplyDatum [('SmartSupplyDatum, 0)]
PlutusTx.makeLift ''SmartSupplyDatum

-- | Acciones que se pueden ejecutar
data SmartSupplyRedeemer
  = -- | Buyer acepta el acuerdo y firma
    AcceptAgreement
      { aaBuyerSignature :: PubKeyHash
      }
  | -- | Buyer deposita fondos en escrow
    DepositFunds
      { dfAmount :: Integer
      , dfTimestamp :: POSIXTime
      }
  | -- | Oracle relayer proporciona precio de Pyth
    UpdatePythPrice
      { uppPrice :: Integer
      , uppTimestamp :: POSIXTime
      }
  | -- | Liquidar contrato: calcular ajuste y liberar fondos
    SettleContract
      { scPythPrice :: Integer
      , scPythTimestamp :: POSIXTime
      , scVendorAddress :: Address
      }
  | -- | Arbitraje: pausar o reanudar por disputa
    Arbitrate
      { arbPause :: Bool
      }
  | -- | Cerrar contrato después de settlement
    CloseContract
  deriving stock    (Show, Generic)
  deriving anyclass (FromJSON, ToJSON)

PlutusTx.makeIsDataIndexed ''SmartSupplyRedeemer
  [ ('AcceptAgreement, 0)
  , ('DepositFunds,    1)
  , ('UpdatePythPrice, 2)
  , ('SettleContract,  3)
  , ('Arbitrate,       4)
  , ('CloseContract,   5)
  ]
PlutusTx.makeLift ''SmartSupplyRedeemer

-- ---------------------------------------------------------------------------
-- CONSTANTES
-- ---------------------------------------------------------------------------

-- | Ventana de validez para Pyth: 2 minutos
{-# INLINABLE pythFreshnessMs #-}
pythFreshnessMs :: Integer
pythFreshnessMs = 120_000

-- | Ventana de validez para timestamp de entrega: ±1 día
{-# INLINABLE deliveryWindowMs #-}
deliveryWindowMs :: Integer
deliveryWindowMs = 24 * 60 * 60 * 1000

-- ---------------------------------------------------------------------------
-- FUNCIONES DE VALIDACIÓN
-- ---------------------------------------------------------------------------

-- | Verifica que la transacción está firmada por una persona
{-# INLINABLE isSigned #-}
isSigned :: PubKeyHash -> TxInfo -> Bool
isSigned pkh info = txSignedBy info pkh

-- | Verifica que el dato de Pyth es reciente
{-# INLINABLE isPythFresh #-}
isPythFresh :: POSIXTime -> POSIXTime -> Bool
isPythFresh lastUpdate currentTime =
  getPOSIXTime (currentTime - lastUpdate) < pythFreshnessMs

-- | Calcula ajuste de precio basado en volatilidad
--   Formula: if |pythPrice - basePrice| >= minAdjust:
--              adjust = ((pythPrice - basePrice) / basePrice) * 10000
--            else:
--              adjust = 0
{-# INLINABLE calculateAdjustment #-}
calculateAdjustment :: Integer -> Integer -> Integer -> Integer
calculateAdjustment basePrice pythPrice minAdjustPct =
  let priceDiff = pythPrice - basePrice
      absDiff = if priceDiff < 0 then negate priceDiff else priceDiff
      -- Verificar si diferencia es >= minAdjust%
      adjustmentThreshold = (basePrice * minAdjustPct) `divide` 10000
  in
  if absDiff >= adjustmentThreshold
    then (priceDiff * 10000) `divide` basePrice
    else 0

-- | Aplica cap & floor al ajuste
{-# INLINABLE applyAdjustmentBounds #-}
applyAdjustmentBounds :: Integer -> Integer -> Integer -> Integer
applyAdjustmentBounds adjustment maxCap maxFloor =
  if adjustment < negate maxCap
    then negate maxCap
    else if adjustment > maxFloor
      then maxFloor
      else adjustment

-- | Calcula monto final con ajuste
{-# INLINABLE calculateFinalAmount #-}
calculateFinalAmount :: Integer -> Integer -> Integer
calculateFinalAmount baseAmount adjustmentPct =
  let factor = 10000 + adjustmentPct  -- 10000 = 1.0
  in (baseAmount * factor) `divide` 10000

-- ---------------------------------------------------------------------------
-- VALIDADOR PRINCIPAL
-- ---------------------------------------------------------------------------

{-# INLINABLE mkValidator #-}
mkValidator :: SmartSupplyDatum -> SmartSupplyRedeemer -> ScriptContext -> Bool
mkValidator dat redeemer ctx =
  let info        = scriptContextTxInfo ctx
      currentTime = ivTo (txInfoValidRange info)
  in
  case redeemer of

    -- ------------------------------------------------------------------
    -- ACEPTAR ACUERDO: solo buyer, contrato en estado Agreed
    -- ------------------------------------------------------------------
    AcceptAgreement buyer ->
      traceIfFalse "NOT_BUYER"           (isSigned buyer info)                    &&
      traceIfFalse "ALREADY_DEPOSITED"   (ssdStatus dat == Agreed)                &&
      traceIfFalse "NOT_PAUSED"          (not (ssdPaused dat))

    -- ------------------------------------------------------------------
    -- DEPOSITAR FONDOS: buyer deposita, contrato en Agreed
    -- ------------------------------------------------------------------
    DepositFunds amount ts ->
      traceIfFalse "NOT_BUYER"           (isSigned (ssdBuyer dat) info)           &&
      traceIfFalse "INVALID_AMOUNT"      (amount >= ssdTotalBaseAmountUsdCents dat) &&
      traceIfFalse "WRONG_STATUS"        (ssdStatus dat == Agreed)                &&
      traceIfFalse "NOT_PAUSED"          (not (ssdPaused dat))

    -- ------------------------------------------------------------------
    -- ACTUALIZAR PRECIO PYTH: solo relayer
    -- ------------------------------------------------------------------
    UpdatePythPrice price ts ->
      traceIfFalse "NOT_RELAYER"         (isSigned (ssdOracleRelayer dat) info)   &&
      traceIfFalse "INVALID_PRICE"       (price > 0)                             &&
      traceIfFalse "STALE_PYTH"          (isPythFresh ts (fromMilliSeconds (ivTo (txInfoValidRange info))))

    -- ------------------------------------------------------------------
    -- LIQUIDAR CONTRATO: calcular ajuste y liberar fondos
    -- ------------------------------------------------------------------
    SettleContract pythPrice pythTs vendorAddr ->
      traceIfFalse "NOT_RELAYER"         (isSigned (ssdOracleRelayer dat) info)   &&
      traceIfFalse "WRONG_STATUS"        (ssdStatus dat == Deposited)            &&
      traceIfFalse "STALE_PYTH"          (isPythFresh pythTs (fromMilliSeconds (ivTo (txInfoValidRange info)))) &&
      traceIfFalse "INVALID_PRICE"       (pythPrice > 0)                         &&
      traceIfFalse "BEFORE_DELIVERY"     (currentTime >= ssdDeliveryDateMs dat) &&
      traceIfFalse "TOO_LATE"            (getPOSIXTime (currentTime - ssdDeliveryDateMs dat) <= deliveryWindowMs)

    -- ------------------------------------------------------------------
    -- ARBITRAJE: pausar o reanudar por disputa
    -- ------------------------------------------------------------------
    Arbitrate pause ->
      traceIfFalse "NOT_ARBITRATOR"      (isSigned (ssdArbitrator dat) info)

    -- ------------------------------------------------------------------
    -- CERRAR CONTRATO: solo si está Settled
    -- ------------------------------------------------------------------
    CloseContract ->
      traceIfFalse "NOT_VENDOR"          (isSigned (ssdVendor dat) info)          &&
      traceIfFalse "NOT_SETTLED"         (ssdStatus dat == Settled)

-- | Wrapper para el template Haskell de Plutus
data SmartSupplyLedger
instance Scripts.ValidatorTypes SmartSupplyLedger where
  type instance DatumType    SmartSupplyLedger = SmartSupplyDatum
  type instance RedeemerType SmartSupplyLedger = SmartSupplyRedeemer

-- | Compiled typed validator
typedValidator :: Scripts.TypedValidator SmartSupplyLedger
typedValidator = Scripts.mkTypedValidator @SmartSupplyLedger
  $$(PlutusTx.compile [|| mkValidator ||])
  $$(PlutusTx.compile [|| wrap ||])
  where
    wrap = Scripts.wrapValidator @SmartSupplyDatum @SmartSupplyRedeemer

-- | Validator sin tipo (para serialización)
validator :: Validator
validator = Scripts.validatorScript typedValidator

-- | Hash del validator
validatorHash :: ValidatorHash
validatorHash = Scripts.validatorHash typedValidator

-- | Dirección on-chain del contrato
validatorAddress :: Address
validatorAddress = scriptHashAddress validatorHash

