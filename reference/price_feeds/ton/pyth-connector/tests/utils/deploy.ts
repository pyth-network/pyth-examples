import {Blockchain, SandboxContract, TreasuryContract} from "@ton/sandbox";
import { Address, beginCell, Cell, toNano } from "@ton/core";
import {compile, sleep} from "@ton/blueprint";
import {makeEmptyIds, PythConnector} from "../../wrappers/PythConnector";
import {DataSource} from "@pythnetwork/pyth-ton-js";
import {Main, MainConfig} from "../../wrappers/Main";
import {GOVERNANCE_DATA_SOURCE, GUARDIAN_SET_0, MAINNET_UPGRADE_VAAS} from "./wormhole";
import * as fs from "node:fs";
import { JettonMinter } from "@ton-community/assets-sdk";

export async function deployPythConnector(blockchain: Blockchain, deployer: SandboxContract<TreasuryContract>, pythContractAddress: Address) {
    const code: Cell = await compile('PythConnector');
    const contract = PythConnector.createFromConfig({
            pythAddress: pythContractAddress,
            ids: makeEmptyIds()
        }, code
    );

    const openedContract = blockchain.openContract(contract);

    const deployResult = await openedContract.sendDeploy(deployer.getSender(), toNano('0.05'));

    expect(deployResult.transactions).toHaveTransaction({
        from: deployer.address,
        to: openedContract.address,
        deploy: true,
        success: true,
    });

    return openedContract;
}

export async function deployAndConfigurePyth(
    blockchain: Blockchain,
    deployer: SandboxContract<TreasuryContract>,
    options?:{
        noCheck?: boolean,
        shouldBuild?: boolean,
        chainId?: number,
        upgradeCodeHash?: number | bigint,  // allows varying contract address in blockchain
        singleUpdateFee?: number | bigint,
}) {
    const _chainId = options?.chainId ?? 0;
    const _shouldBuild = options?.shouldBuild ??  false;
    const _singleUpdateFee = options?.singleUpdateFee ?? 0;

    const DATA_SOURCES: DataSource[] = [
        {
            emitterChain: 26,
            emitterAddress:
                "e101faedac5851e32b9b23b5f9411a8c2bac4aae3ed4dd7b811dd1a72ea4aa71",
        },
    ];

    // Validate that chainId is a valid number
    if (isNaN(_chainId)) {
        throw new Error("CHAIN_ID must be a valid number");
    }

    console.log("Chain ID:", _chainId);

    const config: MainConfig = {
        singleUpdateFee: _singleUpdateFee ? Number.parseInt( _singleUpdateFee.toString()) : 0,
        dataSources: DATA_SOURCES,
        guardianSetIndex: 0,
        guardianSet: GUARDIAN_SET_0,
        chainId: _chainId,
        governanceChainId: 1,
        governanceContract: "0000000000000000000000000000000000000000000000000000000000000004",
        governanceDataSource: GOVERNANCE_DATA_SOURCE,
        upgradeCodeHash: options?.upgradeCodeHash ?? 0,
    };


    let code: Cell

    const contractName = options?.noCheck ? "MainNoCheck" : "Main";
    if (_shouldBuild) {
        code = await compile(contractName);
    } else {
        const path = `node_modules/@evaafi/pyth-connector/build/${contractName}.compiled.json`;
        code = Cell.fromBoc(Buffer.from(JSON.parse(fs.readFileSync(path, 'utf8'))['hex'], 'hex'))[0];
    }

    // const path = `node_modules/@evaafi/pyth-connector/build/${contractName}.compiled.json`;
    // const code = Cell.fromBoc(Buffer.from(JSON.parse(fs.readFileSync(path, 'utf8'))['hex'], 'hex'))[0];
    const pythContract = Main.createFromConfig(config, code);

    const main = blockchain.openContract(pythContract);
    await main.sendDeploy(deployer.getSender(), toNano("0.005"));
    console.log("Main contract deployed at:", main.address.toString());

    // Call sendUpdateGuardianSet for each VAA
    const currentGuardianSetIndex = await main.getCurrentGuardianSetIndex();
    console.log(`Current guardian set index: ${currentGuardianSetIndex}`);

    for (let i = currentGuardianSetIndex; i < MAINNET_UPGRADE_VAAS.length; i++) {
        const vaa = MAINNET_UPGRADE_VAAS[i];
        const vaaBuffer = Buffer.from(vaa, "hex");
        await main.sendUpdateGuardianSet(deployer.getSender(), vaaBuffer);
        console.log(`Successfully updated guardian set ${i + 1} with VAA: ${vaa.slice(0, 20,)}...`,);

        // Wait for 30 seconds before checking the guardian set index
        // console.log("Waiting for 30 seconds before checking guardian set index...");
        // await sleep(1000);

        // Verify the update
        const newIndex = await main.getCurrentGuardianSetIndex();
        if (newIndex !== i + 1) {
            console.error(`Failed to update guardian set. Expected index ${i + 1}, got ${newIndex}`);
            break;
        }
    }

    console.log("Guardian set update process completed.");

    return main;
}

export const deployJettonMinter = async (assetName: string, blockchain: Blockchain, deployer: SandboxContract<TreasuryContract>) => {
    const jetton = JettonMinter.createFromConfig({
        admin: deployer.address,
        content: beginCell().storeStringTail(assetName).endCell()
    });

    const jettonMinter = blockchain.openContract(jetton);
    await jettonMinter.sendDeploy(deployer.getSender());

    return jettonMinter;
}

export const mintJettons = async (args: {
    jettonMinter: SandboxContract<JettonMinter>,
    deployer: SandboxContract<TreasuryContract>,
    actorWallets: SandboxContract<TreasuryContract>[]
    jettonAmount?: bigint
}) => {
    const amount = args.jettonAmount ?? 1000000_000000n;
    for (let w of args.actorWallets) {
        await args.jettonMinter.sendMint(args.deployer.getSender(), w.address, amount);
    }
}
