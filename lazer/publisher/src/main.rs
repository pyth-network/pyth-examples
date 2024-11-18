use {
    anyhow::bail,
    pyth_lazer_protocol::{
        publisher::PriceFeedData,
        router::{Price, PriceFeedId, TimestampUs},
    },
    soketto::{
        handshake::{client::Header, Client, ServerResponse},
        Sender,
    },
    std::time::Duration,
    tokio::{net::TcpStream, time::sleep},
    tokio_util::compat::{Compat, TokioAsyncReadCompatExt},
    tracing::info,
    tracing::level_filters::LevelFilter,
    tracing_subscriber::EnvFilter,
};

async fn try_connect() -> anyhow::Result<Sender<Compat<TcpStream>>> {
    // The address is set to work in tilt. TODO: make it configurable
    let socket = tokio::net::TcpStream::connect("router:1234").await?;
    socket.set_nodelay(true)?;
    let mut client = Client::new(socket.compat(), "...", "/v1/publisher");
    client.set_headers(&[Header {
        name: "Authorization",
        value: b"Bearer token1",
    }]);
    let (sender, _receiver) = match client.handshake().await? {
        ServerResponse::Accepted { .. } => client.into_builder().finish(),
        ServerResponse::Redirect { .. } => bail!("unexpected redirect"),
        ServerResponse::Rejected { status_code } => bail!("rejected: {status_code:?}"),
    };

    Ok(sender)
}

async fn try_connect_with_retry() -> anyhow::Result<Sender<Compat<TcpStream>>> {
    let max_retries = 5;
    let retry_delay = Duration::from_secs(2);

    for attempt in 1..=max_retries {
        info!("connecting (attempt {}/{})", attempt, max_retries);

        match try_connect().await {
            Ok(sender) => return Ok(sender),
            Err(err) => {
                info!("failed to connect: {err}");
                sleep(Duration::from_secs(5)).await;
            }
        }

        info!("retrying in {} seconds...", retry_delay.as_secs());
        sleep(retry_delay).await;
    }

    bail!("failed to connect after {} attempts", max_retries);
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

    let mut sender = try_connect_with_retry().await?;

    let mut buf = Vec::new();
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
            buf.clear();
            bincode::serialize_into(&mut buf, &data)?;
            sender.send_binary(&buf).await?;
        }
        sender.flush().await?;
        info!("sent data {i}");
    }
}
