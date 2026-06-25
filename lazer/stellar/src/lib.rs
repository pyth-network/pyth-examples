#![no_std]

//! Example Soroban consumer contract for [Pyth Lazer](https://docs.pyth.network/lazer).
//!
//! Demonstrates the end-to-end integration: verify a signed update via a
//! deployed `pyth-lazer-stellar` verifier, parse it with
//! [`pyth_lazer_stellar_sdk`], check freshness against a deployment-configured
//! threshold, and store/retrieve the latest price for a single feed.

use soroban_sdk::{contract, contractimpl, Address, Bytes, Env};

use pyth_lazer_stellar_sdk::PythLazerClient;

mod error;
mod state;

pub use error::Error;
pub use state::StoredPrice;

#[contract]
pub struct PythLazerExample;

#[contractimpl]
impl PythLazerExample {
    /// Store the deployment-time configuration:
    ///
    /// - `lazer`: the deployed `pyth-lazer-stellar` verifier contract address.
    /// - `feed_id`: which Pyth Lazer price feed this contract tracks.
    /// - `freshness_threshold_us`: how far in the past a feed's update timestamp
    ///   may lag the ledger time before the update is rejected (microseconds).
    pub fn __constructor(env: Env, lazer: Address, feed_id: u32, freshness_threshold_us: u64) {
        state::set_config(&env, &lazer, feed_id, freshness_threshold_us);
        state::extend_instance_ttl(&env);
    }

    /// Verify a signed Pyth Lazer update, check it is fresh, and store the
    /// latest price for the configured feed.
    pub fn update_price(env: Env, payload: Bytes) -> Result<(), Error> {
        let lazer = state::get_lazer(&env);
        let feed_id = state::get_feed_id(&env);
        let freshness_threshold_us = state::get_freshness_threshold_us(&env);

        let update = PythLazerClient::new(&env, &lazer).verify_update(&payload)?;

        let feed = update
            .feeds
            .iter()
            .find(|f| f.feed_id == feed_id)
            .ok_or(Error::FeedMissing)?;

        let feed_ts_us = feed.feed_update_timestamp.ok_or(Error::TimestampMissing)?;
        // `env.ledger().timestamp()` is seconds since epoch; the payload uses
        // microseconds, so lift ledger time into microseconds at the boundary.
        let now_us = env
            .ledger()
            .timestamp()
            .checked_mul(1_000_000)
            .ok_or(Error::Overflow)?;
        // Saturating so a payload timestamp slightly ahead of ledger time (clock
        // skew) reads as age 0 rather than erroring.
        if now_us.saturating_sub(feed_ts_us) > freshness_threshold_us {
            return Err(Error::PriceStale);
        }

        let price = feed.price.ok_or(Error::PriceMissing)?;
        let exponent = i32::from(feed.exponent.ok_or(Error::ExponentMissing)?);

        state::set_latest_price(
            &env,
            &StoredPrice {
                price,
                exponent,
                timestamp_us: feed_ts_us,
            },
        );
        state::extend_instance_ttl(&env);
        Ok(())
    }

    /// Return the latest stored price. Errors with [`Error::PriceNotInitialized`]
    /// if [`update_price`](Self::update_price) has never run successfully.
    pub fn get_price(env: Env) -> Result<StoredPrice, Error> {
        state::extend_instance_ttl(&env);
        state::get_latest_price(&env).ok_or(Error::PriceNotInitialized)
    }
}
