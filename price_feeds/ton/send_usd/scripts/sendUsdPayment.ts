import { toNano, Address } from '@ton/core';
import { SendUsd } from '../wrappers/SendUsd';
import { NetworkProvider } from '@ton/blueprint';
import { HermesClient } from '@pythnetwork/hermes-client';
import * as dotenv from 'dotenv';
import { TonClient } from '@ton/ton';

dotenv.config();

const HERMES_ENDPOINT = 'https://hermes.pyth.network';
const TON_PRICE_FEED_ID = '0x8963217838ab4cf5cadc172203c1f0b763fbaa45f346d8ee50ba994bbcac3026';

export async function run(provider: NetworkProvider, args: string[]) {
    const [recipientAddress, usdAmount] = args;

    if (!recipientAddress || !usdAmount) {
        console.error('Usage: blueprint run sendUsdPayment <recipient_address> <usd_amount>');
        process.exit(1);
    }

    const hermesClient = new HermesClient(HERMES_ENDPOINT);
    const priceIds = [TON_PRICE_FEED_ID];
    const latestPriceUpdates = await hermesClient.getLatestPriceUpdates(priceIds, { encoding: 'hex' });
    console.log('Hermes TON price:', latestPriceUpdates.parsed?.[0].price);

    // Calculate required TON amount based on current price
    const price = latestPriceUpdates.parsed?.[0].price.price!;
    const expo = latestPriceUpdates.parsed?.[0].price.expo!;
    const usdAmountNum = parseInt(usdAmount);

    // Calculate TON needed for USD amount
    // If TON price is $5.70, then 1 USD = 1/5.70 TON ≈ 0.1754385965 TON
    const priceDecimals = -expo;
    const priceInUsd = Number(price) / 10 ** priceDecimals; // Convert price to actual USD value
    const tonAmount = (usdAmountNum / priceInUsd) * 1e9; // Convert to nanoTON
    const tonNeeded = BigInt(Math.floor(tonAmount));

    // Add base fee (0.2 TON)
    const totalValue = toNano('0.4') + tonNeeded;

    const updateData = Buffer.from(latestPriceUpdates.binary.data[0], 'hex');
    console.log('Update data:', updateData.toString('hex'));
    console.log('Sending total value:', totalValue.toString(), 'nanotons');

    // Open the deployed contract
    const sendUsd = provider.open(
        SendUsd.createFromAddress(Address.parse(process.env.SEND_USD_CONTRACT_ADDRESS || '')),
    );

    const pythAddress = await sendUsd.getPythAddress();
    console.log('Sending request to Pyth contract at:', pythAddress.toString());

    // Send the USD payment
    await sendUsd.sendUsdPayment(provider.sender(), {
        queryId: 1,
        recipient: Address.parse(recipientAddress),
        usdAmount: usdAmountNum,
        updateData: updateData,
        value: totalValue,
    });

    console.log('Sleeping for 30 seconds to allow transactions to process');
    // Wait a bit for transactions to process
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // const client = provider.api() as TonClient;
    const client = provider.api() as TonClient;

    // Get transactions for our contract
    const contractTxs = await client.getTransactions(sendUsd.address, {
        limit: 10, // Get more transactions to see the chain
    });

    console.log('\nTransaction chain:');
    for (const tx of contractTxs) {
        console.log('\nTransaction:', tx.hash().toString('hex'));

        // Add this to see debug logs
        if ('description' in tx && 'type' in tx.description && tx.description.type === 'generic') {
            const computePhase = tx.description.computePhase;
            if (computePhase?.type === 'vm') {
                console.log('Compute phase details:', {
                    exitCode: computePhase.exitCode,
                    gasUsed: computePhase.gasUsed,
                    success: computePhase.success,
                    // Log any other available fields
                    raw: computePhase,
                });

                // Extract VM logs if available
                if ('vmLogs' in tx) {
                    console.log('VM Logs:', tx.vmLogs);
                }
            }
        }

        // Check incoming message
        if (tx.inMessage?.info.type === 'internal') {
            console.log('From:', tx.inMessage.info.src?.toString());
            console.log('Value:', tx.inMessage.info.value.coins.toString());

            // Decode bounced message
            if (tx.inMessage.info.bounced && tx.inMessage.body.bits.length > 0) {
                const slice = tx.inMessage.body.beginParse();
                try {
                    slice.skip(32); // Skip bounce header
                    const op = slice.loadUint(32);
                    console.log('Bounced message op:', op);
                } catch (e) {
                    console.log('Failed to decode bounced message:', e);
                }
            }
        }

        console.log('Out messages count:', tx.outMessagesCount);

        // Check outgoing messages
        for (const [_, outMsg] of tx.outMessages) {
            if (outMsg.info.type === 'internal') {
                console.log('Outgoing message to:', outMsg.info.dest?.toString());
                console.log('Value:', outMsg.info.value.coins.toString());

                // If you want to see the message body content
                if (outMsg.body.bits.length > 0) {
                    const slice = outMsg.body.beginParse();
                    try {
                        const op = slice.loadUint(32);
                        console.log('Message op:', op);
                    } catch (e) {
                        console.log('No op in message body');
                    }
                }
            }
        }

        // Check transaction status
        const description = tx.description;
        if ('type' in description && description.type === 'generic') {
            const exitCode = description.computePhase?.type === 'vm' ? description.computePhase.exitCode : 'unknown';
            console.log('Exit code:', exitCode);
        }

        // For bounced messages, decode and log everything
        if (tx.inMessage?.info.type === 'internal' && tx.inMessage.info.bounced) {
            console.log('Bounced message full details:', {
                value: tx.inMessage.info.value.coins.toString(),
                from: tx.inMessage.info.src?.toString(),
                to: tx.inMessage.info.dest?.toString(),
                bodyBits: tx.inMessage.body.bits.toString(),
                bodyCell: tx.inMessage.body.toBoc().toString('hex'),
                rawBody: tx.inMessage.body,
            });

            // Still try to decode the op
            const slice = tx.inMessage.body.beginParse();
            try {
                slice.skip(32); // Skip bounce header
                const op = slice.loadUint(32);
                const remaining = slice.remainingBits;
                // Try to read all remaining data as uint256 chunks for visibility
                const remainingData = [];
                while (slice.remainingBits >= 8) {
                    remainingData.push(slice.loadUint(8));
                }
                console.log('Decoded bounce:', {
                    op,
                    remainingBits: remaining,
                    remainingData,
                });
            } catch (e) {
                console.log('Failed to decode bounced message:', e);
            }
        }
    }

    // Look for the final TON transfer to recipient
    const recipientTxs = await client.getTransactions(Address.parse(recipientAddress), {
        limit: 5,
    });

    const receivedTx = recipientTxs.find(
        (tx) => tx.inMessage?.info.type === 'internal' && tx.inMessage.info.src?.equals(sendUsd.address),
    );

    if (receivedTx && receivedTx.inMessage?.info.type === 'internal' && 'value' in receivedTx.inMessage.info) {
        console.log('\nFinal TON transfer found!');
        console.log('Amount:', receivedTx.inMessage.info.value.coins.toString());
    } else {
        console.log('\nNo TON transfer to recipient found yet. Might need more time or transaction failed.');
    }
}
