use {
    bytemuck::{bytes_of, try_from_bytes, try_from_bytes_mut, Pod, Zeroable},
    num_derive::FromPrimitive,
    num_traits::FromPrimitive,
    pyth_lazer_sdk::protocol::{
        payload::{PayloadData, PayloadPropertyValue},
        router::Channel,
    },
    solana_program::{
        account_info::AccountInfo, declare_id, entrypoint::ProgramResult, program::invoke_signed,
        program_error::ProgramError, pubkey::Pubkey, rent::Rent,
        system_instruction::create_account, sysvar::Sysvar,
    },
    std::mem::size_of,
};

// rustfmt's unstable import merging feature breaks complilation.
#[rustfmt::skip]
use solana_program::entrypoint;

declare_id!("My11111111111111111111111111111111111111111");

// declare and export the program's entrypoint
entrypoint!(process_instruction);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, FromPrimitive)]
pub enum Instruction {
    /// Initialize the data PDA.
    /// Data: `InitializeArgs`
    /// Accounts:
    /// 1. payer account
    /// 2. data account
    /// 3. system program
    Initialize = 0,
    /// Update price.
    /// Data: `UpdateArgs` followed by a signed Pyth Lazer update.
    /// Accounts:
    /// 1. sysvar account [readonly] - required for Pyth Lazer
    /// 2. data account [writable] - needed by our example contract
    /// 3. pyth storage account [readonly] - required for Pyth Lazer
    Update = 1,
}

/// Inputs to the `Initialize` instruction.
#[derive(Debug, Clone, Copy, Zeroable, Pod)]
#[repr(C, packed)]
pub struct InitializeArgs {
    /// ID of the price feed that this contract tracks.
    pub price_feed_id: u32,
}

/// Inputs to the `Update` instruction. `UpdateArgs` must be followed by a signed Pyth Lazer message.
#[derive(Debug, Clone, Copy, Zeroable, Pod)]
#[repr(C, packed)]
pub struct UpdateArgs {
    /// Example argument
    pub hello: u64,
}

/// Content of the data PDA.
#[derive(Debug, Clone, Copy, Zeroable, Pod)]
#[repr(C, packed)]
pub struct State {
    /// ID of the price feed that this contract tracks.
    pub price_feed: u32,
    /// Latest observed timestamp for this price feed.
    pub latest_timestamp: u64,
    /// Latest observed price for this price feed.
    pub latest_price: i64,
}

const DATA_PDA_SEED: &[u8] = b"data";

/// Program entrypoint's implementation.
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    // In our example contract, the first byte is the ID of the instruction.
    let instruction = *instruction_data
        .first()
        .ok_or(ProgramError::InvalidInstructionData)?;
    let instruction =
        Instruction::from_u8(instruction).ok_or(ProgramError::InvalidInstructionData)?;
    let instruction_args = &instruction_data[1..];

    match instruction {
        Instruction::Initialize => {
            process_initialize_instruction(program_id, accounts, instruction_args)
        }
        Instruction::Update => process_update_instruction(program_id, accounts, instruction_args),
    }
}

pub fn process_initialize_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_args: &[u8],
) -> ProgramResult {
    if accounts.len() != 3 {
        return Err(ProgramError::NotEnoughAccountKeys);
    }
    let payer_account = &accounts[0];
    let data_account = &accounts[1];
    let system_program_account = &accounts[2];

    let (data_pda_key, data_pda_bump_seed) =
        Pubkey::find_program_address(&[DATA_PDA_SEED], program_id);
    if data_account.key != &data_pda_key {
        return Err(ProgramError::InvalidAccountData);
    }

    let args = try_from_bytes::<InitializeArgs>(instruction_args)
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    let space = size_of::<State>();
    // Create the data PDA.
    let create_instruction = create_account(
        payer_account.key,
        data_account.key,
        Rent::get()?.minimum_balance(space),
        space as u64,
        program_id,
    );
    invoke_signed(
        &create_instruction,
        &[
            payer_account.clone(),
            data_account.clone(),
            system_program_account.clone(),
        ],
        &[&[DATA_PDA_SEED, &[data_pda_bump_seed]]],
    )?;
    // Write config to the PDA.
    data_account
        .data
        .borrow_mut()
        .clone_from_slice(bytes_of(&State {
            price_feed: args.price_feed_id,
            latest_timestamp: 0,
            latest_price: 0,
        }));
    Ok(())
}

pub fn process_update_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_args: &[u8],
) -> ProgramResult {
    // Verify accounts passed to the instruction.
    if accounts.len() != 3 {
        return Err(ProgramError::NotEnoughAccountKeys);
    }
    let sysvar_account = &accounts[0];
    let data_account = &accounts[1];
    let pyth_storage_account = &accounts[2];

    let (data_pda_key, _) = Pubkey::find_program_address(&[DATA_PDA_SEED], program_id);
    if data_account.key != &data_pda_key {
        return Err(ProgramError::InvalidAccountData);
    }

    // Parse instruction data.
    let update_args = instruction_args
        .get(..size_of::<UpdateArgs>())
        .and_then(|data| try_from_bytes::<UpdateArgs>(data).ok())
        .ok_or(ProgramError::InvalidInstructionData)?;
    if update_args.hello != 42 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let pyth_message = &instruction_args[size_of::<UpdateArgs>()..];

    // Offset of pyth message within the original instruction_data.
    // 1 byte is the instruction id.
    let pyth_message_total_offset = size_of::<UpdateArgs>() + 1;
    // We expect the instruction to the built-in ed25519 program to be
    // the first instruction within the transaction.
    let ed25519_instruction_index = 0;
    // We expect our signature to be the first (and only) signature to be checked
    // by the built-in ed25519 program within the transaction.
    let signature_index = 0;
    // Check signature verification.
    let verified = pyth_lazer_sdk::verify_message(
        pyth_storage_account,
        sysvar_account,
        pyth_message,
        ed25519_instruction_index,
        signature_index,
        pyth_message_total_offset.try_into().unwrap(),
    )?;

    // Deserialize and use the payload.
    let data = PayloadData::deserialize_slice_le(verified.payload)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    if data.feeds.is_empty() || data.feeds[0].properties.is_empty() {
        return Err(ProgramError::InvalidInstructionData);
    }

    // Read the data PDA of our example contract.
    let mut state_data = data_account.data.borrow_mut();
    let state =
        try_from_bytes_mut::<State>(*state_data).map_err(|_| ProgramError::InvalidAccountData)?;

    if state.price_feed != data.feeds[0].feed_id.0 {
        return Err(ProgramError::InvalidInstructionData);
    }
    if data.channel_id != Channel::RealTime.id() {
        return Err(ProgramError::InvalidInstructionData);
    }
    if data.timestamp_us.0 <= state.latest_timestamp {
        return Err(ProgramError::AccountAlreadyInitialized);
    }
    let PayloadPropertyValue::Price(Some(price)) = data.feeds[0].properties[0] else {
        return Err(ProgramError::InvalidInstructionData);
    };
    state.latest_price = price.into_inner().into();
    state.latest_timestamp = data.timestamp_us.0;
    Ok(())
}
