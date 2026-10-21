import Websocket from 'ws';
import axios from 'axios';
import {
  Assets,
  CBORHex,
  CML,
  fromUnit,
  UTxO,
} from '@lucid-evolution/lucid';
import blake2b from 'blake2b';

const ERROR_TAGS = [
  'PeerHandshakeFailure',
  'TxInvalid',
  'InvalidInput',
  'PostTxOnChainFailed',
  'CommandFailed',
  'DecommitInvalid',
];

/**
 * Listen and send messages to a Hydra node.
 */
class HydraHandler {
  private connection: Websocket;
  private url: URL;
  private isReady: boolean = false;

  /**
   * @constructor
   * @param url - The URL of the Hydra node WebSocket server.
   * Initializes the HydraHandler class and sets up the WebSocket connection.
   */
  constructor(url: string) {
    const wsURL = new URL(url);
    wsURL.protocol = wsURL.protocol.replace('http', 'ws');

    this.url = wsURL;
    this.connection = new Websocket(wsURL + '?history=no');
    this.setupEventHandlers();
  }

  private async ensureConnectionReady(): Promise<void> {
    if (!this.isReady) {
      await new Promise((resolve) => (this.connection.onopen = resolve));
    }
  }

  private setupEventHandlers() {
    this.connection.onopen = () => {
      console.debug('WebSocket connection opened.');
      this.isReady = true;
    };

    this.connection.onerror = () => {
      console.error('Error on Hydra websocket');
    };

    this.connection.onclose = () => {
      console.debug('WebSocket connection closed.');
      this.isReady = false;
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private waitForMessage(tag: string, timeout = 10000): Promise<any> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve(`Timeout waiting for tag: ${tag}`);
      }, timeout);

      this.connection.onmessage = (msg: Websocket.MessageEvent) => {
        const data = JSON.parse(msg.data.toString());
        if (data.tag === tag) {
          console.debug(`Received ${tag}`);
          clearTimeout(timeoutId);
          resolve(data);
        } else if (ERROR_TAGS.includes(data.tag)) {
          console.error(`Received ${data.tag}`);
        } else {
          console.debug(`Received ${data.tag} while waiting for ${tag}`);
        }
      };
    });
  }

  /**
   * Listens for a specific tag from the Hydra node's WebSocket.
   *
   * @param tag - The tag to listen for in incoming messages.
   * @returns  the tag when it is received from the Hydra node.
   */
  public async listen(tag: string): Promise<string> {
    return new Promise((resolve) => {
      this.connection.onopen = () => {
        console.debug(`Awaiting for ${tag} events...`);
      };
      this.connection.onmessage = async (msg: Websocket.MessageEvent) => {
        const data = JSON.parse(msg.data.toString());
        if (ERROR_TAGS.includes(data.tag)) {
          console.error(`Received: ${data.tag}`);
          resolve(data.tag);
        }
        console.debug(`Received: ${data.tag}`);
        resolve(data.tag);
      };
    });
  }

  /**
   * Closes the WebSocket connection to the Hydra node.
   * @returns A promise that resolves when the connection is closed.
   */
  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.connection.close();
      resolve();
    });
  }

  /**
   * Sends an "Init" message to the Hydra node to start a new head.
   * @returns  the tag "HeadIsInitializing" once the head is initialized.
   */
  async init(): Promise<string> {
    await this.ensureConnectionReady();
    console.debug('Sending init command...');
    this.connection.send(JSON.stringify({ tag: 'Init' }));
    return this.listen('HeadIsInitializing');
  }

  /**
   * Sends an "Abort" message to the Hydra node to abort the initialization of a Hydra head.
   * @returns  the tag "HeadIsAborted" if the head was aborted successfully.
   */
  async abort(): Promise<void> {
    await this.ensureConnectionReady();
    console.debug('Aborting head opening...');
    this.connection.send(JSON.stringify({ tag: 'Abort' }));
    return new Promise(async (resolve) => {
      const tag = await this.listen('HeadIsAborted');
      resolve(tag);
    }).then(() => this.stop());
  }

  /**
   * Sends a commit transaction to the Hydra node.
   * @param apiUrl - The URL of the Hydra API endpoint.
   * @param blueprint - The CBOR-encoded transaction blueprint.
   * @param utxos - An array of the UTxOs to commit.
   * @returns  the transaction hash once the commit is successful.
   */
  async sendCommit(
    _apiUrl: string,
    _utxos: UTxO[],
    _blueprint?: CBORHex
  ): Promise<string> {
    throw new Error('Not implemented');
  }

  /**
   * Sends a raw transaction to the Hydra node.
   * @param tx - The CBOR-encoded transaction to send.
   * @returns  the tag "TxValid" when the transaction is valid and "SnapshotConfirmed" when the snapshot is confirmed.
   */
  async sendTx(tx: CBORHex): Promise<string> {
    await this.ensureConnectionReady();
    console.debug('Sending transaction...');
    this.connection.send(
      JSON.stringify({
        tag: 'NewTx',
        transaction: { cborHex: tx, description: '', type: 'Tx BabbageEra' },
      })
    );
    return this.listen('TxValid');
  }

  /**
   * Retrieves the UTxO snapshot from the Hydra node.
   * @returns  an array of UTxOs from the snapshot.
   */
  async getSnapshot(): Promise<UTxO[]> {
    const apiURL = `${this.url.origin.replace('ws', 'http')}/snapshot/utxo`;
    try {
      const response = await axios.get(apiURL);
      const hydraUtxos = Object.entries(response.data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lucidUtxos = hydraUtxos.map((utxo: any) => {
        const [hash, idx] = utxo[0].split('#');
        const output = utxo[1];
        return hydraUtxoToLucidUtxo(hash, idx, output);
      });
      return lucidUtxos;
    } catch (error) {
      console.debug(error as unknown as string);
      throw error;
    }
  }

  /**
   * Sends a decommit transaction to the Hydra node.
   * @param apiUrl - The URL of the Hydra API endpoint.
   * @param tx - The CBOR-encoded transaction to send for decommitment.
   * @returns  the response data from the Hydra node.
   */
  async decommit(apiUrl: string, tx: CBORHex): Promise<string> {
    try {
      const payload = {
        cborHex: tx,
        description: '',
        type: 'Tx BabbageEra',
      };
      const response = await axios.post(apiUrl, payload);
      return response.data;
    } catch (error) {
      console.error(error as unknown as string);
      throw error;
    }
  }

  /**
   * Sends a "Close" message to the Hydra node to close the current head.
   * @returns  the tag "HeadIsClosed" once the head is closed successfully.
   */
  async close(): Promise<string> {
    await this.ensureConnectionReady();
    console.debug('Closing head...');
    this.connection.send(JSON.stringify({ tag: 'Close' }));
    const data = await this.waitForMessage('HeadIsClosed', 30_000);
    return data.tag;
  }

  /**
   * Sends a "Fanout" message to the Hydra node to finalize the current head.
   * @returns  the tag "HeadIsFinalized" once the head is finalized.
   */
  async fanout(): Promise<string> {
    await this.ensureConnectionReady();
    console.debug('Sending fanout command...');
    this.connection.send(JSON.stringify({ tag: 'Fanout' }));
    return this.listen('HeadIsFinalized');
  }
}

type HydraUtxo = {
  address: string;
  datum: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inlineDatum: any;
  inlineDatumhash: string | null;
  referenceScript: {
    script: { cborHex: string; description: string; type: string };
    scriptLanguage: string;
  } | null;
  value: Record<string, number | Record<string, number>>;
};
function lucidUtxoToHydraUtxo(utxo: UTxO): HydraUtxo {
  const address = utxo.address;
  const value: Record<string, number | Record<string, number>> = {};
  // Probably needs fix for datums which are not inlined
  const datum = null;
  let inlineDatum = null;
  let inlineDatumhash = null;
  let referenceScript = null;

  for (const [unit, amount] of Object.entries(utxo.assets)) {
    if (unit === 'lovelace') {
      value['lovelace'] = Number(amount);
    } else {
      const fromU = fromUnit(unit);
      const currentValue =
        (value[fromU.policyId] as Record<string, number>) || {};
      currentValue[fromU.assetName!] = Number(amount);
      value[fromU.policyId] = currentValue;
    }
  }
  if (utxo.datum) {
    const plutusData = CML.PlutusData.from_cbor_hex(utxo.datum);
    inlineDatum = JSON.parse(
      CML.decode_plutus_datum_to_json_str(
        plutusData,
        CML.CardanoNodePlutusDatumSchema.DetailedSchema
      )
    );
    inlineDatumhash = blake2b(32)
      .update(Buffer.from(utxo.datum, 'hex'))
      .digest('hex');
  }
  if (utxo.scriptRef) {
    let refinedScriptType;
    /**
     * Lucid ScriptType = Native | PlutusV1 | PlutusV2 | PlutusV3
     * Hydra ScriptType = PlutusScriptV3 | ...
     */
    if (utxo.scriptRef.type.includes('Plutus')) {
      refinedScriptType = utxo.scriptRef.type.replace('Plutus', 'PlutusScript');
    } else {
      refinedScriptType = utxo.scriptRef.type;
    }
    referenceScript = {
      script: {
        cborHex: utxo.scriptRef.script,
        description: '',
        type: refinedScriptType,
      },
      scriptLanguage: `PlutusScriptLanguage ${refinedScriptType}`,
    };
  }
  return {
    address,
    value,
    datum,
    inlineDatum,
    inlineDatumhash,
    referenceScript,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hydraUtxoToLucidUtxo(hash: string, idx: number, output: any): UTxO {
  const datumBytes = output.inlineDatum ? output.inlineDatumRaw : null;
  const assets: Assets = {};
  for (const [policy, value] of Object.entries(output.value)) {
    if (policy === 'lovelace') {
      assets[policy] = BigInt(value as number);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const namesAndAmounts: [string, number][] = Object.entries(value as any);
      for (const [assetName, amount] of namesAndAmounts) {
        const unit = `${policy}${assetName}`;
        assets[unit] = BigInt(amount as number);
      }
    }
  }
  return {
    txHash: hash,
    outputIndex: Number(idx),
    assets: assets,
    address: output.address,
    datum: datumBytes,
  };
}

export { HydraHandler, lucidUtxoToHydraUtxo };
