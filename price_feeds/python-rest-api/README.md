# Python REST API for Pyth Price Feeds

A Flask-based REST API for monitoring cryptocurrency prices using Pyth Network's decentralized oracle. This example demonstrates how to build a production-ready API with Pyth price feeds, supporting 20+ tokens including BTC, ETH, SOL, and more.

## Features

- ✅ **20+ Cryptocurrencies** - Monitor BTC, ETH, SOL, BNB, AVAX, MATIC, ARB, OP, and more
- ✅ **Threshold Monitoring** - Check if prices cross specific thresholds
- ✅ **Real-time Prices** - Powered by Pyth Network's Hermes API
- ✅ **Session Management** - Monitor multiple tokens simultaneously
- ✅ **RESTful API** - Clean, well-documented endpoints
- ✅ **CORS Enabled** - Ready for web applications

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Start the Server

```bash
python app.py
```

Server will start on `http://localhost:8080`

### 3. Test the API

```bash
# In another terminal
python test_endpoints.py
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/tokens` | GET | List all supported tokens |
| `/api/price/<symbol>` | GET | Get current price for any token |
| `/api/check` | POST | Check price vs threshold (single) |
| `/api/monitor/start` | POST | Start monitoring session |
| `/api/monitor/<session_id>` | GET | Get session status |
| `/api/monitor/<session_id>/stop` | POST | Stop monitoring session |
| `/api/monitor/sessions` | GET | List all sessions |

## Usage Examples

### Get Bitcoin Price

```bash
curl http://localhost:8080/api/price/BTC/USD
```

**Response:**
```json
{
  "success": true,
  "symbol": "BTC/USD",
  "price": 67234.56,
  "timestamp": "2024-01-23T10:15:23.123456"
}
```

### Check if ETH is Below $3000

```bash
curl -X POST http://localhost:8080/api/check \
  -H "Content-Type: application/json" \
  -d '{"symbol": "ETH/USD", "threshold": 3000}'
```

**Response:**
```json
{
  "success": true,
  "symbol": "ETH/USD",
  "price": 2845.67,
  "threshold": 3000,
  "is_below_threshold": true,
  "result": true,
  "timestamp": "2024-01-23T10:15:23.123456"
}
```

### Start Continuous Monitoring

```bash
curl -X POST http://localhost:8080/api/monitor/start \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTC/USD",
    "threshold": 50000,
    "update_interval": 10
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Started monitoring BTC/USD with threshold $50000.00",
  "session_id": "session_1",
  "symbol": "BTC/USD",
  "threshold": 50000,
  "update_interval": 10
}
```

## Supported Tokens

BTC/USD, ETH/USD, SOL/USD, BNB/USD, AVAX/USD, MATIC/USD, ARB/USD, OP/USD, DOGE/USD, ADA/USD, DOT/USD, LINK/USD, UNI/USD, ATOM/USD, XRP/USD, LTC/USD, APT/USD, SUI/USD, TRX/USD, NEAR/USD

Get the complete list:
```bash
curl http://localhost:8080/api/tokens
```

## Project Structure

```
python-rest-api/
├── app.py                # Flask REST API server
├── price_monitor.py      # Core price monitoring logic
├── requirements.txt      # Python dependencies
├── test_endpoints.py     # API test suite
└── README.md            # This file
```

## Key Components

### price_monitor.py

Core module that handles Pyth Network integration:
- Fetches prices from Pyth's Hermes API
- Supports 20+ cryptocurrency pairs
- Provides both single-check and continuous monitoring
- Handles price threshold comparisons

### app.py

Flask REST API server that provides:
- RESTful endpoints for price queries
- Session-based continuous monitoring
- Background threading for real-time updates
- CORS support for web applications

## Python Client Example

```python
import requests
import time

BASE_URL = "http://localhost:8080"

# Get current price
response = requests.get(f"{BASE_URL}/api/price/BTC/USD")
price_data = response.json()
print(f"BTC Price: ${price_data['price']:,.2f}")

# Quick threshold check
response = requests.post(f"{BASE_URL}/api/check", json={
    "symbol": "ETH/USD",
    "threshold": 3000
})
result = response.json()
print(f"ETH below $3000: {result['is_below_threshold']}")

# Start monitoring
response = requests.post(f"{BASE_URL}/api/monitor/start", json={
    "symbol": "BTC/USD",
    "threshold": 50000,
    "update_interval": 10
})
session_id = response.json()['session_id']
print(f"Started monitoring, session: {session_id}")

# Poll for updates
try:
    while True:
        response = requests.get(f"{BASE_URL}/api/monitor/{session_id}")
        data = response.json()['data']
        
        if data['price']:
            print(f"[{data['timestamp']}] {data['symbol']}: "
                  f"${data['price']:,.2f} | Below threshold: {data['is_below_threshold']}")
        
        time.sleep(10)
except KeyboardInterrupt:
    # Stop monitoring
    requests.post(f"{BASE_URL}/api/monitor/{session_id}/stop")
    print("\nMonitoring stopped")
```

## Use Cases

- **Price Alerts** - Build notification systems for price thresholds
- **Trading Bots** - Integrate real-time price data for automated trading
- **Portfolio Tracking** - Monitor multiple assets simultaneously
- **Market Analysis** - Collect and analyze price trends
- **DeFi Integrations** - Use as a data feed for decentralized applications

## Technologies

- **Flask** - Lightweight web framework
- **Pyth Network** - Decentralized oracle for real-time price data
- **Python 3.7+** - Programming language
- **Threading** - For concurrent monitoring sessions

## Deployment

This API can be easily deployed using:
- **ngrok** - For quick public exposure (see deployment guide)
- **Docker** - Containerized deployment
- **Cloud Services** - AWS, GCP, Azure, Heroku, etc.

## About Pyth Network

This example uses [Pyth Network](https://pyth.network)'s Hermes API to fetch real-time cryptocurrency prices. Pyth Network is a decentralized oracle that provides high-fidelity, high-frequency market data from over 90+ first-party publishers.

## License

Apache 2.0

---

**Built with [Pyth Network](https://pyth.network) 🔮**

