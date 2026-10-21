package pythacoin

import java.time.LocalTime
import java.time.format.DateTimeFormatter

/** ANSI color logging for CLI output. */
object Log {
    private val Reset = "\u001b[0m"
    private val Bold = "\u001b[1m"
    private val Dim = "\u001b[2m"
    private val Red = "\u001b[31m"
    private val Green = "\u001b[32m"
    private val Yellow = "\u001b[33m"
    private val Cyan = "\u001b[36m"
    private val Magenta = "\u001b[35m"

    private val timeFmt = DateTimeFormatter.ofPattern("HH:mm:ss")
    private def now(): String = LocalTime.now().format(timeFmt)

    def info(msg: String): Unit =
        println(s"$Dim${now()}$Reset ▸ $msg")

    def success(msg: String): Unit =
        println(s"$Dim${now()}$Reset $Green✓$Reset $msg")

    def warn(msg: String): Unit =
        println(s"$Dim${now()}$Reset $Yellow⚠$Reset $msg")

    def error(msg: String): Unit =
        System.err.println(s"$Dim${now()}$Reset $Red✗$Reset $msg")

    def error(msg: String, e: Throwable): Unit = {
        System.err.println(s"$Dim${now()}$Reset $Red✗$Reset $msg")
        e.printStackTrace(System.err)
    }

    def header(msg: String): Unit =
        println(s"$Bold$Cyan━━━ $msg ━━━$Reset")

    def detail(label: String, value: Any): Unit =
        println(s"  $Dim$label:$Reset $value")

    def tx(label: String, value: String): Unit =
        println(s"  $Dim$label:$Reset $Magenta$value$Reset")

    def separator(): Unit =
        println(s"$Dim${"─" * 72}$Reset")
}
