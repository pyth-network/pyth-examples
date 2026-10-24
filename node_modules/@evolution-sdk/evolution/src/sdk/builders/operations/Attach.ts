import { Effect, Ref } from "effect"

import type * as ScriptCore from "../../../Script.js"
import * as ScriptHashCore from "../../../ScriptHash.js"
import { TxContext } from "../TransactionBuilder.js"

/**
 * Attaches a script to the transaction by storing it in the builder state.
 * The script is indexed by its hash for efficient lookup during transaction assembly.
 *
 * This is an internal helper used by the public attachScript() method.
 * Scripts must be attached before being referenced by transaction inputs or minting policies.
 *
 * @since 2.0.0
 * @category operations
 */
export const attachScriptToState = (script: ScriptCore.Script) =>
  Effect.gen(function* () {
    const stateRef = yield* TxContext
    const state = yield* Ref.get(stateRef)

    // Compute script hash
    const scriptHash = ScriptHashCore.fromScript(script)
    const scriptHashHex = ScriptHashCore.toHex(scriptHash)

    yield* Effect.logDebug(`[Attach] Script hash: ${scriptHashHex}`)

    // Add script to state map (keyed by hash hex string)
    const updatedScripts = new Map(state.scripts)
    updatedScripts.set(scriptHashHex, script)

    yield* Ref.set(stateRef, {
      ...state,
      scripts: updatedScripts
    })
  })
