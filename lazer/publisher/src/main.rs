use {
    futures::{SinkExt, StreamExt},
    pyth_lazer_protocol::{
        publisher::PriceFeedData,
        router::{Price, PriceFeedId, TimestampUs},
    },
    std::time::Duration,
    tokio::time::sleep,
    tokio_tungstenite::{
        connect_async_with_config,
        tungstenite::{client::IntoClientRequest, http::HeaderValue, Message},
    },
    tracing::{info, level_filters::LevelFilter, warn},
    tracing_subscriber::EnvFilter,
};

const RETRY_DELAY: Duration = Duration::from_millis(300);
const URL: &str = "ws://127.0.0.1:1234/v1/publisher";
const TOKEN: &str = "token1";

async fn run() -> anyhow::Result<()> {
    let url = url::Url::parse(URL)?;
    let mut req = url.into_client_request()?;

    let headers = req.headers_mut();
    headers.insert(
        "Authorization",
        HeaderValue::from_str(&format!("Bearer {}", TOKEN))?,
    );

    let (ws_stream, _) = connect_async_with_config(req, None, true).await?;
    info!("connected to {}", URL);
    let (mut ws_sender, _) = ws_stream.split();

    let mut i = 0;
    loop {
        i += 1;
        sleep(Duration::from_secs(1)).await;
        for feed_id in 1u32..=5 {
            let data = PriceFeedData {
                price_feed_id: PriceFeedId(feed_id),
                source_timestamp_us: TimestampUs::now(),
                publisher_timestamp_us: TimestampUs::now(),
                price: Some(Price::from_integer(
                    (feed_id * 10000 + i) as i64,
                    Price::TMP_EXPONENT,
                )?),
                best_bid_price: Some(Price::from_integer(
                    (feed_id * 10000 + i - 1) as i64,
                    Price::TMP_EXPONENT,
                )?),
                best_ask_price: Some(Price::from_integer(
                    (feed_id * 10000 + i + 1) as i64,
                    Price::TMP_EXPONENT,
                )?),
            };
            let mut buf = Vec::new();
            bincode::serialize_into(&mut buf, &data)?;
            ws_sender.send(Message::Binary(buf)).await?;
        }
        ws_sender.flush().await?;
        info!("sent data {i}");
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::builder()
                .with_default_directive(LevelFilter::INFO.into())
                .from_env()
                .expect("invalid RUST_LOG env var"),
        )
        .json()
        .init();
    loop {
        if let Err(err) = run().await {
            warn!("error: {err:?}");
            sleep(RETRY_DELAY).await;
        }
    }
}
