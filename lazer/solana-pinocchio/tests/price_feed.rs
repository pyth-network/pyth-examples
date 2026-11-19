use std::path::Path;

use anchor_lang::InstructionData;
use litesvm::LiteSVM;
use pyth_lazer_solana_contract::{self as lazer, instruction as lazer_instruction};
use solana_keypair::Keypair;
use solana_message::{AccountMeta, Instruction};
use solana_native_token::LAMPORTS_PER_SOL;
use solana_pubkey::Pubkey;
use solana_signer::Signer;
use solana_system_interface::{instruction::create_account_with_seed, program as system_program};
use solana_transaction::Transaction;

#[test]
fn initialize_and_update_price_feed_state() {
    let mut svm = LiteSVM::new();
    let payer = Keypair::new();
    let program_id = Pubkey::new_unique();
    let (data_pda, _) = Pubkey::find_program_address(&[b"data"], &program_id);
    let price_feed_id = 2u32;

    svm.airdrop(&payer.pubkey(), LAMPORTS_PER_SOL).unwrap();
    let program_path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("target/deploy/pyth_lazer_solana_pinocchio_example.so");
    svm.add_program_from_file(program_id, &program_path)
        .expect("run cargo build-sbf before running this test");

    let lazer_program_id = Pubkey::new_from_array(lazer::ID.to_bytes());
    let storage = Pubkey::new_from_array(lazer::STORAGE_ID.to_bytes());
    svm.add_program(
        lazer_program_id,
        include_bytes!("fixtures/pyth_lazer_solana_contract.so"),
    )
    .unwrap();

    let payer_key = payer.pubkey();
    let treasury = Pubkey::create_with_seed(&payer_key, "treasury", &system_program::ID).unwrap();
    let trusted_signer =
        hex::decode("74313a6525edf99936aa1477e94c72bc5cc617b21745f5f03296f3154461f214")
            .unwrap()
            .try_into()
            .unwrap();
    let setup = [
        create_account_with_seed(
            &payer_key,
            &treasury,
            &payer_key,
            "treasury",
            10_000_000,
            0,
            &system_program::ID,
        ),
        Instruction {
            program_id: lazer_program_id,
            accounts: vec![
                AccountMeta::new(payer_key, true),
                AccountMeta::new(storage, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data: lazer_instruction::Initialize {
                top_authority: payer_key,
                treasury,
            }
            .data(),
        },
        Instruction {
            program_id: lazer_program_id,
            accounts: vec![
                AccountMeta::new(payer_key, true),
                AccountMeta::new(storage, false),
            ],
            data: lazer_instruction::Update {
                trusted_signer,
                expires_at: i64::MAX,
            }
            .data(),
        },
    ];
    let setup_transaction = Transaction::new_signed_with_payer(
        &setup,
        Some(&payer_key),
        &[&payer],
        svm.latest_blockhash(),
    );
    svm.send_transaction(setup_transaction).unwrap();

    let mut data = vec![0];
    data.extend_from_slice(&price_feed_id.to_le_bytes());
    let instruction = Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(payer.pubkey(), true),
            AccountMeta::new(data_pda, false),
            AccountMeta::new_readonly(system_program::ID, false),
        ],
        data,
    };
    let transaction = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&payer.pubkey()),
        &[&payer],
        svm.latest_blockhash(),
    );

    svm.send_transaction(transaction).unwrap();

    let state = svm.get_account(&data_pda).unwrap();
    assert_eq!(state.owner, program_id);
    assert!(state.lamports > 0);
    assert_eq!(state.data.len(), 20);
    assert_eq!(&state.data[0..4], &price_feed_id.to_le_bytes());
    assert_eq!(&state.data[4..12], &0u64.to_le_bytes());
    assert_eq!(&state.data[12..20], &0i64.to_le_bytes());

    let message = hex::decode(concat!(
        "b9011a82e5cddee2c1bd364c8c57e1c98a6a28d194afcad410ff412226c8b2ae931ff59a57147cb47c7307",
        "afc2a0a1abec4dd7e835a5b7113cf5aeac13a745c6bed6c60074313a6525edf99936aa1477e94c72bc5cc61",
        "7b21745f5f03296f3154461f2141c0075d3c7931c9773f30a240600010102000000010000e1f50500000000",
    ))
    .unwrap();
    let mut update_data = vec![1];
    update_data.extend_from_slice(&42u64.to_le_bytes());
    let message_offset = u16::try_from(update_data.len()).unwrap();
    update_data.extend_from_slice(&message);

    // The precompile is instruction 0 and verifies bytes embedded in instruction 1.
    let signature = lazer::Ed25519SignatureOffsets::new(&message, 1, message_offset);
    let ed25519_verify = Instruction {
        program_id: Pubkey::from_str_const("Ed25519SigVerify111111111111111111111111111"),
        accounts: vec![],
        data: lazer::ed25519_program_args(&[signature]),
    };
    let instructions_sysvar = pinocchio::sysvars::instructions::INSTRUCTIONS_ID;
    let update = Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(payer_key, true),
            AccountMeta::new(data_pda, false),
            AccountMeta::new_readonly(lazer_program_id, false),
            AccountMeta::new_readonly(storage, false),
            AccountMeta::new(treasury, false),
            AccountMeta::new_readonly(system_program::ID, false),
            AccountMeta::new_readonly(instructions_sysvar, false),
        ],
        data: update_data,
    };
    let transaction = Transaction::new_signed_with_payer(
        &[ed25519_verify, update],
        Some(&payer_key),
        &[&payer],
        svm.latest_blockhash(),
    );
    svm.send_transaction(transaction).unwrap();

    let state = svm.get_account(&data_pda).unwrap();
    assert_eq!(&state.data[0..4], &price_feed_id.to_le_bytes());
    assert_eq!(&state.data[4..12], &1_728_479_312_975_644u64.to_le_bytes());
    assert_eq!(&state.data[12..20], &100_000_000i64.to_le_bytes());

    let trusted_ecdsa_signer = hex::decode("b8d50f0bae75bf6e03c104903d7c3afc4a6596da")
        .unwrap()
        .try_into()
        .unwrap();
    let register_ecdsa_signer = Instruction {
        program_id: lazer_program_id,
        accounts: vec![
            AccountMeta::new(payer_key, true),
            AccountMeta::new(storage, false),
        ],
        data: lazer_instruction::UpdateEcdsaSigner {
            trusted_signer: trusted_ecdsa_signer,
            expires_at: i64::MAX,
        }
        .data(),
    };
    let transaction = Transaction::new_signed_with_payer(
        &[register_ecdsa_signer],
        Some(&payer_key),
        &[&payer],
        svm.latest_blockhash(),
    );
    svm.send_transaction(transaction).unwrap();

    let ecdsa_message = hex::decode(concat!(
        "e4bd474df2e5eaee8d9f99ee08f63f4268efa1ff89360767dfcd7677822891494ed32a5300d86440270aeabe",
        "9617c1924caad9486842c93bab6eaa7947cbea1a8599b4be011c0075d3c793e0511723f52e060001010200",
        "0000010000a11ec8720a0000",
    ))
    .unwrap();
    let mut update_data = vec![2];
    update_data.extend_from_slice(&42u64.to_le_bytes());
    update_data.extend_from_slice(&ecdsa_message);
    let update_ecdsa = Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(payer_key, true),
            AccountMeta::new(data_pda, false),
            AccountMeta::new_readonly(lazer_program_id, false),
            AccountMeta::new_readonly(storage, false),
            AccountMeta::new(treasury, false),
            AccountMeta::new_readonly(system_program::ID, false),
        ],
        data: update_data,
    };

    // Changing a byte of the signed price must leave the PDA unchanged.
    let mut tampered_update = update_ecdsa.clone();
    *tampered_update.data.last_mut().unwrap() ^= 1;
    let transaction = Transaction::new_signed_with_payer(
        &[tampered_update],
        Some(&payer_key),
        &[&payer],
        svm.latest_blockhash(),
    );
    assert!(svm.send_transaction(transaction).is_err());
    assert_eq!(svm.get_account(&data_pda).unwrap().data, state.data);

    let transaction = Transaction::new_signed_with_payer(
        &[update_ecdsa],
        Some(&payer_key),
        &[&payer],
        svm.latest_blockhash(),
    );
    svm.send_transaction(transaction).unwrap();

    let state = svm.get_account(&data_pda).unwrap();
    assert_eq!(&state.data[0..4], &price_feed_id.to_le_bytes());
    assert_eq!(&state.data[4..12], &1_740_480_250_860_000u64.to_le_bytes());
    assert_eq!(&state.data[12..20], &11_488_100_000_000i64.to_le_bytes());
}
