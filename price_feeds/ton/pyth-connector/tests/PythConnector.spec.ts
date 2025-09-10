import { Blockchain, EventAccountCreated, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, Dictionary, SendMode, toNano } from '@ton/core';
import { PythConnector } from '../wrappers/PythConnector';
import '@ton/test-utils';

import * as dotenv from 'dotenv';
import { deployAndConfigurePyth, deployJettonMinter, deployPythConnector, mintJettons } from "./utils/deploy";
import { Main } from "../wrappers/Main";
import { compile } from "@ton/blueprint";

import { composeFeedsCell, expectCompareDicts, getPriceUpdates, sendJetton } from "./utils/utils";
import { Buffer } from "buffer";
import { TreasuryParams } from "@ton/sandbox/dist/blockchain/Blockchain";
import {
    PYTH_TON_PRICE_FEED_ID, PYTH_USDC_PRICE_FEED_ID, PYTH_USDT_PRICE_FEED_ID,
    TEST_FEED_NAMES, TEST_FEEDS, TEST_FEEDS_MAP
} from "./utils/assets";
import { packNamedPrices } from "./utils/prices";
import { makeOnchainGetterPayload, makePythProxyMessage, makePythProxyPayloadMessage, makeTransferMessage, parsePythProxyLogBody } from "./utils/messages";
import { EventMessageSent } from "@ton/sandbox/dist/event/Event";

dotenv.config();

const HERMES_ENDPOINT = 'https://hermes.pyth.network';

// todo: check gas fees
export type OraclesInfo = {
    pythAddress: Address;
    feedsMap: Dictionary<bigint, Buffer>,
};

describe('Generated Prices', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let pyth: SandboxContract<Main>;
    let pythConnector: SandboxContract<PythConnector>;

    let treasuries: Map<string, SandboxContract<TreasuryContract>>;
    let addressSeedMap: Map<string, string>;

    let aliceWallet: SandboxContract<TreasuryContract>;
    let bobWallet: SandboxContract<TreasuryContract>;

    beforeAll(async () => {
        await compile('MainNoCheck');
        await compile('PythConnector');
    })

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = Math.floor(Date.now() / 1000);
        deployer = await blockchain.treasury('deployer');
        pyth = await deployAndConfigurePyth(blockchain, deployer, {noCheck: true, shouldBuild: true});
        pythConnector = await deployPythConnector(blockchain, deployer, pyth.address);
        treasuries = new Map<string, SandboxContract<TreasuryContract>>();
        addressSeedMap = new Map<string, string>();
        aliceWallet = await treasury('Alice', {predeploy: true});
        bobWallet = await treasury('Bob', {predeploy: true});
    });

    const treasury = async (seed: string, params?: TreasuryParams) => {
        const r = await blockchain.treasury(seed, params);
        addressSeedMap.set(r.address.toString(), seed);
        treasuries.set(r.address.toString(), r);
        return r;
    };

    it('should accept generated prices', async () => {
        const timeGetter = () => blockchain.now!;
        const packedPrices = packNamedPrices({TON: 3.1, USDT: 0.99, USDC: 1.01}, timeGetter);

        const actorWallets = [aliceWallet];

        const assetName = 'USDT';
        let jettonMinter = await deployJettonMinter(assetName, blockchain, deployer);
        await mintJettons({actorWallets, jettonMinter, deployer});

        await pythConnector.sendConfigure(deployer.getSender(), {
            value: toNano('0.05'),
            pythAddress: pyth.address,
            feedsMap: TEST_FEEDS_MAP
        });

        const queryId: number = 0x12345;
        const value: bigint = toNano('1.5');
        const updateDataCell = packedPrices;
        let pythPriceIds = composeFeedsCell([PYTH_TON_PRICE_FEED_ID, PYTH_USDC_PRICE_FEED_ID, PYTH_USDT_PRICE_FEED_ID]);
        const publishTimeGap = 10;
        const maxStaleness = 180;

        const operationBody = makeOnchainGetterPayload({
            publishTimeGap, maxStaleness, pythPriceIds, updateDataCell,
            operationBody: beginCell().endCell()
        });

        const transferMessage = makeTransferMessage({
            queryId: 12345n,
            jettonAmount: 1_000_000_000n,
            payloadDestination: pythConnector.address,
            sender: aliceWallet.address,
            notificationBody: operationBody,
            forwardAmount: toNano('1'),
        });

        const res = await sendJetton(jettonMinter, aliceWallet, transferMessage, value);
        console.log(res.events, res.externals);
    })
});

describe('PythConnector', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let pyth: SandboxContract<Main>;
    let oraclesInfo: OraclesInfo;
    let pythConnector: SandboxContract<PythConnector>;

    let treasuries: Map<string, SandboxContract<TreasuryContract>>;
    let addressSeedMap: Map<string, string>;

    let aliceWallet: SandboxContract<TreasuryContract>;
    let bobWallet: SandboxContract<TreasuryContract>;

    beforeAll(async () => {
        await compile('Main');
        await compile('PythConnector');
    })

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = Math.floor(Date.now() / 1000);
        deployer = await blockchain.treasury('deployer');
        pyth = await deployAndConfigurePyth(blockchain, deployer, {noCheck: true, shouldBuild: true});
        oraclesInfo = {
            feedsMap: TEST_FEEDS_MAP,
            pythAddress: pyth.address,
        } as OraclesInfo;

        pythConnector = await deployPythConnector(blockchain, deployer, pyth.address);
        treasuries = new Map<string, SandboxContract<TreasuryContract>>();
        addressSeedMap = new Map<string, string>();
        aliceWallet = await treasury('Alice', {predeploy: true});
        bobWallet = await treasury('Bob', {predeploy: true});
    });

    const treasury = async (seed: string, params?: TreasuryParams) => {
        const r = await blockchain.treasury(seed, params);
        addressSeedMap.set(r.address.toString(), seed);
        treasuries.set(r.address.toString(), r);
        return r;
    };

    it('should deploy: check initial state', async () => {
        const pythAddress = await pythConnector.getPythAddress();
        expect(pythAddress.equals(pyth.address)).toBe(true);
    });

    const defaultFeeds = [PYTH_TON_PRICE_FEED_ID, PYTH_USDT_PRICE_FEED_ID, PYTH_USDC_PRICE_FEED_ID];


    it('should configure', async () => {
        const res = await pythConnector.sendConfigure(deployer.getSender(), {
            value: toNano('0.05'),
            pythAddress: pyth.address,
            feedsMap: TEST_FEEDS_MAP
        });

        console.log('events: ', res.events);
        console.log('externals: ', res.externals);

        const _address = await pythConnector.getPythAddress();
        expect(_address.toRawString()).toEqual(pyth.address.toRawString());

        const feedsMapRes = await pythConnector.getFeedsMap();

        feedsMapRes.keys().map(key => {
            const buffer = feedsMapRes.get(key)!
            const hex1 = '0x' + buffer.toString('hex', 0, 32);
            const hex2 = '0x' + buffer.toString('hex', 32);
            return {
                key: key,
                evaa_id: BigInt(hex1),
                reffered_id: BigInt(hex2)
            };
        }).forEach((x) => {
            const {key, evaa_id, reffered_id} = x;
            console.log(`${key} : (${evaa_id}, ${reffered_id})`);
        })

        expectCompareDicts(TEST_FEEDS_MAP, feedsMapRes);
    });

    it('should get price updates from Hermes Client', async () => {
        const defaultFeeds = [PYTH_TON_PRICE_FEED_ID, PYTH_USDT_PRICE_FEED_ID, PYTH_USDC_PRICE_FEED_ID];
        const res = await getPriceUpdates(HERMES_ENDPOINT, defaultFeeds);
        console.log('feeds: ', res.parsed);
        for (const item of res.parsed!) {
            console.log(item.id, TEST_FEED_NAMES.get(item.id), item.price.price, item.price.expo, item.price.conf, item.price.publish_time);
        }
    });

    it('should succeed onchain-getter operation', async () => {
        const actorWallets = [aliceWallet];
        let jettonMinter = await deployJettonMinter('USDT', blockchain, deployer);
        await mintJettons({actorWallets, jettonMinter, deployer});

        await pythConnector.sendConfigure(deployer.getSender(),
            {value: toNano('0.05'), pythAddress: pyth.address, feedsMap: TEST_FEEDS_MAP}
        );

        const bcTimeGetter = () => blockchain.now!;
        const updateDataCell = packNamedPrices({TON: 3.1, USDT: 0.99, USDC: 1.01}, bcTimeGetter);

        const operationBody = makeOnchainGetterPayload({
            publishTimeGap: 10,
            maxStaleness: 180,
            pythPriceIds: composeFeedsCell(defaultFeeds),
            updateDataCell,
            operationBody: beginCell().endCell()
        })

        const transferMessage = makeTransferMessage({
            queryId: 12345n,
            jettonAmount: 1_000_000_000n,
            payloadDestination: pythConnector.address,
            sender: aliceWallet.address,
            notificationBody: operationBody,
            forwardAmount: toNano('1'),
        });

        const res = await sendJetton(jettonMinter, aliceWallet, transferMessage, toNano('1.5'));
        console.log(res.events, res.externals);

        res.events.forEach(event=>{
            const _event = event as EventMessageSent;
            if (event.type !== 'account_created') {
                expect(_event.bounced).toBe(false);
            }
        })

        console.log({
            'alice': aliceWallet.address,
            'bob': bobWallet.address,
            'jetton': jettonMinter.address,
            'connector': pythConnector.address,
            'pyth': pyth.address
        });
    })

    it('should succeed pyth proxy operation', async () => {
        await pythConnector.sendConfigure(deployer.getSender(),{
            value: toNano('0.05'), 
            pythAddress: pyth.address, 
            feedsMap: TEST_FEEDS_MAP
        });

        // technically, prices are not important for current implementation of pyth proxy operation
        // but we pass them to pyth contract for demonstration purposes
        const updateDataCell = packNamedPrices({TON: 3.1, USDT: 0.99, USDC: 1.01}, () => blockchain.now!);
        const pythPriceIds = composeFeedsCell(defaultFeeds);

        const queryId = 0x123456n;

        const pythFee = toNano('0.0234');
        const transferredAmount = toNano('0.5');
        const supplyMargin = toNano('0.1');

        // need to cover pyth fee, transferred amount and supply margin
        const sentValue = pythFee + transferredAmount + supplyMargin;

        const proxyPayload = makePythProxyPayloadMessage({
            queryId,
            transferredAmount,
        });

        const minPublishTime = blockchain.now! - 10;
        const maxPublishTime = blockchain.now! + 180;

        const msgToPyth = makePythProxyMessage({
            updateDataCell,
            pythPriceIds,
            minPublishTime,
            maxPublishTime,
            targetAddress: pythConnector.address,
            queryId,
            proxyPayload,
            transferredAmount,
        });
        console.log({
            'Alice wallet': aliceWallet.address, 
            'Pyth contract': pyth.address, 
            'Pyth connector': pythConnector.address
        });

        const balanceBefore = (await blockchain.getContract(pythConnector.address)).balance;

        const result = await aliceWallet.send({
            value: sentValue,
            to: pyth.address,
            sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
            body: msgToPyth,
        });

        const balanceAfter = (await blockchain.getContract(pythConnector.address)).balance;

        // alice sent message to pyth
        expect(result.transactions).toHaveTransaction({
            from: aliceWallet.address,
            to: pyth.address,
            success: true,
        });

        // pyth validated feeds and sent prices to pyth connector
        expect(result.transactions).toHaveTransaction({
            from: pyth.address,
            to: pythConnector.address,
            success: true,
        });

        // Check that the pyth-connector balance increased by the transferred amount (within a small tolerance)
        const expectedBalance = balanceBefore + transferredAmount;
        const delta = Math.abs(Number(balanceAfter - expectedBalance));
        console.log({
            balanceBefore, 
            balanceAfter,
            expectedBalance,
            delta
        });

        expect(delta).toBeLessThanOrEqual(Number(toNano('0.00001')));

        // remaining balance sent back to alice
        expect(result.transactions).toHaveTransaction({
            from: pythConnector.address,
            to: aliceWallet.address,
            success: true,
        });

        console.log('externals: ', result.externals);

        // expect connector emitted proxy-operation log into externals
        const LOG_PROXY_OPERATION_PROCESSING = 128 + 12;
        const hasProxyLog = result.externals.some((m: any) => {
            const src = (m.info as any).src?.toString?.();
            if (src !== pythConnector.address.toString()) return false;
            const logInfo = parsePythProxyLogBody(m.body);
            console.log('logInfo: ', logInfo);
            return logInfo.op === LOG_PROXY_OPERATION_PROCESSING;
        });

        expect(hasProxyLog).toBe(true);
    })
});
