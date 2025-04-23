use anchor_lang::prelude::*;
use pyth_lazer_solana_contract::protocol::{
    message::LeEcdsaMessage,
    payload::{PayloadData, PayloadPropertyValue},
    router::channel_ids::FIXED_RATE_200,
};

declare_id!("FpmpVrP57C6ADT8d4dQp9TkM1vmxohZJ5WEQQc9RGLPY");

#[program]
pub mod solana_anchor {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, price_feed_id: u32) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.price_feed_id = price_feed_id;
        state.latest_timestamp = 0;
        state.latest_price = 0;
        Ok(())
    }

    pub fn update_ecdsa(ctx: Context<UpdateEcdsa>, pyth_message: Vec<u8>) -> Result<()> {
        // Verify ECDSA signature
        let cpi_accounts = pyth_lazer_solana_contract::cpi::accounts::VerifyEcdsaMessage {
            payer: ctx.accounts.payer.to_account_info(),
            storage: ctx.accounts.pyth_storage.to_account_info(),
            treasury: ctx.accounts.pyth_treasury.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(ctx.accounts.pyth_program.clone(), cpi_accounts);

        pyth_lazer_solana_contract::cpi::verify_ecdsa_message(cpi_ctx, pyth_message.clone())?;

        // Deserialize and process the message
        let pyth_message = LeEcdsaMessage::deserialize_slice(&pyth_message)
            .map_err(|_| ErrorCode::InvalidMessage)?;

        let data = PayloadData::deserialize_slice_le(&pyth_message.payload)
            .map_err(|_| ErrorCode::InvalidPayload)?;

        apply_update(&mut ctx.accounts.state, &data)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + std::mem::size_of::<State>(),
        seeds = [b"data"],
        bump
    )]
    pub state: Account<'info, State>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateEcdsa<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut, seeds = [b"data"], bump)]
    pub state: Account<'info, State>,

    /// CHECK: This is the Pyth program
    #[account(address = pyth_lazer_solana_contract::ID)]
    pub pyth_program: AccountInfo<'info>,

    #[account(address = pyth_lazer_solana_contract::STORAGE_ID)]
    pub pyth_storage: Account<'info, pyth_lazer_solana_contract::Storage>,

    /// CHECK: This is the Pyth treasury account
    #[account(address = pyth_storage.treasury)]
    pub pyth_treasury: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct State {
    pub price_feed_id: u32,
    pub latest_timestamp: u64,
    pub latest_price: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid message")]
    InvalidMessage,
    #[msg("Invalid channel")]
    InvalidChannel,
    #[msg("Invalid payload")]
    InvalidPayload,
    #[msg("Invalid payload feed id")]
    InvalidPayloadFeedId,
    #[msg("Invalid payload property")]
    InvalidPayloadProperty,
    #[msg("Invalid payload timestamp")]
    InvalidPayloadTimestamp,
}

fn apply_update(state: &mut Account<State>, data: &PayloadData) -> Result<()> {
    // Check the channel is what we expect
    if data.channel_id != FIXED_RATE_200 {
        return Err(ErrorCode::InvalidChannel.into());
    }

    // Check if the timestamp is greater than the current timestamp
    if data.timestamp_us.0 <= state.latest_timestamp {
        return Err(ErrorCode::InvalidPayloadTimestamp.into());
    }

    // Check the payload has a single feed
    if data.feeds.len() != 1 {
        return Err(ErrorCode::InvalidPayload.into());
    }

    // Check the feed id is what we expect
    if data.feeds[0].feed_id.0 != state.price_feed_id {
        return Err(ErrorCode::InvalidPayloadFeedId.into());
    }

    // Check the payload has a single price property
    if data.feeds[0].properties.len() != 1 {
        return Err(ErrorCode::InvalidPayloadProperty.into());
    }

    // Check the price property is a price
    let PayloadPropertyValue::Price(Some(price)) = data.feeds[0].properties[0] else {
        return Err(ErrorCode::InvalidPayloadProperty.into());
    };

    state.latest_price = price.into_inner().into();
    state.latest_timestamp = data.timestamp_us.0;

    Ok(())
}
