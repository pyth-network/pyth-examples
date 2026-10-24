import * as Data from "../Data.js"
import * as TSchema from "../TSchema.js"

/**
 * Verification Key Hash (28 bytes)
 */
export const VerificationKeyHash = TSchema.ByteArray

/**
 * Script Hash (28 bytes)
 */
export const ScriptHash = TSchema.ByteArray

/**
 * Credential - Either a verification key hash or script hash
 */
export const Credential = TSchema.Variant({
  VerificationKey: {
    hash: VerificationKeyHash
  },
  Script: {
    hash: ScriptHash
  }
})

/**
 * Payment Credential - Used for payment addresses
 */
export const PaymentCredential = TSchema.Variant({
  VerificationKey: {
    hash: VerificationKeyHash
  },
  Script: {
    hash: ScriptHash
  }
})

/**
 * Stake Credential - Either inline credential or pointer
 */
export const StakeCredential = TSchema.Variant({
  Inline: {
    credential: Credential
  },
  Pointer: {
    slot_number: TSchema.Integer,
    transaction_index: TSchema.Integer,
    certificate_index: TSchema.Integer
  }
})

// Export codec objects with all conversion functions
export const CredentialCodec = Data.withSchema(Credential)
export const PaymentCredentialCodec = Data.withSchema(PaymentCredential)
export const StakeCredentialCodec = Data.withSchema(StakeCredential)
export const VerificationKeyHashCodec = Data.withSchema(VerificationKeyHash)
export const ScriptHashCodec = Data.withSchema(ScriptHash)

// Type exports
export type Credential = typeof Credential.Type
export type PaymentCredential = typeof PaymentCredential.Type
export type StakeCredential = typeof StakeCredential.Type
export type VerificationKeyHash = typeof VerificationKeyHash.Type
export type ScriptHash = typeof ScriptHash.Type
