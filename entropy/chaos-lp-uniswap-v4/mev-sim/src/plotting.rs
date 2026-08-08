use anyhow::Result;
use plotters::prelude::*;

/// Summary dashboard: top = expected payoff, bottom = success rate.
pub fn plot_summary_dashboard(
    normal_payoff: f64,
    chaos_payoff: f64,
    chaos_success_rate: f64,
) -> Result<()> {
    let root = BitMapBackend::new("chaos_mev_dashboard.png", (1000, 800)).into_drawing_area();
    root.fill(&WHITE)?;

    // Split vertically: top for payoff, bottom for success rate
    let (upper, lower) = root.split_vertically(400);

    // -------------------------
    // Top: expected payoff bars
    // -------------------------
    let mut chart1 = ChartBuilder::on(&upper)
        .caption("Expected attacker payoff (normalized)", ("sans-serif", 28))
        .margin(30)
        .x_label_area_size(40)
        .y_label_area_size(60)
        .build_cartesian_2d(0..3, 0f64..1.1)?;

    chart1
        .configure_mesh()
        .x_labels(2)
        .x_label_formatter(&|x| match *x {
            0 => "Normal".to_string(),
            2 => "Chaos".to_string(),
            _ => "".to_string(),
        })
        .y_desc("relative MEV payoff (1.0 = Normal)")
        .draw()?;

    // Normal bar at [0,1]
    chart1.draw_series(std::iter::once(Rectangle::new(
        [(0, 0.0), (1, normal_payoff)],
        BLUE.mix(0.7).filled(),
    )))?;

    // Chaos bar at [2,3]
    chart1.draw_series(std::iter::once(Rectangle::new(
        [(2, 0.0), (3, chaos_payoff)],
        RED.mix(0.7).filled(),
    )))?;

    // Labels on top of bars
    chart1.draw_series(std::iter::once(Text::new(
        format!("{:.2}x", normal_payoff),
        (0, normal_payoff + 0.05),
        ("sans-serif", 18),
    )))?;
    chart1.draw_series(std::iter::once(Text::new(
        format!("{:.3}x", chaos_payoff),
        (2, chaos_payoff + 0.05),
        ("sans-serif", 18),
    )))?;

    // Reduction annotation
    let reduction_pct = (1.0 - chaos_payoff) * 100.0;
    chart1.draw_series(std::iter::once(Text::new(
        format!("≈{:.1}% lower expected MEV payoff", reduction_pct),
        (1, 1.02),
        ("sans-serif", 18),
    )))?;

    // --------------------------------
    // Bottom: success rate comparison
    // --------------------------------
    let normal_success = 1.0_f64;
    let chaos_success = chaos_success_rate; // already 0..1

    let mut chart2 = ChartBuilder::on(&lower)
        .caption(
            "Attacker success rate (any profitable overlap)",
            ("sans-serif", 28),
        )
        .margin(30)
        .x_label_area_size(40)
        .y_label_area_size(60)
        .build_cartesian_2d(0..3, 0f64..1.05)?;

    chart2
        .configure_mesh()
        .x_labels(2)
        .x_label_formatter(&|x| match *x {
            0 => "Normal".to_string(),
            2 => "Chaos".to_string(),
            _ => "".to_string(),
        })
        .y_desc("success probability")
        .y_label_formatter(&|y| format!("{:.0}%", y * 100.0))
        .draw()?;

    chart2.draw_series(std::iter::once(Rectangle::new(
        [(0, 0.0), (1, normal_success)],
        BLUE.mix(0.7).filled(),
    )))?;

    chart2.draw_series(std::iter::once(Rectangle::new(
        [(2, 0.0), (3, chaos_success)],
        RED.mix(0.7).filled(),
    )))?;

    chart2.draw_series(std::iter::once(Text::new(
        "100%",
        (0, normal_success + 0.03),
        ("sans-serif", 18),
    )))?;
    chart2.draw_series(std::iter::once(Text::new(
        format!("{:.1}%", chaos_success * 100.0),
        (2, chaos_success + 0.03),
        ("sans-serif", 18),
    )))?;

    let success_reduction_pct = (1.0 - chaos_success) * 100.0;
    chart2.draw_series(std::iter::once(Text::new(
        format!(
            "≈{:.1}% fewer successful MEV attempts",
            success_reduction_pct
        ),
        (1, 1.0),
        ("sans-serif", 18),
    )))?;

    Ok(())
}

/// Simple 2-bar chart (kept if you still want the extra PNG).
pub fn plot_expected_mev_bar(normal_factor: f64, chaos_factor: f64) -> Result<()> {
    let root_area = BitMapBackend::new("expected_mev_bar.png", (800, 600)).into_drawing_area();
    root_area.fill(&WHITE)?;

    let ymax = normal_factor.max(chaos_factor) * 1.05;
    let mut chart = ChartBuilder::on(&root_area)
        .caption("Expected attacker payoff (relative)", ("sans-serif", 32))
        .margin(20)
        .x_label_area_size(40)
        .y_label_area_size(60)
        .build_cartesian_2d(0..2, 0f64..ymax)?;

    chart
        .configure_mesh()
        .x_labels(2)
        .x_label_formatter(&|v| match v {
            0 => "Normal".to_string(),
            1 => "Chaos".to_string(),
            _ => "".to_string(),
        })
        .y_desc("relative MEV payoff (1.0 = Normal)")
        .draw()?;

    let data = vec![(0, normal_factor, BLUE), (1, chaos_factor, RED)];

    chart.draw_series(data.into_iter().map(|(x, val, color)| {
        Rectangle::new([(x, 0.0f64), (x + 1, val)], color.mix(0.6).filled())
    }))?;

    Ok(())
}
