import type * as CoreAddress from "../../../Address.js"
import type * as Anchor from "../../../Anchor.js"
import type * as CoreAssets from "../../../Assets/index.js"
import type * as Credential from "../../../Credential.js"
import type * as CoreDatumOption from "../../../DatumOption.js"
import type * as DRep from "../../../DRep.js"
import type * as EpochNo from "../../../EpochNo.js"
import type * as GovernanceAction from "../../../GovernanceAction.js"
import type * as KeyHash from "../../../KeyHash.js"
import type * as Metadata from "../../../Metadata.js"
import type * as PoolKeyHash from "../../../PoolKeyHash.js"
import type * as PoolParams from "../../../PoolParams.js"
import type * as RewardAccount from "../../../RewardAccount.js"
import type * as CoreScript from "../../../Script.js"
import type * as Time from "../../../Time/index.js"
import type * as TransactionMetadatum from "../../../TransactionMetadatum.js"
import type * as UTxO from "../../../UTxO.js"
import type * as VotingProcedures from "../../../VotingProcedures.js"
import type * as RedeemerBuilder from "../RedeemerBuilder.js"

// ============================================================================
// Operation Parameter Types
// ============================================================================

/**
 * Parameters for setting transaction validity interval.
 *
 * Both bounds are optional:
 * - `from`: Transaction is valid after this time (validityIntervalStart)
 * - `to`: Transaction expires after this time (ttl)
 *
 * Times are in Unix milliseconds and will be converted to slots based on network config.
 *
 * @since 2.0.0
 * @category validity
 */
export interface ValidityParams {
  /** Transaction valid after this Unix time (milliseconds). Converted to slot. */
  readonly from?: Time.UnixTime
  /** Transaction expires after this Unix time (milliseconds). Converted to slot. */
  readonly to?: Time.UnixTime
}

export interface PayToAddressParams {
  readonly address: CoreAddress.Address
  readonly assets: CoreAssets.Assets
  readonly datum?: CoreDatumOption.DatumOption
  /** Optional script to store as a reference script in the output */
  readonly script?: CoreScript.Script
}

/**
 * Parameters for collectFrom operation.
 *
 * The redeemer supports three modes:
 * - **Static**: Direct `Data` value when index isn't needed
 * - **Self**: `(input: IndexedInput) => Data` callback for per-input redeemers
 * - **Batch**: `{ all: (inputs) => Data, inputs: UTxO[] }` for multi-input coordination
 *
 * @since 2.0.0
 */
export interface CollectFromParams {
  /** UTxOs to consume as transaction inputs */
  readonly inputs: ReadonlyArray<UTxO.UTxO>
  /** Optional redeemer for script-locked UTxOs (static, self, or batch mode) */
  readonly redeemer?: RedeemerBuilder.RedeemerArg
  /** Optional label for debugging script failures - identifies this operation in error messages */
  readonly label?: string
}

export interface ReadFromParams {
  readonly referenceInputs: ReadonlyArray<UTxO.UTxO> // Mandatory: UTxOs to read as reference inputs
}

/**
 * Parameters for mint operation.
 *
 * The redeemer supports three modes:
 * - **Static**: Direct `Data` value when index isn't needed
 * - **Self**: `(input: IndexedInput) => Data` callback (index is policy index)
 * - **Batch**: `{ all: (inputs) => Data, inputs: UTxO[] }` for multi-policy coordination
 *
 * @since 2.0.0
 */
export interface MintTokensParams {
  /** Tokens to mint (positive) or burn (negative), excluding lovelace */
  readonly assets: CoreAssets.Assets
  /** Optional redeemer for Plutus minting policies (static, self, or batch mode) */
  readonly redeemer?: RedeemerBuilder.RedeemerArg
  /** Optional label for debugging script failures - identifies this operation in error messages */
  readonly label?: string
}

// ============================================================================
// Phase 1: Basic Staking Operations
// ============================================================================

/**
 * Parameters for registering a stake credential.
 *
 * Registers a stake credential on-chain, enabling delegation and rewards.
 * Requires paying a deposit (currently 2 ADA on mainnet).
 *
 * @since 2.0.0
 * @category staking
 */
export interface RegisterStakeParams {
  /** The stake credential to register (key hash or script hash) */
  readonly stakeCredential: Credential.Credential
  /** Redeemer for script-controlled stake credentials */
  readonly redeemer?: RedeemerBuilder.RedeemerArg
  /** Optional label for debugging script failures - identifies this operation in error messages */
  readonly label?: string
}

/**
 * Parameters for deregistering a stake credential.
 *
 * Removes a stake credential from the chain and reclaims the deposit.
 * Must withdraw all rewards before deregistering.
 *
 * @since 2.0.0
 * @category staking
 */
export interface DeregisterStakeParams {
  /** The stake credential to deregister */
  readonly stakeCredential: Credential.Credential
  /** Redeemer for script-controlled stake credentials */
  readonly redeemer?: RedeemerBuilder.RedeemerArg
  /** Optional label for debugging script failures - identifies this operation in error messages */
  readonly label?: string
}

/**
 * Parameters for delegating stake and/or voting power.
 *
 * Supports three delegation modes:
 * - **Stake only**: Provide `poolKeyHash` to delegate to a stake pool
 * - **Vote only**: Provide `drep` to delegate voting power (Conway)
 * - **Both**: Provide both for combined stake + vote delegation
 *
 * @deprecated Use delegateToPool, delegateToDRep, or delegateToPoolAndDRep instead
 * @since 2.0.0
 * @category staking
 */
export interface DelegateToParams {
  /** The stake credential delegating */
  readonly stakeCredential: Credential.Credential
  /** Pool to delegate stake to (optional) */
  readonly poolKeyHash?: PoolKeyHash.PoolKeyHash
  /** DRep to delegate voting power to (optional, Conway) */
  readonly drep?: DRep.DRep
  /** Redeemer for script-controlled stake credentials */
  readonly redeemer?: RedeemerBuilder.RedeemerArg
  /** Optional label for debugging script failures - identifies this operation in error messages */
  readonly label?: string
}

/**
 * Parameters for delegating stake to a pool.
 *
 * Creates a StakeDelegation certificate.
 *
 * @since 2.0.0
 * @category staking
 */
export interface DelegateToPoolParams {
  /** The stake credential delegating */
  readonly stakeCredential: Credential.Credential
  /** Pool to delegate stake to */
  readonly poolKeyHash: PoolKeyHash.PoolKeyHash
  /** Redeemer for script-controlled stake credentials */
  readonly redeemer?: RedeemerBuilder.RedeemerArg
  /** Optional label for debugging script failures - identifies this operation in error messages */
  readonly label?: string
}

/**
 * Parameters for delegating voting power to a DRep.
 *
 * Creates a VoteDelegCert certificate (Conway era).
 *
 * @since 2.0.0
 * @category staking
 */
export interface DelegateToDRepParams {
  /** The stake credential delegating */
  readonly stakeCredential: Credential.Credential
  /** DRep to delegate voting power to */
  readonly drep: DRep.DRep
  /** Redeemer for script-controlled stake credentials */
  readonly redeemer?: RedeemerBuilder.RedeemerArg
  /** Optional label for debugging script failures - identifies this operation in error messages */
  readonly label?: string
}

/**
 * Parameters for delegating both stake and voting power.
 *
 * Creates a StakeVoteDelegCert certificate (Conway era).
 *
 * @since 2.0.0
 * @category staking
 */
export interface DelegateToPoolAndDRepParams {
  /** The stake credential delegating */
  readonly stakeCredential: Credential.Credential
  /** Pool to delegate stake to */
  readonly poolKeyHash: PoolKeyHash.PoolKeyHash
  /** DRep to delegate voting power to */
  readonly drep: DRep.DRep
  /** Redeemer for script-controlled stake credentials */
  readonly redeemer?: RedeemerBuilder.RedeemerArg
  /** Optional label for debugging script failures - identifies this operation in error messages */
  readonly label?: string
}

/**
 * Parameters for withdrawing staking rewards.
 *
 * Withdraws accumulated rewards from a stake credential.
 * Use amount: 0n to trigger a stake validator without withdrawing rewards
 * (useful for the coordinator pattern).
 *
 * @since 2.0.0
 * @category staking
 */
export interface WithdrawParams {
  /** The stake credential to withdraw from */
  readonly stakeCredential: Credential.Credential
  /** Amount of lovelace to withdraw */
  readonly amount: bigint
  /** Redeemer for script-controlled stake credentials */
  readonly redeemer?: RedeemerBuilder.RedeemerArg
  /** Optional label for debugging script failures - identifies this operation in error messages */
  readonly label?: string
}

// ============================================================================
// Phase 3: Combined Register + Delegate (Conway)
// ============================================================================

/**
 * Parameters for registering AND delegating in a single certificate.
 *
 * Combines registration and delegation into one certificate, saving fees.
 * Available in Conway era onwards.
 *
 * @since 2.0.0
 * @category staking
 */
export interface RegisterAndDelegateToParams {
  /** The stake credential to register and delegate */
  readonly stakeCredential: Credential.Credential
  /** Pool to delegate stake to (optional) */
  readonly poolKeyHash?: PoolKeyHash.PoolKeyHash
  /** DRep to delegate voting power to (optional) */
  readonly drep?: DRep.DRep
  /** Redeemer for script-controlled stake credentials */
  readonly redeemer?: RedeemerBuilder.RedeemerArg
  /** Optional label for debugging script failures - identifies this operation in error messages */
  readonly label?: string
}

// ============================================================================
// Phase 4: DRep Management (Conway)
// ============================================================================

/**
 * Parameters for registering as a DRep.
 *
 * Registers a credential as a Delegated Representative for governance.
 * Requires paying a deposit.
 *
 * @since 2.0.0
 * @category governance
 */
export interface RegisterDRepParams {
  /** The credential to register as a DRep */
  readonly drepCredential: Credential.Credential
  /** Optional metadata anchor (URL + hash) */
  readonly anchor?: Anchor.Anchor
  /** Redeemer for script-controlled DRep credentials */
  readonly redeemer?: RedeemerBuilder.RedeemerArg
  /** Optional label for debugging script failures - identifies this operation in error messages */
  readonly label?: string
}

/**
 * Parameters for updating DRep metadata.
 *
 * Updates the anchor (metadata URL + hash) for a registered DRep.
 *
 * @since 2.0.0
 * @category governance
 */
export interface UpdateDRepParams {
  /** The DRep credential to update */
  readonly drepCredential: Credential.Credential
  /** New metadata anchor (URL + hash) */
  readonly anchor?: Anchor.Anchor
  /** Redeemer for script-controlled DRep credentials */
  readonly redeemer?: RedeemerBuilder.RedeemerArg
  /** Optional label for debugging script failures - identifies this operation in error messages */
  readonly label?: string
}

/**
 * Parameters for deregistering as a DRep.
 *
 * Removes DRep registration and reclaims the deposit.
 *
 * @since 2.0.0
 * @category governance
 */
export interface DeregisterDRepParams {
  /** The DRep credential to deregister */
  readonly drepCredential: Credential.Credential
  /** Redeemer for script-controlled DRep credentials */
  readonly redeemer?: RedeemerBuilder.RedeemerArg
  /** Optional label for debugging script failures - identifies this operation in error messages */
  readonly label?: string
}

// ============================================================================
// Phase 5: Constitutional Committee (Conway)
// ============================================================================

/**
 * Parameters for authorizing a committee hot credential.
 *
 * Authorizes a hot credential to act on behalf of a cold committee credential.
 * The cold credential is kept offline for security; the hot credential signs
 * governance actions.
 *
 * @since 2.0.0
 * @category governance
 */
export interface AuthCommitteeHotParams {
  /** The cold credential (offline, secure) */
  readonly coldCredential: Credential.Credential
  /** The hot credential to authorize (online, signing) */
  readonly hotCredential: Credential.Credential
  /** Redeemer for script-controlled cold credentials */
  readonly redeemer?: RedeemerBuilder.RedeemerArg
  /** Optional label for debugging script failures - identifies this operation in error messages */
  readonly label?: string
}

/**
 * Parameters for resigning from the constitutional committee.
 *
 * Submits a resignation from committee membership.
 *
 * @since 2.0.0
 * @category governance
 */
export interface ResignCommitteeColdParams {
  /** The cold credential resigning */
  readonly coldCredential: Credential.Credential
  /** Optional anchor with resignation rationale */
  readonly anchor?: Anchor.Anchor
  /** Redeemer for script-controlled cold credentials */
  readonly redeemer?: RedeemerBuilder.RedeemerArg
  /** Optional label for debugging script failures - identifies this operation in error messages */
  readonly label?: string
}

// ============================================================================
// Phase 6: Stake Pool Operations
// ============================================================================

/**
 * Parameters for registering a stake pool.
 *
 * Registers a new stake pool with the specified parameters.
 * Also used for updating existing pool parameters.
 *
 * @since 2.0.0
 * @category pool
 */
export interface RegisterPoolParams {
  /** Complete pool parameters including operator, VRF key, costs, etc. */
  readonly poolParams: PoolParams.PoolParams
}

/**
 * Parameters for retiring a stake pool.
 *
 * Announces pool retirement effective at the specified epoch.
 *
 * @since 2.0.0
 * @category pool
 */
export interface RetirePoolParams {
  /** The pool key hash of the pool to retire */
  readonly poolKeyHash: PoolKeyHash.PoolKeyHash
  /** Epoch at which retirement takes effect */
  readonly epoch: EpochNo.EpochNo
}

// ============================================================================
// Required Signers
// ============================================================================

/**
 * Parameters for adding a required signer to the transaction.
 *
 * Required signers must sign the transaction even if they don't control any inputs.
 * This is commonly used for scripts that check for specific signers in their validation logic.
 *
 * @since 2.0.0
 * @category signers
 */
export interface AddSignerParams {
  /** The key hash that must sign the transaction */
  readonly keyHash: KeyHash.KeyHash
}

// ============================================================================
// Metadata
// ============================================================================

/**
 * Parameters for attaching metadata to transaction.
 *
 * Metadata is attached to the auxiliary data section of the transaction.
 * Each metadata entry is identified by a label (0-2^64-1) following CIP-10 standard.
 *
 * Common labels:
 * - 674n: Message/comment metadata (CIP-20)
 * - 721n: NFT metadata (CIP-25)
 * - 777n: Royalty metadata (CIP-27)
 *
 * @since 2.0.0
 * @category metadata
 */
export interface AttachMetadataParams {
  /** Metadata label (bigint 0-2^64-1). See CIP-10 for standard labels. */
  readonly label: Metadata.MetadataLabel
  /** Metadata content as TransactionMetadatum */
  readonly metadata: TransactionMetadatum.TransactionMetadatum
}

// ============================================================================
// Governance Voting and Proposals (Conway)
// ============================================================================

/**
 * Parameters for submitting votes on governance actions.
 *
 * Submits voting procedures to vote on governance proposals.
 * Supports multiple voters voting on multiple proposals in a single transaction.
 *
 * For script-controlled voters (DRep, CC member, or stake pool with script credential),
 * provide a redeemer to satisfy the vote purpose validator.
 *
 *
 * @since 2.0.0
 * @category governance
 */
export interface VoteParams {
  /** Voting procedures to submit - see VotingProcedures.singleVote() for simple cases */
  readonly votingProcedures: VotingProcedures.VotingProcedures
  /** Redeemer for script-controlled voters (vote purpose) */
  readonly redeemer?: RedeemerBuilder.RedeemerArg
  /** Optional label for debugging script failures - identifies this operation in error messages */
  readonly label?: string
}

/**
 * Parameters for proposing governance actions.
 *
 * Submits a governance action proposal.
 * The deposit is automatically fetched from protocol parameters (like registerStake).
 * Call .propose() multiple times to submit multiple proposals in one transaction.
 *
 * @since 2.0.0
 * @category governance
 */
export interface ProposeParams {
  /** The governance action to propose */
  readonly governanceAction: GovernanceAction.GovernanceAction
  /** Reward account for deposit refund when proposal is finalized */
  readonly rewardAccount: RewardAccount.RewardAccount
  /** Optional anchor with metadata URL and hash */
  readonly anchor: Anchor.Anchor | null
}

// ============================================================================
// Send All Operation
// ============================================================================

/**
 * Parameters for sending all wallet assets to a recipient address.
 *
 * This operation collects all wallet UTxOs and creates a single output
 * containing all assets minus the transaction fee. It's commonly used for:
 * - Draining a wallet completely
 * - Consolidating all UTxOs into a single output
 * - Migrating funds to a new address
 *
 * @since 2.0.0
 * @category payment
 */
export interface SendAllParams {
  /** The recipient address to receive all assets */
  readonly to: CoreAddress.Address
}
