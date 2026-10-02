import { FastCheck, Schema } from "effect"

/**
 * Plutus languages supported in cost models.
 *
 * CDDL: language = 0 / 1 / 2  ; plutus_v1 / plutus_v2 / plutus_v3
 *
 * @since 2.0.0
 */
export const Language = Schema.Literal("PlutusV1", "PlutusV2", "PlutusV3")
export type Language = typeof Language.Type

export const CDDLSchema = Schema.Literal(0n, 1n, 2n)

export const FromCDDL = Schema.transform(CDDLSchema, Schema.typeSchema(Language), {
  strict: true,
  encode: (lang) => {
    switch (lang) {
      case "PlutusV1":
        return 0n
      case "PlutusV2":
        return 1n
      case "PlutusV3":
        return 2n
    }
  },
  decode: (tag) => {
    switch (tag) {
      case 0n:
        return "PlutusV1"
      case 1n:
        return "PlutusV2"
      case 2n:
        return "PlutusV3"
    }
  }
})

export const arbitrary: FastCheck.Arbitrary<Language> = FastCheck.oneof(
  FastCheck.constant("PlutusV1" as const),
  FastCheck.constant("PlutusV2" as const),
  FastCheck.constant("PlutusV3" as const)
)

// Simple helpers
export const toCDDL = (lang: Language): bigint => Schema.encodeSync(FromCDDL)(lang)
export const fromCDDL = (tag: 0n | 1n | 2n): Language => Schema.decodeSync(FromCDDL)(tag)
