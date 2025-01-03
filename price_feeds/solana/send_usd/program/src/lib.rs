use {
    anchor_lang::{
        prelude::*,
        solana_program::{
            native_token::LAMPORTS_PER_SOL, system_instruction, sysvar::instructions,
        },
    },
    pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2},
};

mod compute_budget;

declare_id!("A36p4i3fmZZgEFCRimUyBT8disdfLWfZaY4hPwYJahsV");

pub const MAXIMUM_AGE: u64 = 1;
pub const FEED_ID: &str = "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";
pub const SOL_USD_PRICE_FEED_ADDRESS: Pubkey =
    pubkey!("7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE");

#[program]
pub mod send_usd {
    use super::*;

    pub fn send(ctx: Context<Send>, amount_in_usd: u64) -> Result<()> {
        require!(amount_in_usd > 0, SendUsdError::InvalidAmount);
        require!(
            ctx.accounts.price_update.key() != SOL_USD_PRICE_FEED_ADDRESS,
            SendUsdError::PriceFeedAccountNotAllowed
        );

        let price_update = &mut ctx.accounts.price_update;
        let price = price_update.get_price_no_older_than(
            &Clock::get()?,
            MAXIMUM_AGE,
            &get_feed_id_from_hex(FEED_ID)?,
        )?;

        let amount_in_lamports = LAMPORTS_PER_SOL
            .checked_div(10_u64.pow(price.exponent.abs().try_into().unwrap()))
            .unwrap()
            .checked_mul(amount_in_usd)
            .unwrap()
            .checked_mul(price.price.try_into().unwrap())
            .unwrap();

        let transfer_instruction = system_instruction::transfer(
            ctx.accounts.destination.key,
            ctx.accounts.payer.key,
            amount_in_lamports,
        );
        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.destination.to_account_info(),
            ],
        )?;

        compute_budget::require_compute_units(&ctx.accounts.sysvar_instructions)?;

        Ok(())
    }
}

#[error_code]
pub enum SendUsdError {
    #[msg("Amount to transfer is zero")]
    InvalidAmount,
    #[msg("This transaction doesn't request compute units")]
    ComputeUnitsNotRequested,
    #[msg("This transaction should not use a price feed account")]
    PriceFeedAccountNotAllowed,
}

#[derive(Accounts)]
#[instruction(amount_in_usd : u64)]
pub struct Send<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    /// CHECK : Just a destination account
    pub destination: AccountInfo<'info>,
    pub price_update: Account<'info, PriceUpdateV2>,
    pub system_program: Program<'info, System>,
    /// CHECK: this is the sysvar instructions for checking that the transaction has priority fees.
    #[account(address = instructions::ID)]
    pub sysvar_instructions: UncheckedAccount<'info>,
}
