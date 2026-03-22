package pythacoin

import scalus.compiler.Options
import scalus.uplc.PlutusV3
import scalus.uplc.builtin.ByteString
import scalus.uplc.builtin.Data
import scalus.uplc.builtin.Data.toData
import pythacoin.onchain.{CdpParams, CdpValidator}

/** Compiles the CDP validator into a Plutus V3 script.
  *
  * The base script is compiled once (lazy) and then parameterized with the Pyth policy ID
  * at deployment time via `apply()`. This produces a unique script hash per deployment
  * that serves as both the minting policy ID (for PUSD + NFTs) and the script address.
  */
object CdpContract {
    given Options = Options.release

    /** Unparameterized compiled script (takes param + ScriptContext). */
    lazy val base: PlutusV3[Data => Data => Unit] =
        PlutusV3.compile(CdpValidator.validate)

    /** Production script: parameterized with Pyth policy ID, traces removed for smaller size. */
    def apply(pythPolicyId: ByteString): PlutusV3[Data => Unit] =
        base.apply(CdpParams(pythPolicyId).toData)

    /** Debug script: keeps error trace messages for easier troubleshooting. */
    def withErrorTraces(pythPolicyId: ByteString): PlutusV3[Data => Unit] =
        base.withErrorTraces.apply(CdpParams(pythPolicyId).toData)
}
