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

-- | CommodityOracle.hs: Integración TOTAL con Pyth Network Lazer
--   Ambiente: Cardano PreProd
--   Policy ID Integrado: d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6
--   Buildathon Cardano + Pyth Network — Buenos Aires, 2026.

module CommodityOracle
  ( CommodityFeedId (..)
  , CommodityFeedState (..)
  , CommodityOracleDatum (..)
  , CommodityOracleRedeemer (..)
  , pythPolicyId
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
-- CONSTANTES DE INTEGRACIÓN (PYTH PREPROD)
-- ---------------------------------------------------------------------------

-- | Policy ID entregado por los jueces para identificar el script de Pyth Lazer
{-# INLINABLE pythPolicyId #-}
pythPolicyId :: CurrencySymbol
pythPolicyId = "d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6"

-- | Ventana de validez para frescura: 2 minutos
{-# INLINABLE pythFreshnessMs #-}
pythFreshnessMs :: Integer
pythFreshnessMs = 120_000

-- | Confianza máxima aceptable: 1% (10,000 PPM)
{-# INLINABLE maxConfidencePPM #-}
maxConfidencePPM :: Integer
maxConfidencePPM = 10_000

-- ---------------------------------------------------------------------------
-- TIPOS DE DATOS
-- ---------------------------------------------------------------------------

data CommodityFeedId = FeedSoja | FeedMaiz | FeedTrigo
  deriving stock (Show, Generic, Eq)
  deriving anyclass (FromJSON, ToJSON)

PlutusTx.makeIsDataIndexed ''CommodityFeedId [('FeedSoja, 0), ('FeedMaiz, 1), ('FeedTrigo, 2)]
PlutusTx.makeLift ''CommodityFeedId

data CommodityFeedState = CommodityFeedState
  { cfsId             :: CommodityFeedId
  , cfsPriceCents     :: Integer
  , cfsConfidencePPM  :: Integer
  , cfsPublishTimeMs  :: POSIXTime
  , cfsOnChainTimeMs  :: POSIXTime
  , cfsExponent       :: Integer
  } deriving stock (Show, Generic)
    deriving anyclass (FromJSON, ToJSON)

PlutusTx.makeIsDataIndexed ''CommodityFeedState [('CommodityFeedState, 0)]
PlutusTx.makeLift ''CommodityFeedState

data CommodityOracleDatum = CommodityOracleDatum
  { codFeedSoja            :: CommodityFeedState
  , codFeedMaiz            :: CommodityFeedState
  , codFeedTrigo           :: CommodityFeedState
  , codAuthorizedRelayer   :: PubKeyHash
  , codOwner               :: PubKeyHash
  , codUpdateCount         :: Integer
  , codIsPaused            :: Bool
  } deriving stock (Show, Generic)
    deriving anyclass (FromJSON, ToJSON)

PlutusTx.makeIsDataIndexed ''CommodityOracleDatum [('CommodityOracleDatum, 0)]
PlutusTx.makeLift ''CommodityOracleDatum

data CommodityOracleRedeemer
  = UpdateFeeds
      { ufSojaPrice   :: Integer
      , ufMaizPrice   :: Integer
      , ufTrigoPrice  :: Integer
      , ufTimestamp   :: POSIXTime
      }
  | ChangeRelayer { crNewRelayer :: PubKeyHash }
  | PauseOracle { poPause :: Bool }
  deriving stock (Show, Generic)
  deriving anyclass (FromJSON, ToJSON)

PlutusTx.makeIsDataIndexed ''CommodityOracleRedeemer [('UpdateFeeds, 0), ('ChangeRelayer, 1), ('PauseOracle, 2)]
PlutusTx.makeLift ''CommodityOracleRedeemer

-- ---------------------------------------------------------------------------
-- FUNCIONES DE VALIDACIÓN
-- ---------------------------------------------------------------------------

{-# INLINABLE isPythFresh #-}
isPythFresh :: POSIXTime -> POSIXTime -> Bool
isPythFresh lastUpdate currentTime =
  getPOSIXTime (currentTime - lastUpdate) < pythFreshnessMs

{-# INLINABLE isPriceInRange #-}
isPriceInRange :: Integer -> Bool
isPriceInRange price = price >= 5000 && price <= 100000000

-- | Verifica que la transacción interactúa con el oráculo de Pyth autorizado
{-# INLINABLE validatesPythSource #-}
validatesPythSource :: TxInfo -> Bool
validatesPythSource info =
    -- Validamos que al menos un input o una referencia contenga el Policy ID de Pyth
    any (\i -> (Value.assetClassValueOf (txOutValue $ txInInfoResolved i) (AssetClass (pythPolicyId, "")) > 0)) (txInfoInputs info)
    || any (\ref -> (Value.assetClassValueOf (txOutValue $ txInInfoResolved ref) (AssetClass (pythPolicyId, "")) > 0)) (txInfoReferenceInputs info)

-- ---------------------------------------------------------------------------
-- VALIDADOR PRINCIPAL
-- ---------------------------------------------------------------------------

{-# INLINABLE mkValidator #-}
mkValidator :: CommodityOracleDatum -> CommodityOracleRedeemer -> ScriptContext -> Bool
mkValidator dat redeemer ctx =
  let info = scriptContextTxInfo ctx
  in case redeemer of
    UpdateFeeds sojaPrice maizPrice trigoPrice ts ->
      traceIfFalse "NOT_AUTHORIZED_RELAYER" (txSignedBy info (codAuthorizedRelayer dat)) &&
      traceIfFalse "ORACLE_PAUSED"           (not (codIsPaused dat)) &&
      traceIfFalse "INVALID_PYTH_SOURCE"     (validatesPythSource info) && -- INTEGRACIÓN POLIDY ID
      traceIfFalse "STALE_PRICE"             (isPythFresh ts (fromMilliSeconds (ivTo (txInfoValidRange info)))) &&
      traceIfFalse "SOJA_OUT_OF_RANGE"       (isPriceInRange sojaPrice) &&
      traceIfFalse "MAIZ_OUT_OF_RANGE"       (isPriceInRange maizPrice) &&
      traceIfFalse "TRIGO_OUT_OF_RANGE"      (isPriceInRange trigoPrice)

    ChangeRelayer newRelayer ->
      traceIfFalse "ONLY_OWNER_CAN_CHANGE"   (txSignedBy info (codOwner dat))

    PauseOracle _ ->
      traceIfFalse "ONLY_OWNER_CAN_PAUSE"    (txSignedBy info (codOwner dat))

-- ---------------------------------------------------------------------------
-- BOILERPLATE
-- ---------------------------------------------------------------------------

data CommodityOracle
instance Scripts.ValidatorTypes CommodityOracle where
  type instance DatumType    CommodityOracle = CommodityOracleDatum
  type instance RedeemerType CommodityOracle = CommodityOracleRedeemer

typedValidator :: Scripts.TypedValidator CommodityOracle
typedValidator = Scripts.mkTypedValidator @CommodityOracle
  $$(PlutusTx.compile [|| mkValidator ||])
  $$(PlutusTx.compile [|| wrap ||])
  where
    wrap = Scripts.wrapValidator @CommodityOracleDatum @CommodityOracleRedeemer

validator :: Validator
validator = Scripts.validatorScript typedValidator

validatorHash :: ValidatorHash
validatorHash = Scripts.validatorHash typedValidator

validatorAddress :: Address
validatorAddress = scriptHashAddress validatorHash