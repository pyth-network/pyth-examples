package pythacoin

import com.monovore.decline.{Command, Opts}
import scalus.cardano.address.Network

enum Cmd:
    case Blueprint, Start

/** CLI entry point using decline for argument parsing.
  *
  * Two commands:
  * - `blueprint`: prints the compiled script hash and size (uses a dummy Pyth policy ID)
  * - `start`: launches the HTTP server on port 8088
  *
  * The `start` command reads configuration from environment variables:
  * - BLOCKFROST_API_KEY: Blockfrost project ID for chain queries and tx submission
  * - PYTH_POLICY_ID: hex-encoded Pyth oracle deployment policy ID on the target network
  * - PYTH_KEY: bearer token for the Pyth Lazer REST API
  */
object Cli:
    private val command = {
        val blueprintCommand = Opts.subcommand("blueprint", "Prints the contract blueprint JSON") {
            Opts(Cmd.Blueprint)
        }

        val startCommand = Opts.subcommand("start", "Start the server") {
            Opts(Cmd.Start)
        }

        Command(name = "pythacoin", header = "Pythacoin CDP Stablecoin")(
          blueprintCommand orElse startCommand
        )
    }

    /** Print script hash and size for a dummy parameterization (useful for CI/debugging). */
    private def blueprint(): Unit = {
        val pythPolicyId = "0000000000000000000000000000000000000000000000000000000000"
        val script = CdpContract(scalus.uplc.builtin.ByteString.fromHex(pythPolicyId))
        println(s"Script hash: ${script.script.scriptHash.toHex}")
        println(s"Script size: ${script.program.cborEncoded.length} bytes")
    }

    /** Start the HTTP server connected to preprod via Blockfrost. */
    @main
    def start(): Unit = {
        val blockfrostApiKey = System.getenv("BLOCKFROST_API_KEY") match
            case null   => sys.error("BLOCKFROST_API_KEY environment variable is not set")
            case apiKey => apiKey
        val pythPolicyId = System.getenv("PYTH_POLICY_ID") match
            case null => sys.error("PYTH_POLICY_ID environment variable is not set")
            case id   => id
        val pythKey = System.getenv("PYTH_KEY") match
            case null => sys.error("PYTH_KEY environment variable is not set")
            case key  => key
        val appCtx = AppCtx(Network.Testnet, blockfrostApiKey, pythPolicyId, pythKey)
        println("Starting the Pythacoin server...")
        Server(appCtx).start()
    }

    @main def main(args: String*): Unit = {
        command.parse(args) match
            case Left(help) => println(help)
            case Right(cmd) =>
                cmd match
                    case Cmd.Blueprint => blueprint()
                    case Cmd.Start     => start()
    }
