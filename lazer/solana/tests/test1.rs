use {
    anchor_lang::InstructionData,
    bytemuck::{bytes_of, from_bytes},
    pyth_lazer_solana_contract::ed25519_program_args,
    pyth_lazer_solana_example::{
        process_instruction, InitializeArgs, Instruction as ExampleInstruction, State, UpdateArgs,
    },
    solana_program::instruction::{AccountMeta, Instruction},
    solana_program_test::{processor, ProgramTest},
    solana_sdk::{
        pubkey::Pubkey, signer::Signer, system_instruction, system_program, sysvar,
        transaction::Transaction,
    },
    std::env,
    std::mem::size_of,
};

#[tokio::test]
async fn test1() {
    if env::var("SBF_OUT_DIR").is_err() {
        env::set_var(
            "SBF_OUT_DIR",
            format!(
                "{}/target/sbf-solana-solana/release",
                env::var("CARGO_MANIFEST_DIR").unwrap()
            ),
        );
    }
    std::fs::copy(
        "tests/pyth_lazer_solana_contract.so",
        format!(
            "{}/target/sbf-solana-solana/release/pyth_lazer_solana_contract.so",
            env::var("CARGO_MANIFEST_DIR").unwrap()
        ),
    )
    .unwrap();
    println!("if add_program fails, run `cargo build-sbf` first.");
    let mut program_test = ProgramTest::new(
        "pyth_lazer_solana_example",
        pyth_lazer_solana_example::ID,
        processor!(process_instruction),
    );
    program_test.add_program(
        "pyth_lazer_solana_contract",
        pyth_lazer_solana_contract::ID,
        None,
    );
    let (mut banks_client, payer, recent_blockhash) = program_test.start().await;

    let treasury =
        Pubkey::create_with_seed(&payer.pubkey(), "treasury", &system_program::ID).unwrap();

    let mut transaction_create_treasury = Transaction::new_with_payer(
        &[system_instruction::create_account_with_seed(
            &payer.pubkey(),
            &treasury,
            &payer.pubkey(),
            "treasury",
            10_000_000,
            0,
            &system_program::ID,
        )],
        Some(&payer.pubkey()),
    );
    transaction_create_treasury.sign(&[&payer], recent_blockhash);
    banks_client
        .process_transaction(transaction_create_treasury)
        .await
        .unwrap();

    let mut transaction_init_contract = Transaction::new_with_payer(
        &[Instruction::new_with_bytes(
            pyth_lazer_solana_contract::ID,
            &pyth_lazer_solana_contract::instruction::Initialize {
                top_authority: payer.pubkey(),
                treasury,
            }
            .data(),
            vec![
                AccountMeta::new(payer.pubkey(), true),
                AccountMeta::new(pyth_lazer_solana_contract::STORAGE_ID, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
        )],
        Some(&payer.pubkey()),
    );
    transaction_init_contract.sign(&[&payer], recent_blockhash);
    banks_client
        .process_transaction(transaction_init_contract)
        .await
        .unwrap();

    let verifying_key =
        hex::decode("74313a6525edf99936aa1477e94c72bc5cc617b21745f5f03296f3154461f214").unwrap();
    let message = hex::decode(
        "b9011a82e5cddee2c1bd364c8c57e1c98a6a28d194afcad410ff412226c8b2ae931ff59a57147cb47c7307\
        afc2a0a1abec4dd7e835a5b7113cf5aeac13a745c6bed6c60074313a6525edf99936aa1477e94c72bc5cc61\
        7b21745f5f03296f3154461f2141c0075d3c7931c9773f30a240600010102000000010000e1f50500000000",
    )
    .unwrap();

    let mut transaction_set_trusted = Transaction::new_with_payer(
        &[Instruction::new_with_bytes(
            pyth_lazer_solana_contract::ID,
            &pyth_lazer_solana_contract::instruction::Update {
                trusted_signer: verifying_key.try_into().unwrap(),
                expires_at: i64::MAX,
            }
            .data(),
            vec![
                AccountMeta::new(payer.pubkey(), true),
                AccountMeta::new(pyth_lazer_solana_contract::STORAGE_ID, false),
            ],
        )],
        Some(&payer.pubkey()),
    );
    transaction_set_trusted.sign(&[&payer], recent_blockhash);
    banks_client
        .process_transaction(transaction_set_trusted)
        .await
        .unwrap();

    let (data_pda_key, _) =
        Pubkey::find_program_address(&[b"data"], &pyth_lazer_solana_example::ID);

    let mut init_data = vec![ExampleInstruction::Initialize as u8];
    init_data.extend_from_slice(bytes_of(&InitializeArgs { price_feed_id: 2 }));

    let mut transaction_init = Transaction::new_with_payer(
        &[Instruction::new_with_bytes(
            pyth_lazer_solana_example::ID,
            &init_data,
            vec![
                AccountMeta::new(payer.pubkey(), true),
                AccountMeta::new(data_pda_key, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
        )],
        Some(&payer.pubkey()),
    );
    transaction_init.sign(&[&payer], recent_blockhash);
    banks_client
        .process_transaction(transaction_init)
        .await
        .unwrap();

    let state = banks_client
        .get_account(data_pda_key)
        .await
        .unwrap()
        .unwrap();
    let state = from_bytes::<State>(&state.data);
    assert_eq!({ state.price_feed }, 2);
    assert_eq!({ state.latest_price }, 0);
    assert_eq!({ state.latest_timestamp }, 0);

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
    let mut transaction_update = Transaction::new_with_payer(
        &[
            Instruction::new_with_bytes(
                solana_program::ed25519_program::ID,
                &ed25519_program_args(&[ed25519_args]),
                vec![],
            ),
            Instruction::new_with_bytes(
                pyth_lazer_solana_example::ID,
                &update_data,
                vec![
                    AccountMeta::new(payer.pubkey(), true),
                    AccountMeta::new(data_pda_key, false),
                    AccountMeta::new(pyth_lazer_solana_contract::ID, false),
                    AccountMeta::new_readonly(pyth_lazer_solana_contract::STORAGE_ID, false),
                    AccountMeta::new(treasury, false),
                    AccountMeta::new_readonly(system_program::ID, false),
                    AccountMeta::new_readonly(sysvar::instructions::ID, false),
                ],
            ),
        ],
        Some(&payer.pubkey()),
    );
    transaction_update.sign(&[&payer], recent_blockhash);
    banks_client
        .process_transaction(transaction_update)
        .await
        .unwrap();

    let state = banks_client
        .get_account(data_pda_key)
        .await
        .unwrap()
        .unwrap();
    let state = from_bytes::<State>(&state.data);
    assert_eq!({ state.price_feed }, 2);
    assert_eq!({ state.latest_timestamp }, 1728479312975644);
    assert_eq!({ state.latest_price }, 100000000);

    let verifying_key_ecdsa = hex::decode("b8d50f0bae75bf6e03c104903d7c3afc4a6596da").unwrap();
    let message_ecdsa = hex::decode(
        "e4bd474df2e5eaee8d9f99ee08f63f4268efa1ff89360767dfcd7677822891494ed32a5300d86440270aeabe9617c1924caad9486842c93bab6eaa7947cbea1a8599b4be011c0075d3c793e0511723f52e0600010102000000010000a11ec8720a0000",
    )
    .unwrap();

    let mut transaction_set_ecdsa_trusted = Transaction::new_with_payer(
        &[Instruction::new_with_bytes(
            pyth_lazer_solana_contract::ID,
            &pyth_lazer_solana_contract::instruction::UpdateEcdsaSigner {
                trusted_signer: verifying_key_ecdsa.try_into().unwrap(),
                expires_at: i64::MAX,
            }
            .data(),
            vec![
                AccountMeta::new(payer.pubkey(), true),
                AccountMeta::new(pyth_lazer_solana_contract::STORAGE_ID, false),
            ],
        )],
        Some(&payer.pubkey()),
    );
    transaction_set_ecdsa_trusted.sign(&[&payer], recent_blockhash);
    banks_client
        .process_transaction(transaction_set_ecdsa_trusted)
        .await
        .unwrap();

    let mut update_ecdsa_data = vec![ExampleInstruction::UpdateEcdsa as u8];
    update_ecdsa_data.extend_from_slice(bytes_of(&UpdateArgs { hello: 42 }));
    update_ecdsa_data.extend_from_slice(&message_ecdsa);

    let mut transaction_update = Transaction::new_with_payer(
        &[Instruction::new_with_bytes(
            pyth_lazer_solana_example::ID,
            &update_ecdsa_data,
            vec![
                AccountMeta::new(payer.pubkey(), true),
                AccountMeta::new(data_pda_key, false),
                AccountMeta::new(pyth_lazer_solana_contract::ID, false),
                AccountMeta::new_readonly(pyth_lazer_solana_contract::STORAGE_ID, false),
                AccountMeta::new(treasury, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
        )],
        Some(&payer.pubkey()),
    );
    transaction_update.sign(&[&payer], recent_blockhash);
    banks_client
        .process_transaction(transaction_update)
        .await
        .unwrap();

    let state = banks_client
        .get_account(data_pda_key)
        .await
        .unwrap()
        .unwrap();
    let state = from_bytes::<State>(&state.data);
    assert_eq!({ state.price_feed }, 2);
    assert_eq!({ state.latest_timestamp }, 1740480250860000);
    assert_eq!({ state.latest_price }, 11488100000000);
}
