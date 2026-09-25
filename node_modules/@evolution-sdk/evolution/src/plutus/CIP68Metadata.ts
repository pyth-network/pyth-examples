/**
 * CIP-68 Datum Metadata Standard for NFTs and tokens
 * @see https://cips.cardano.org/cip/CIP-68
 *
 * CIP-68 defines a metadata standard using datum in UTxOs.
 * The basic pattern uses two tokens:
 * - Reference NFT (label 100): Locked in UTxO with datum containing metadata
 * - User Token (labels 222/333/444): The actual transferable token in user's wallet
 *
 * The datum structure is: Constr(0, [metadata, version, extra])
 * - metadata: Arbitrary PlutusData (structure depends on token class)
 * - version: Integer version number
 * - extra: Custom user-defined PlutusData
 */

import { Schema } from "effect"

import * as Data from "../Data.js"
import * as TSchema from "../TSchema.js"

/**
 * CIP-68 Datum Structure
 *
 * datum = Constr(0, [metadata, version, extra])
 *
 * - metadata: Arbitrary PlutusData - structure varies by token class:
 *   - 222 (NFT): Map with name, image, description, files (CIP-25 structure)
 *   - 333 (FT): Map with name, description, ticker, url, decimals, logo
 *   - 444 (RFT): Map combining NFT + FT fields plus decimals
 * - version: 1, 2, or 3 depending on token class
 * - extra: Custom plutus data (minimum Unit/Void)
 */
export const CIP68Datum = TSchema.Struct({
  metadata: Schema.typeSchema(Data.DataSchema),
  version: TSchema.Integer,
  extra: TSchema.Array(Schema.typeSchema(Data.DataSchema))
})

// Export codec with all conversion functions
export const Codec = Data.withSchema(CIP68Datum)

// Type export
export type CIP68Datum = typeof CIP68Datum.Type

/**
 * CIP-68 Reference Token Label (100 in hex)
 */
export const REFERENCE_TOKEN_LABEL = 100

/**
 * CIP-68 NFT Token Label (222 in hex)
 */
export const NFT_TOKEN_LABEL = 222

/**
 * CIP-68 FT (Fungible Token) Label (333 in hex)
 */
export const FT_TOKEN_LABEL = 333

/**
 * CIP-68 RFT (Rich Fungible Token) Label (444 in hex)
 */
export const RFT_TOKEN_LABEL = 444
