use alloy::sol;

pub const MIN_TICK: i32 = -887_272;
pub const MAX_TICK: i32 = 887_272;

sol! {
    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }

    #[sol(rpc)]
    contract ChaosHook {
        function getLatestTick() external view returns (int24);
        function pyth() external view returns (address);
        function entropy() external view returns (address);
    }
}

// Re-export the types so main.rs can do `use crate::chaos::ChaosHook;`
// pub use self::{ChaosHook, PoolKey};

/// Map 32 random bytes to an integer in [min_range, max_range).
pub fn map_random_number(random: [u8; 32], min_range: i32, max_range: i32) -> i32 {
    assert!(max_range > min_range);
    let span = (max_range - min_range) as i64;

    // Take the low 8 bytes as u64
    let mut buf = [0u8; 8];
    buf.copy_from_slice(&random[24..32]);
    let r_u64 = u64::from_be_bytes(buf);

    // scale to [0, span)
    let r_mod = (r_u64 % (span as u64)) as i64;
    (min_range as i64 + r_mod) as i32
}

/// Snap a tick to the nearest multiple of spacing (rounding down).
pub fn snap_to_spacing(tick: i32, spacing: i32) -> i32 {
    if spacing == 0 {
        return tick;
    }
    let m = tick / spacing;
    m * spacing
}

/// Clamp a tick to v4’s global min/max.
pub fn clamp_tick(tick: i32) -> i32 {
    if tick < MIN_TICK {
        MIN_TICK
    } else if tick > MAX_TICK {
        MAX_TICK
    } else {
        tick
    }
}

/// Deterministic “normal LP” band centered on oracle tick.
pub fn compute_normal_band(oracle_tick: i32, spacing: i32, half_width_ticks: i32) -> (i32, i32) {
    let lower = oracle_tick - half_width_ticks;
    let upper = oracle_tick + half_width_ticks;
    let lower = snap_to_spacing(clamp_tick(lower), spacing);
    let upper = snap_to_spacing(clamp_tick(upper), spacing);
    (lower, upper)
}

/// Chaos LP band: random offset around oracle tick, snapped/clamped.
pub fn compute_chaos_band(
    oracle_tick: i32,
    spacing: i32,
    rand_bytes: [u8; 32],
    min_offset: i32,
    max_offset: i32,
    band_half_width: i32,
) -> (i32, i32, i32) {
    // 1. map random → offset
    let offset = map_random_number(rand_bytes, min_offset, max_offset);

    // 2. center tick = oracle + offset, then snapped/clamped
    let mut center = oracle_tick + offset;
    center = snap_to_spacing(clamp_tick(center), spacing);

    // 3. build band around center
    let mut lower = center - band_half_width;
    let mut upper = center + band_half_width;

    lower = snap_to_spacing(clamp_tick(lower), spacing);
    upper = snap_to_spacing(clamp_tick(upper), spacing);

    (center, lower, upper)
}

/// Distance (in ticks) between oracle and LP band center.
pub fn attacker_edge_ticks(oracle_tick: i32, lower: i32, upper: i32) -> i32 {
    let center = (lower + upper) / 2;
    (center - oracle_tick).abs()
}

/// Length of intersection between [a1,a2] and [b1,b2] in ticks.
pub fn intersection_length(a1: i32, a2: i32, b1: i32, b2: i32) -> i32 {
    let left = a1.max(b1);
    let right = a2.min(b2);
    if right <= left { 0 } else { right - left }
}
