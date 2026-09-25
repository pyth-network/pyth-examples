package pythacoin

import org.scalatest.Suite
import scalus.cardano.ledger.ScriptHash
import scalus.testing.yaci.{YaciConfig, YaciDevKit}

trait YaciDevKitTest extends YaciDevKit { self: Suite =>

    override protected def yaciConfig: YaciConfig = YaciConfig()

    def createAppCtx(): AppCtx = {
        val context = createTestContext()
        val pythPolicyId = ScriptHash.fromHex(
          "aabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd"
        )
        val cdpScript = CdpContract(pythPolicyId)
        new AppCtx(
          context.cardanoInfo, context.provider,
          "", "http://localhost:8080/api/v1",
          pythPolicyId, "", cdpScript
        )
    }
}
