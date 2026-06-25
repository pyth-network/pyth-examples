use soroban_sdk::{contracttype, Address, Env};

/// TTL threshold: extend when TTL drops below this (approx 6 days at 5s/ledger).
pub const TTL_THRESHOLD: u32 = 100_000;
/// TTL extension target (approx 29 days at 5s/ledger).
pub const TTL_EXTEND_TO: u32 = 500_000;

/// Latest verified price for the configured feed.
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct StoredPrice {
    pub price: i64,
    // Widened from the feed's `i16` exponent: Soroban `#[contracttype]` fields
    // don't support `i16`.
    pub exponent: i32,
    pub timestamp_us: u64,
}

#[contracttype]
pub enum StorageKey {
    /// The deployed `pyth-lazer-stellar` verifier contract address.
    Lazer,
    /// Pyth Lazer price feed id this contract tracks.
    FeedId,
    /// Max age (microseconds) an update may have before it is rejected.
    FreshnessThresholdUs,
    /// Latest stored `StoredPrice`.
    LatestPrice,
}

/// Store the deployment-time configuration (one-time, in the constructor).
pub fn set_config(env: &Env, lazer: &Address, feed_id: u32, freshness_threshold_us: u64) {
    let storage = env.storage().instance();
    storage.set(&StorageKey::Lazer, lazer);
    storage.set(&StorageKey::FeedId, &feed_id);
    storage.set(&StorageKey::FreshnessThresholdUs, &freshness_threshold_us);
}

pub fn get_lazer(env: &Env) -> Address {
    env.storage().instance().get(&StorageKey::Lazer).unwrap()
}

pub fn get_feed_id(env: &Env) -> u32 {
    env.storage().instance().get(&StorageKey::FeedId).unwrap()
}

pub fn get_freshness_threshold_us(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&StorageKey::FreshnessThresholdUs)
        .unwrap()
}

pub fn set_latest_price(env: &Env, price: &StoredPrice) {
    env.storage()
        .instance()
        .set(&StorageKey::LatestPrice, price);
}

pub fn get_latest_price(env: &Env) -> Option<StoredPrice> {
    env.storage().instance().get(&StorageKey::LatestPrice)
}

/// Extend TTL on instance storage (call on every user-facing invocation).
pub fn extend_instance_ttl(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
}
