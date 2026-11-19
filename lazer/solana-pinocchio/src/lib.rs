#![no_std]

use anchor_lang::InstructionData;
use pinocchio::{
    AccountView, Address, ProgramResult,
    cpi::{Seed, Signer, invoke},
    entrypoint,
    error::ProgramError,
    instruction::{InstructionAccount, InstructionView},
    sysvars::instructions::INSTRUCTIONS_ID,
};
use pinocchio_system::create_account_with_minimum_balance_signed;
use pyth_lazer_solana_contract::{
    ID as LAZER_ID, STORAGE_ID as LAZER_STORAGE_ID,
    instruction::{VerifyEcdsaMessage, VerifyMessage},
    protocol::{
        ChannelId,
        message::{LeEcdsaMessage, SolanaMessage},
        payload::{PayloadData, PayloadPropertyValue},
    },
};

entrypoint!(process_instruction);

fn process_instruction(
    program_id: &Address,
    accounts: &mut [AccountView],
    instruction_data: &[u8],
) -> ProgramResult {
    match instruction_data.split_first() {
        Some((0, data)) => process_initialize_instruction(program_id, accounts, data),
        Some((1, data)) => process_update_instruction(program_id, accounts, data),
        Some((2, data)) => process_update_ecdsa_instruction(program_id, accounts, data),
        _ => Err(ProgramError::InvalidInstructionData),
    }
}

const DATA_PDA_SEED: &[u8] = b"data";
// Packed little-endian fields: feed ID (u32), timestamp (u64), price mantissa (i64).
const STATE_LEN: usize = 20;
const LAZER_PROGRAM_ADDRESS: Address = Address::new_from_array(LAZER_ID.to_bytes());
const LAZER_STORAGE_ADDRESS: Address = Address::new_from_array(LAZER_STORAGE_ID.to_bytes());

fn process_initialize_instruction(
    program_id: &Address,
    accounts: &mut [AccountView],
    instruction_args: &[u8],
) -> ProgramResult {
    let [payer, data_pda, system_program] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    if !pinocchio_system::check_id(system_program.address()) {
        return Err(ProgramError::IncorrectProgramId);
    }
    if !payer.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }
    if !payer.is_writable() || !data_pda.is_writable() {
        return Err(ProgramError::InvalidAccountData);
    }

    let feed_id_bytes: &[u8; 4] = instruction_args
        .try_into()
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    let (data_pda_key, data_pda_bump_seed) =
        Address::find_program_address(&[DATA_PDA_SEED], program_id);

    if data_pda.address() != &data_pda_key {
        return Err(ProgramError::InvalidAccountData);
    }
    if !data_pda.owned_by(&pinocchio_system::ID) || data_pda.data_len() != 0 {
        return Err(ProgramError::AccountAlreadyInitialized);
    }
    let bump_bytes = [data_pda_bump_seed];
    let seeds = [Seed::from(DATA_PDA_SEED), Seed::from(&bump_bytes)];
    let signers = [Signer::from(&seeds)];

    // Create the data PDA.
    create_account_with_minimum_balance_signed(
        data_pda, STATE_LEN, program_id, payer, None, &signers,
    )?;

    // The newly allocated timestamp and price fields are zeroed by the System Program.
    let mut data_pda_data = data_pda.try_borrow_mut()?;
    data_pda_data[..4].copy_from_slice(feed_id_bytes);

    Ok(())
}

fn process_update_instruction(
    program_id: &Address,
    accounts: &mut [AccountView],
    instruction_args: &[u8],
) -> ProgramResult {
    let [
        payer,
        data_pda,
        lazer_program,
        storage,
        treasury,
        system_program,
        instructions_sysvar,
    ] = accounts
    else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    validate_update_accounts(program_id, data_pda, lazer_program, storage, system_program)?;
    if instructions_sysvar.address() != &INSTRUCTIONS_ID {
        return Err(ProgramError::InvalidAccountData);
    }
    let message = parse_update_message(instruction_args)?;

    // The Ed25519 precompile must be the first instruction in the transaction.
    let verify_data = VerifyMessage {
        message_data: message.to_vec(),
        ed25519_instruction_index: 0,
        signature_index: 0,
    }
    .data();
    let verify_accounts = [
        InstructionAccount::writable_signer(payer.address()),
        InstructionAccount::readonly(storage.address()),
        InstructionAccount::writable(treasury.address()),
        InstructionAccount::readonly(system_program.address()),
        InstructionAccount::readonly(instructions_sysvar.address()),
    ];
    invoke(
        &InstructionView {
            program_id: &LAZER_PROGRAM_ADDRESS,
            accounts: &verify_accounts,
            data: &verify_data,
        },
        &[
            &*payer,
            &*storage,
            &*treasury,
            &*system_program,
            &*instructions_sysvar,
        ],
    )?;

    // Decode the payload only after Lazer verifies the signed message.
    let message = SolanaMessage::deserialize_slice(message)
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    apply_update(data_pda, &message.payload)
}

fn process_update_ecdsa_instruction(
    program_id: &Address,
    accounts: &mut [AccountView],
    instruction_args: &[u8],
) -> ProgramResult {
    let [
        payer,
        data_pda,
        lazer_program,
        storage,
        treasury,
        system_program,
    ] = accounts
    else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    validate_update_accounts(program_id, data_pda, lazer_program, storage, system_program)?;
    let message = parse_update_message(instruction_args)?;

    let verify_data = VerifyEcdsaMessage {
        message_data: message.to_vec(),
    }
    .data();
    let verify_accounts = [
        InstructionAccount::writable_signer(payer.address()),
        InstructionAccount::readonly(storage.address()),
        InstructionAccount::writable(treasury.address()),
        InstructionAccount::readonly(system_program.address()),
    ];
    invoke(
        &InstructionView {
            program_id: &LAZER_PROGRAM_ADDRESS,
            accounts: &verify_accounts,
            data: &verify_data,
        },
        &[&*payer, &*storage, &*treasury, &*system_program],
    )?;

    // Decode the payload only after Lazer verifies the signed message.
    let message = LeEcdsaMessage::deserialize_slice(message)
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    apply_update(data_pda, &message.payload)
}

fn validate_update_accounts(
    program_id: &Address,
    data_pda: &AccountView,
    lazer_program: &AccountView,
    storage: &AccountView,
    system_program: &AccountView,
) -> ProgramResult {
    let expected_pda = Address::find_program_address(&[DATA_PDA_SEED], program_id).0;
    if data_pda.address() != &expected_pda
        || !data_pda.owned_by(program_id)
        || !data_pda.is_writable()
        || data_pda.data_len() != STATE_LEN
    {
        return Err(ProgramError::InvalidAccountData);
    }
    if lazer_program.address() != &LAZER_PROGRAM_ADDRESS
        || !pinocchio_system::check_id(system_program.address())
    {
        return Err(ProgramError::IncorrectProgramId);
    }
    // Lazer checks the storage contents, treasury and fee payer during the CPI.
    if storage.address() != &LAZER_STORAGE_ADDRESS || !storage.owned_by(&LAZER_PROGRAM_ADDRESS) {
        return Err(ProgramError::InvalidAccountData);
    }
    Ok(())
}

fn parse_update_message(instruction_args: &[u8]) -> Result<&[u8], ProgramError> {
    let (hello, message) = instruction_args
        .split_first_chunk::<8>()
        .ok_or(ProgramError::InvalidInstructionData)?;
    if u64::from_le_bytes(*hello) != 42 || message.is_empty() {
        return Err(ProgramError::InvalidInstructionData);
    }
    Ok(message)
}

fn apply_update(data_pda: &mut AccountView, payload: &[u8]) -> ProgramResult {
    let payload = PayloadData::deserialize_slice_le(payload)
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    let feed = payload
        .feeds
        .first()
        .ok_or(ProgramError::InvalidInstructionData)?;
    let Some(PayloadPropertyValue::Price(Some(price))) = feed.properties.first() else {
        return Err(ProgramError::InvalidInstructionData);
    };

    let mut state = data_pda.try_borrow_mut()?;
    let feed_id = u32::from_le_bytes(state[0..4].try_into().unwrap());
    let last_timestamp = u64::from_le_bytes(state[4..12].try_into().unwrap());
    let timestamp = payload.timestamp_us.as_micros();
    if feed.feed_id.0 != feed_id || payload.channel_id != ChannelId::REAL_TIME {
        return Err(ProgramError::InvalidInstructionData);
    }
    if timestamp <= last_timestamp {
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    state[4..12].copy_from_slice(&timestamp.to_le_bytes());
    state[12..20].copy_from_slice(&price.mantissa_i64().to_le_bytes());
    Ok(())
}
