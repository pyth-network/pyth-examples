import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, beginCell, Address } from '@ton/core';
import { SendUsd } from '../wrappers/SendUsd';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import * as dotenv from 'dotenv';

dotenv.config();

const PYTH_CONTRACT_ADDRESS = Address.parse(process.env.PYTH_CONTRACT_ADDRESS!);

describe('SendUsd', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('SendUsd');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let sendUsd: SandboxContract<SendUsd>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');

        sendUsd = blockchain.openContract(
            SendUsd.createFromConfig(
                {
                    pythAddress: PYTH_CONTRACT_ADDRESS,
                },
                code,
            ),
        );

        const deployResult = await sendUsd.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: sendUsd.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // Check initial state
        const pythAddress = await sendUsd.getPythAddress();
        expect(pythAddress.equals(PYTH_CONTRACT_ADDRESS)).toBe(true);

        await sendUsd.sendUsdPayment(deployer.getSender(), {
            queryId: 1,
            recipient: deployer.address,
            usdAmount: 1,
            updateData: Buffer.from(
                '504e41550100000003b801000000040d00b9a5cf8fee0ecfea72235131929a85b3073abc3cdbf3e2b711a2eefeaa5f19520e5e21fd8d98cfd6cbbef377944ed960e876aa5989dc35c159f94fc0c34d1b5c01031973c5bb8e5620155cbb9b6b4b88eeedc25347209aab45d9f602148173b099551dbab247972c8c572a675aeee774a38e1006ecf2aaa7edf43b30a6afdf47e2730104afbeda00ca07bba51922639a024fcb7cceb60da19e3f5625f214a5b8c04191261b54d053ac978d64aeabb80de0e580c43080b353532881392d6d8cd50e0719850006d001523419e70d63b1109bf59357816572f1e8b1e9ca55b6587dfc8e2e1685430fe5f9206168d9e254cc1e1e21fdc3a13373352caced314b5b81cc0ec17d81ae000889045dfd4594c0d7d4550f6bbd2a9322eb81833787061a8fc2b774fcf7c878196be931b51896ae139b8baf007be68930f875ffd3182dedb6426b68e89caa67d1000a6e0e2a8e0ca9ad38080f4d6f6cf229a67387496c59b311bed90553e187d6f9b53b175d7c0b3faecf46024fd9fc46ed5e1129baa88ae5ed20abfd910bd09288ab010bac4d398fbd04d6e481fce8cc024b93688f67fc6b70d5c410b63a72d9579a942f7689c3312c5251527d986b26d94347ae54ff2182cfde747eda48f5809544a83c010ca470e85726ad52262929199e8bf46c8f5984779b7c874fb474191a2ea455086712eaaffd7f7ec7442a4eba77812074324e2f90dc214187f8b860c2d364abf585010d8da0fd1005be38ca3a8fa6648b71cb955306d99be53fd3a2d1802e3b9db5ac7b0890490a880eb96818dac137ff58ac551782f5b166b291f1f1f309417ef7ccc4010e77fa5bc6e2c18a49df74b45e1d5fce437bf289c13450c57345f911087782e0677e1f4d9231810ebaad2cf7004d82db8030865a87785f16ddf818fa8fe4309192010f2cf37e5efbd8524ca4920a2e4b01d98f6d0ab82ff62af80ed29391bc21f900386e9e1c80bc66582aae903d177e4c29fe29f7c6350601889ed551ba308c84b7d0001076dd9029131a17d4fa1a456e4d297a2be48091b8f00875a138d64139eb102daf0d697520685bf66d77abbeb0b2f5aa0ad2ea30347b20d7a0769a077e272eebc5011162a4dfa794c986a04bcaee26e112481cb9997694edc6becb0f76d9d36637507e74c459a564ed40495a2d01a09aa7a79052b7524b15bc0d4b71775a9fc5f567b1016743ff3b00000000001ae101faedac5851e32b9b23b5f9411a8c2bac4aae3ed4dd7b811dd1a72ea4aa710000000005b16292014155575600000000000abe3b980000271093a27565a4ee2d8d7c6c72667d2a52c38125535b010055008963217838ab4cf5cadc172203c1f0b763fbaa45f346d8ee50ba994bbcac3026000000002457172f000000000010b4b7fffffff8000000006743ff3b000000006743ff3a00000000244b628800000000000d23330bed87d29432ea98221306eb7588ee69f48e29323bdabf30ce7c591950ea3d6d317f37d75b78dffd52a699270fdef648d174b6cad5ed2a227abaec7d5fffb2489e69f0037d60783ffed24e81c415bb5849ff9b4b079021d7624055719baa68b9b13a33b3ea315b1dcb20f38e832ac4387f4e1e68566afba0f92fc895b7cf3d6dd3a3584906bcb79dfb95671140d00a41c6a7ee63ac2f72d699f700f895a748cb9adf07ee15106bb5fb1d37a80da94e49a7d52b47e5711e25e02c08801a10f5889925ea5dc495a5e56ebd37d5fa54c04aaf36984ed35d0be0955a384f15',
                'hex',
            ),
            value: toNano('0.2'),
        });
    });
});
