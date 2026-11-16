package pythacoin

import scalus.uplc.PlutusV3
import scalus.uplc.builtin.Data
import scalus.uplc.eval.{PlutusVM, Result}

extension (contract: PlutusV3[Data => Unit]) {
    def eval(ctxData: Data)(using PlutusVM): Result =
        (contract.program $ ctxData).evaluateDebug
}
