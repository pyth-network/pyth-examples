val scalusVersion = "0.16.0"
val scalusPluginVersion = scalusVersion

resolvers += Resolver.sonatypeCentralSnapshots

// Latest Scala 3 LTS version
ThisBuild / scalaVersion := "3.3.7"

ThisBuild / scalacOptions ++= Seq("-feature", "-deprecation", "-unchecked")

// Add the Scalus compiler plugin
addCompilerPlugin("org.scalus" %% "scalus-plugin" % scalusPluginVersion)

// Main application
lazy val core = (project in file("."))
    .settings(
      libraryDependencies ++= Seq(
        // Scalus
        "org.scalus" %% "scalus" % scalusVersion,
        "org.scalus" %% "scalus-cardano-ledger" % scalusVersion,
        // Tapir for API definition
        "com.softwaremill.sttp.tapir" %% "tapir-netty-server-sync" % "1.13.13",
        "com.softwaremill.sttp.tapir" %% "tapir-swagger-ui-bundle" % "1.13.13",
        "com.softwaremill.sttp.tapir" %% "tapir-json-upickle" % "1.13.13",
        // Argument parsing
        "com.monovore" %% "decline" % "2.6.1",
        "org.slf4j" % "slf4j-simple" % "2.0.17"
      ),
      run / fork := true,
      libraryDependencies ++= Seq(
        "org.scalus" %% "scalus-testkit" % scalusVersion,
        "org.scalatest" %% "scalatest" % "3.2.19" % Test,
        "org.scalatestplus" %% "scalacheck-1-18" % "3.2.19.0" % Test,
        "org.scalacheck" %% "scalacheck" % "1.19.0" % Test
      )
    )

// Integration tests
lazy val integration = (project in file("integration"))
    .dependsOn(core % "compile->compile;test->test")
    .settings(
      publish / skip := true,
      // test dependencies
      libraryDependencies ++= Seq(
        "org.scalus" %% "scalus-testkit" % scalusVersion,
        "org.scalatest" %% "scalatest" % "3.2.19" % Test,
        "org.scalatestplus" %% "scalacheck-1-18" % "3.2.19.0" % Test,
        "org.scalacheck" %% "scalacheck" % "1.19.0" % Test,
        // Testcontainers for integration testing
        "com.dimafeng" %% "testcontainers-scala-core" % "0.44.1" % Test,
        "com.dimafeng" %% "testcontainers-scala-scalatest" % "0.44.1" % Test,
        // Yaci DevKit for Cardano local devnet
        "com.bloxbean.cardano" % "yaci-cardano-test" % "0.1.0" % Test
      )
    )
