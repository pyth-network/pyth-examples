{-# LANGUAGE DataKinds #-}
{-# LANGUAGE DeriveAnyClass #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE NoImplicitPrelude #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE TemplateHaskell #-}
{-# LANGUAGE TypeApplications #-}
{-# LANGUAGE TypeFamilies #-}

-- | Deploy.hs: Serialización de contratos Smart-Supply-Ledger
--   Ejecutar: cabal run smartsupply-deploy

module Main where

import Cardano.Api
import Cardano.Api.Shelley (PlutusScript (..))
import Codec.Serialise (serialise)
import Data.ByteString.Lazy qualified as LBS
import Data.ByteString.Short qualified as SBS
import System.Directory (createDirectoryIfMissing)
import System.FilePath ((</>))

import SmartSupplyLedger
import CommodityOracle

main :: IO ()
main = do
  putStrLn "🔨 Smart-Supply-Ledger — Compilando y serializando contratos..."
  putStrLn ""

  createDirectoryIfMissing True "scripts/out"

  putStrLn "📝 SmartSupplyLedger.hs → smart-supply-ledger.plutus"
  writeSmartSupplyScript "scripts/out" "smart-supply-ledger.plutus"

  putStrLn "📝 CommodityOracle.hs → commodity-oracle.plutus"
  writeOracleScript "scripts/out" "commodity-oracle.plutus"

  putStrLn ""
  putStrLn "✅ Serialización completada:"
  putStrLn "   scripts/out/smart-supply-ledger.plutus"
  putStrLn "   scripts/out/commodity-oracle.plutus"
  putStrLn ""
  putStrLn "🎉 Listos para: bash scripts/setup_preprod_smartsupply.sh"
  putStrLn ""

writeSmartSupplyScript :: FilePath -> FilePath -> IO ()
writeSmartSupplyScript outDir filename = do
  let scriptFile = outDir </> filename
  let plutusScript = SmartSupplyLedger.validator
  let plutusScriptShort =
        PlutusScriptV2 $
        PlutusScript $
        SBS.toShort $
        LBS.toStrict $
        serialise plutusScript

  case writeFileTextEnvelope scriptFile Nothing plutusScriptShort of
    Left err ->
      putStrLn $ "❌ Error escribiendo " ++ scriptFile ++ ": " ++ displayError err
    Right () ->
      putStrLn $ "   ✅ " ++ scriptFile

writeOracleScript :: FilePath -> FilePath -> IO ()
writeOracleScript outDir filename = do
  let scriptFile = outDir </> filename
  let plutusScript = CommodityOracle.validator
  let plutusScriptShort =
        PlutusScriptV2 $
        PlutusScript $
        SBS.toShort $
        LBS.toStrict $
        serialise plutusScript

  case writeFileTextEnvelope scriptFile Nothing plutusScriptShort of
    Left err ->
      putStrLn $ "❌ Error escribiendo " ++ scriptFile ++ ": " ++ displayError err
    Right () ->
      putStrLn $ "   ✅ " ++ scriptFile

displayError :: Error -> String
displayError (FileIOError _ e) = show e
displayError e = show e

