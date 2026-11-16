import { Lucid, Blockfrost, Data } from "lucid-cardano";
import blueprint from "../assets/plutus.json"; 

// 1. Definimos el Schema del Datum (debe coincidir con tu código Aiken)
const PegDatumSchema = Data.Object({
  owner: Data.Bytes,
  lock_until: Data.Integer,
});

export const createLockTx = async (amountADA) => {
  try {
    // 2. Iniciamos Lucid (Asegúrate de poner tu Project ID de Blockfrost)
    const lucid = await Lucid.new(
      new Blockfrost(
        "https://cardano-preprod.blockfrost.io/api/v0", 
        "preprodYourProjectIDHere" 
      ),
      "Preprod"
    );

    // 3. Verificación de Wallet segura
    if (!window.cardano || !window.cardano.nami) {
      throw new Error("Nami Wallet no encontrada. Por favor instálala.");
    }

    const api = await window.cardano.nami.enable();
    lucid.selectWallet(api);

    // 4. Obtener el validador desde el blueprint (plutus.json)
    // Buscamos por el título que definiste en Aiken
    const validatorEntry = blueprint.validators.find(
      (v) => v.title === "peg_defense.spend" || v.title.includes("spend")
    );
    
    if (!validatorEntry) throw new Error("Validador no encontrado en plutus.json");

    const validator = {
      type: "PlutusV2",
      script: validatorEntry.compiledCode,
    };

    const scriptAddress = lucid.utils.validatorToAddress(validator);

    // 5. Preparar Datos del Datum
    const address = await lucid.wallet.address();
    const details = lucid.utils.getAddressDetails(address);
    const ownerPkh = details.paymentCredential.hash;
    
    // Bloqueo por 30 segundos (convertido a milisegundos POSIX)
    const lockUntil = BigInt(Date.now() + 30000); 

    const datum = Data.to(
      {
        owner: ownerPkh,
        lock_until: lockUntil,
      },
      PegDatumSchema
    );

    // 6. Construir y enviar Transacción
    const tx = await lucid
      .newTx()
      .payToContract(scriptAddress, { inline: datum }, { lovelace: BigInt(amountADA * 1000000) })
      .complete();

    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();

    console.log("Transacción enviada con éxito:", txHash);
    return txHash;

  } catch (error) {
    console.error("Error en la transacción de Cardano:", error);
    throw error;
  }
};