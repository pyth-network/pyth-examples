import { CompilerConfig } from "@ton/blueprint";

export const compile: CompilerConfig = {
  lang: "func",
  targets: ["contracts/Pyth/Main.fc", "contracts/Pyth/Pyth.fc", "contracts/Pyth/Wormhole.fc"],
};
