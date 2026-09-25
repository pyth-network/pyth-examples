use {
    anchor_lang::AccountDeserialize,
    anyhow::Context,
    bytemuck::{bytes_of, from_bytes},
    pyth_lazer_solana_contract::ed25519_program_args,
    pyth_lazer_solana_example::{
        InitializeArgs, Instruction as ExampleInstruction, State, UpdateArgs,
    },
    solana_client::rpc_client::RpcClient,
    solana_sdk::{
        instruction::{AccountMeta, Instruction},
        message::Message,
        pubkey::Pubkey,
        signature::read_keypair_file,
        signer::Signer,
        system_program, sysvar,
        transaction::Transaction,
    },
    std::env,
    std::mem::size_of,
};

fn main() -> anyhow::Result<()> {
    env_logger::init();
    let client = RpcClient::new(env::var("SOLANA_RPC_URL")?);
    let latest_blockhash = client.get_latest_blockhash()?;
    let keypair = read_keypair_file(env::var("SOLANA_KEYPAIR_FILE")?).unwrap();
    let program_id: Pubkey = env::var("EXAMPLE_PROGRAM_PUBKEY")?.parse()?;

    let (data_pda_key, _) = Pubkey::find_program_address(&[b"data"], &program_id);
    let cmd = env::args().nth(1).context("missing arg")?;

    if cmd == "init" {
        let mut init_data = vec![ExampleInstruction::Initialize as u8];
        init_data.extend_from_slice(bytes_of(&InitializeArgs { price_feed_id: 2 }));

        let tx = Transaction::new(
            &[&keypair],
            Message::new(
                &[Instruction::new_with_bytes(
                    program_id,
                    &init_data,
                    vec![
                        AccountMeta::new(keypair.pubkey(), true),
                        AccountMeta::new(data_pda_key, false),
                        AccountMeta::new_readonly(system_program::ID, false),
                    ],
                )],
                Some(&keypair.pubkey()),
            ),
            latest_blockhash,
        );
        let signature = client.send_and_confirm_transaction(&tx)?;
        println!("OK {signature:?}");
    } else if cmd == "update" {
        let state_data = client.get_account_data(&data_pda_key)?;
        let state = from_bytes::<State>(&state_data);
        println!("state: {state:?}");

        let pyth_storage_data = client.get_account_data(&pyth_lazer_solana_contract::STORAGE_ID)?;
        let pyth_storage =
            pyth_lazer_solana_contract::Storage::try_deserialize(&mut &*pyth_storage_data)?;

        let message = hex::decode(env::var("LAZER_UPDATE_HEX")?)?;
        let mut update_data = vec![ExampleInstruction::Update as u8];
        update_data.extend_from_slice(bytes_of(&UpdateArgs { hello: 42 }));
        update_data.extend_from_slice(&message);

        // Instruction #0 will be ed25519 instruction;
        // Instruction #1 will be our contract instruction.
        let instruction_index = 1;
        // Total offset of Pyth Lazer update within the instruction data;
        // 1 byte is the instruction type.
        let message_offset = (size_of::<UpdateArgs>() + 1).try_into().unwrap();
        let ed25519_args = pyth_lazer_solana_contract::Ed25519SignatureOffsets::new(
            &message,
            instruction_index,
            message_offset,
        );
        let tx = Transaction::new(
            &[&keypair],
            Message::new(
                &[
                    Instruction::new_with_bytes(
                        solana_program::ed25519_program::ID,
                        &ed25519_program_args(&[ed25519_args]),
                        vec![],
                    ),
                    Instruction::new_with_bytes(
                        program_id,
                        &update_data,
                        vec![
                            AccountMeta::new(keypair.pubkey(), true),
                            AccountMeta::new(data_pda_key, false),
                            AccountMeta::new(pyth_lazer_solana_contract::ID, false),
                            AccountMeta::new_readonly(
                                pyth_lazer_solana_contract::STORAGE_ID,
                                false,
                            ),
                            AccountMeta::new(pyth_storage.treasury, false),
                            AccountMeta::new_readonly(system_program::ID, false),
                            AccountMeta::new_readonly(sysvar::instructions::ID, false),
                        ],
                    ),
                ],
                Some(&keypair.pubkey()),
            ),
            latest_blockhash,
        );
        let signature = client.send_and_confirm_transaction(&tx)?;
        println!("OK {signature:?}");
    } else {
        panic!("unknown cmd");
    }
    Ok(())
}
