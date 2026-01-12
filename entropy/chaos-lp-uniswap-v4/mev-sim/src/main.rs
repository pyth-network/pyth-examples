mod chaos;
mod plotting;

use anyhow::Result;
use dotenvy::dotenv;
use rand::{RngCore, SeedableRng, rngs::StdRng};
use std::{env, fs::File, io::Write, str::FromStr};

use alloy::{primitives::Address, providers::ProviderBuilder, signers::local::PrivateKeySigner};

use crate::chaos::{
    ChaosHook, attacker_edge_ticks, compute_chaos_band, compute_normal_band, intersection_length,
};
use crate::plotting::{plot_expected_mev_bar, plot_summary_dashboard};

#[tokio::main]
async fn main() -> Result<()> {
    env_logger::init();
    dotenv().ok();

    // 1. Read env
    let rpc_url = env::var("RPC_URL").expect("RPC_URL env var missing");
    let pk_str = env::var("DEPLOYER_PK").expect("PRIVATE_KEY env var missing");
    let chaos_hook_addr_str =
        env::var("CHAOS_HOOK_ADDRESS").expect("CHAOS_HOOK_ADDRESS env var missing");
    let currency0_str = env::var("CURRENCY0_ADDRESS").expect("CURRENCY0_ADDRESS env var missing");
    let currency1_str = env::var("CURRENCY1_ADDRESS").expect("CURRENCY1_ADDRESS env var missing");

    let signer: PrivateKeySigner = pk_str.parse()?;
    let provider = ProviderBuilder::new()
        .wallet(signer)
        .connect(&rpc_url)
        .await?;

    let chaos_addr = Address::from_str(&chaos_hook_addr_str)?;
    let _currency0 = Address::from_str(&currency0_str)?;
    let _currency1 = Address::from_str(&currency1_str)?;

    let chaos = ChaosHook::new(chaos_addr, provider.clone());

    // ---- 2. Read-only sanity: tick, pyth, entropy ----
    let latest_tick = chaos.getLatestTick().call().await?;
    let pyth_addr = chaos.pyth().call().await?;
    let entropy_addr = chaos.entropy().call().await?;

    println!("ChaosHook.getLatestTick() = {}", latest_tick);
    println!("ChaosHook.pyth()          = {:?}", pyth_addr);
    println!("ChaosHook.entropy()       = {:?}", entropy_addr);

    // 3. Model parameters (same as before)
    let oracle_tick: i32 = latest_tick.as_i32();
    let tick_spacing: i32 = 10;
    let band_half_width: i32 = 200;
    let min_offset: i32 = -5000;
    let max_offset: i32 = 5000;

    let (norm_lower, norm_upper) = compute_normal_band(oracle_tick, tick_spacing, band_half_width);
    let norm_edge = attacker_edge_ticks(oracle_tick, norm_lower, norm_upper);

    println!("\n--- Normal LP band ---");
    println!("oracle_tick   = {}", oracle_tick);
    println!("normal_lower  = {}", norm_lower);
    println!("normal_upper  = {}", norm_upper);
    println!("attacker_edge = {} ticks", norm_edge);

    // 4. A few chaos samples for debug
    let mut rng_preview = StdRng::seed_from_u64(42);
    println!("\n--- Chaos LP bands (few samples) ---");
    for i in 0..5 {
        let mut rand_bytes = [0u8; 32];
        rng_preview.fill_bytes(&mut rand_bytes);
        let (center, lower, upper) = compute_chaos_band(
            oracle_tick,
            tick_spacing,
            rand_bytes,
            min_offset,
            max_offset,
            band_half_width,
        );
        let edge = attacker_edge_ticks(oracle_tick, lower, upper);
        println!(
            "sample #{i}: center={}, lower={}, upper={}, attacker_edge={}",
            center, lower, upper, edge
        );
    }

    // 5. CSV distribution + Monte Carlo stats
    let mut file = File::create("chaos_vs_normal.csv")?;
    writeln!(
        file,
        "id,mode,oracle_tick,center,lower,upper,attacker_edge,offset,overlap_factor"
    )?;

    let attacker_lower = norm_lower;
    let attacker_upper = norm_upper;
    let attacker_band_len = (attacker_upper - attacker_lower) as f64;

    // normal LP (just 1 row, full overlap_factor=1.0)
    writeln!(
        file,
        "{},{},{},{},{},{},{},{},{}",
        0,
        "normal",
        oracle_tick,
        (norm_lower + norm_upper) / 2,
        norm_lower,
        norm_upper,
        norm_edge,
        0,
        1.0_f64
    )?;

    let n_samples = 10_000;
    let mut rng = StdRng::seed_from_u64(1337);

    let mut chaos_edges: Vec<i32> = Vec::with_capacity(n_samples);
    let mut chaos_overlap_factors: Vec<f64> = Vec::with_capacity(n_samples);

    for i in 0..n_samples {
        let mut rand_bytes = [0u8; 32];
        rng.fill_bytes(&mut rand_bytes);

        let (center, lower, upper) = compute_chaos_band(
            oracle_tick,
            tick_spacing,
            rand_bytes,
            min_offset,
            max_offset,
            band_half_width,
        );

        let offset = center - oracle_tick;
        let edge = attacker_edge_ticks(oracle_tick, lower, upper);

        let overlap_ticks =
            intersection_length(attacker_lower, attacker_upper, lower, upper) as f64;
        let overlap_factor = if attacker_band_len > 0.0 {
            overlap_ticks / attacker_band_len
        } else {
            0.0
        };

        chaos_edges.push(edge);
        chaos_overlap_factors.push(overlap_factor);

        writeln!(
            file,
            "{},{},{},{},{},{},{},{},{}",
            i + 1,
            "chaos",
            oracle_tick,
            center,
            lower,
            upper,
            edge,
            offset,
            overlap_factor
        )?;
    }

    println!(
        "Saved chaos_vs_normal.csv with {} chaos samples.",
        n_samples
    );

    // 6. Monte Carlo "expected attacker fees" (relative)
    let avg_overlap: f64 =
        chaos_overlap_factors.iter().copied().sum::<f64>() / chaos_overlap_factors.len() as f64;

    let normal_expected_fee = 1.0_f64;
    let chaos_expected_fee = avg_overlap;

    let success_count = chaos_overlap_factors.iter().filter(|&&x| x > 0.0).count();
    let success_rate = success_count as f64 / chaos_overlap_factors.len() as f64;

    let max_overlap = chaos_overlap_factors
        .iter()
        .copied()
        .fold(0.0_f64, f64::max);

    let min_edge = chaos_edges.iter().copied().min().unwrap_or(0);
    let max_edge = chaos_edges.iter().copied().max().unwrap_or(0);
    let avg_edge = chaos_edges.iter().map(|&e| e as f64).sum::<f64>() / chaos_edges.len() as f64;

    println!("\n--- Monte Carlo attacker model (relative units) ---");
    println!(
        "Normal LP expected attacker factor: {:.4}",
        normal_expected_fee
    );
    println!(
        "Chaos  LP expected attacker factor: {:.4}",
        chaos_expected_fee
    );
    println!(
        "Relative reduction in expected attacker payoff: {:.2}%",
        (1.0 - chaos_expected_fee) * 100.0
    );
    println!(
        "Chaos attacker_edge stats: min={} max={} avg≈{:.1} ticks",
        min_edge, max_edge, avg_edge
    );
    println!(
        "Chaos MEV success rate (any overlap): {:.2}%",
        success_rate * 100.0
    );
    println!("Chaos max single-trade overlap factor: {:.4}", max_overlap);

    println!(
        "\nChaos LP vs Normal LP — MEV Resistance Test ({} simulations)",
        n_samples
    );
    println!("┌───────────────────────┬──────────────┬──────────────┬──────────────┐");
    println!("│ Metric                │ Normal LP    │ Chaos LP     │ Change       │");
    println!("├───────────────────────┼──────────────┼──────────────┼──────────────┤");
    println!(
        "│ Avg MEV payoff        │  {:>10.4}x │ {:>10.4}x  │ {:>9.1}%   │",
        normal_expected_fee,
        chaos_expected_fee,
        (chaos_expected_fee / normal_expected_fee - 1.0) * 100.0
    );
    println!(
        "│ MEV success rate      │  {:>9.1}%  │ {:>9.1}%   │ {:>9.1}%   │",
        100.0,
        success_rate * 100.0,
        (success_rate - 1.0) * 100.0
    );
    println!(
        "│ Predictability        │  {:>10}  │ {:>10}   │              │",
        "High", "Chaotic"
    );
    println!("└───────────────────────┴──────────────┴──────────────┴──────────────┘");
    println!("(MEV payoffs are normalized; 1.0 = baseline Normal LP.)");

    // PNGs for the judges
    plot_expected_mev_bar(normal_expected_fee, chaos_expected_fee)?;
    println!("Saved expected_mev_bar.png");

    plot_summary_dashboard(normal_expected_fee, chaos_expected_fee, success_rate)?;
    println!("Saved chaos_mev_dashboard.png");

    Ok(())
}
