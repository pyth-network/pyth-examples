use crate::SendUsdError;
use anchor_lang::{
    prelude::*,
    solana_program::{
        serialize_utils::read_u16, sysvar::instructions::load_instruction_at_checked,
    },
};

pub const ID: Pubkey = pubkey!("ComputeBudget111111111111111111111111111111");

#[derive(AnchorDeserialize)]
enum ComputeBudgetInstruction {
    Unused, // deprecated variant, reserved value.
    /// Request a specific transaction-wide program heap region size in bytes.
    /// The value requested must be a multiple of 1024. This new heap region
    /// size applies to each program executed in the transaction, including all
    /// calls to CPIs.
    RequestHeapFrame(u32),
    /// Set a specific compute unit limit that the transaction is allowed to consume.
    SetComputeUnitLimit(u32),
    /// Set a compute unit price in "micro-lamports" to pay a higher transaction
    /// fee for higher transaction prioritization.
    SetComputeUnitPrice(u64),
    /// Set a specific transaction-wide account data size limit, in bytes, is allowed to load.
    SetLoadedAccountsDataSizeLimit(u32),
}

pub fn require_compute_units(sysvar_instructions: &UncheckedAccount) -> Result<()> {
    let num_instructions = read_u16(&mut 0, &sysvar_instructions.data.borrow()).unwrap();
    for index in 0..num_instructions {
        let instruction = load_instruction_at_checked(index.into(), &sysvar_instructions)?;
        if instruction.program_id == ID {
            match ComputeBudgetInstruction::try_from_slice(&instruction.data)? {
                ComputeBudgetInstruction::SetComputeUnitPrice(price) => {
                    if price > 0 {
                        return Ok(());
                    }
                }
                _ => {}
            }
        }
    }
    Err(SendUsdError::ComputeUnitsNotRequested.into())
}
