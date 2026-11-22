use {
    anchor_lang::InstructionData,
    bytemuck::{bytes_of, from_bytes},
    litesvm::LiteSVM,
    pyth_lazer_solana_contract::ed25519_program_args,
    pyth_lazer_solana_example::{
        InitializeArgs, Instruction as ExampleInstruction, State, UpdateArgs,
    },
    solana_keypair::Keypair,
    solana_program::{
        instruction::{AccountMeta, Instruction},
        native_token::LAMPORTS_PER_SOL,
        pubkey::Pubkey,
    },
    solana_sdk_ids::{ed25519_program, system_program, sysvar},
    solana_signer::Signer,
    solana_system_interface::instruction as system_instruction,
    solana_transaction::Transaction,
    std::{env, mem::size_of, path::PathBuf},
};

#[test]
fn test1() {
    let mut svm = LiteSVM::new();
    let payer = Keypair::new();
    svm.airdrop(&payer.pubkey(), LAMPORTS_PER_SOL).unwrap();

    let program_path = env::var_os("SBF_OUT_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("target/deploy"))
        .join("pyth_lazer_solana_example.so");
    svm.add_program_from_file(pyth_lazer_solana_example::ID, program_path)
        .expect("run cargo build-sbf before running this test");
    svm.add_program(
        pyth_lazer_solana_contract::ID,
        include_bytes!("fixtures/pyth_lazer_solana_contract.so"),
    )
    .unwrap();

    let treasury =
        Pubkey::create_with_seed(&payer.pubkey(), "treasury", &system_program::ID).unwrap();

    let transaction_create_treasury = Transaction::new_signed_with_payer(
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
        &[&payer],
        svm.latest_blockhash(),
    );
    svm.send_transaction(transaction_create_treasury).unwrap();

    let transaction_init_contract = Transaction::new_signed_with_payer(
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
        &[&payer],
        svm.latest_blockhash(),
    );
    svm.send_transaction(transaction_init_contract).unwrap();

    let verifying_key =
        hex::decode("74313a6525edf99936aa1477e94c72bc5cc617b21745f5f03296f3154461f214").unwrap();
    let message = hex::decode(
        "b9011a82e5cddee2c1bd364c8c57e1c98a6a28d194afcad410ff412226c8b2ae931ff59a57147cb47c7307\
        afc2a0a1abec4dd7e835a5b7113cf5aeac13a745c6bed6c60074313a6525edf99936aa1477e94c72bc5cc61\
        7b21745f5f03296f3154461f2141c0075d3c7931c9773f30a240600010102000000010000e1f50500000000",
    )
    .unwrap();

    let transaction_set_trusted = Transaction::new_signed_with_payer(
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
        &[&payer],
        svm.latest_blockhash(),
    );
    svm.send_transaction(transaction_set_trusted).unwrap();

    let (data_pda_key, _) =
        Pubkey::find_program_address(&[b"data"], &pyth_lazer_solana_example::ID);

    let mut init_data = vec![ExampleInstruction::Initialize as u8];
    init_data.extend_from_slice(bytes_of(&InitializeArgs { price_feed_id: 2 }));

    let transaction_init = Transaction::new_signed_with_payer(
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
        &[&payer],
        svm.latest_blockhash(),
    );
    svm.send_transaction(transaction_init).unwrap();

    let state = svm.get_account(&data_pda_key).unwrap();
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
    let transaction_update = Transaction::new_signed_with_payer(
        &[
            Instruction::new_with_bytes(
                ed25519_program::ID,
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
        &[&payer],
        svm.latest_blockhash(),
    );
    svm.send_transaction(transaction_update).unwrap();

    let state = svm.get_account(&data_pda_key).unwrap();
    let state = from_bytes::<State>(&state.data);
    assert_eq!({ state.price_feed }, 2);
    assert_eq!({ state.latest_timestamp }, 1728479312975644);
    assert_eq!({ state.latest_price }, 100000000);

    let verifying_key_ecdsa = hex::decode("b8d50f0bae75bf6e03c104903d7c3afc4a6596da").unwrap();
    let message_ecdsa = hex::decode(
        "e4bd474df2e5eaee8d9f99ee08f63f4268efa1ff89360767dfcd7677822891494ed32a5300d86440270aeabe9617c1924caad9486842c93bab6eaa7947cbea1a8599b4be011c0075d3c793e0511723f52e0600010102000000010000a11ec8720a0000",
    )
    .unwrap();

    let transaction_set_ecdsa_trusted = Transaction::new_signed_with_payer(
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
        &[&payer],
        svm.latest_blockhash(),
    );
    svm.send_transaction(transaction_set_ecdsa_trusted).unwrap();

    let mut update_ecdsa_data = vec![ExampleInstruction::UpdateEcdsa as u8];
    update_ecdsa_data.extend_from_slice(bytes_of(&UpdateArgs { hello: 42 }));
    update_ecdsa_data.extend_from_slice(&message_ecdsa);

    let transaction_update = Transaction::new_signed_with_payer(
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
        &[&payer],
        svm.latest_blockhash(),
    );
    svm.send_transaction(transaction_update).unwrap();

    let state = svm.get_account(&data_pda_key).unwrap();
    let state = from_bytes::<State>(&state.data);
    assert_eq!({ state.price_feed }, 2);
    assert_eq!({ state.latest_timestamp }, 1740480250860000);
    assert_eq!({ state.latest_price }, 11488100000000);
}
