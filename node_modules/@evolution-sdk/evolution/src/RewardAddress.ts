import { FastCheck, Schema } from "effect"

/**
 * Reward address format schema (human-readable addresses)
 * Following CIP-0019 encoding requirements
 *
 * @since 2.0.0
 * @category schemas
 */
export const RewardAddress = Schema.String.pipe(
  Schema.pattern(/^(stake|stake_test)[1][a-z0-9]+$/i),
  Schema.brand("RewardAddress")
).annotations({
  identifier: "RewardAddress"
})

/**
 * Type representing a reward/stake address string in bech32 format
 *
 * @since 2.0.0
 * @category model
 */
export type RewardAddress = typeof RewardAddress.Type

/**
 * Check if the given value is a valid RewardAddress
 *
 * @since 2.0.0
 * @category predicates
 */
export const isRewardAddress = Schema.is(RewardAddress)

/**
 * FastCheck arbitrary for generating random RewardAddress instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.string({ minLength: 50, maxLength: 100 })
  .filter((str) => /^(stake|stake_test)[1][a-z0-9]+$/i.test(str))
  .map((str) => RewardAddress.make(str))
