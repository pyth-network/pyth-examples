#!/usr/bin/env python3
"""
Multi-Token Price Monitor using Pyth Network
Monitors any token price and checks if it's below a given threshold
"""

import requests
import time
from datetime import datetime
from typing import Optional, Dict

class PriceMonitor:
    """
    Monitor cryptocurrency prices using Pyth Network's price feeds
    """
    
    # Pyth Network Hermes API endpoint
    BASE_URL = "https://hermes.pyth.network"
    
    # Common token price feed IDs from Pyth Network
    FEED_IDS = {
        # Crypto/USD pairs
        "BTC/USD": "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
        "ETH/USD": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
        "SOL/USD": "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
        "BNB/USD": "0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f",
        "AVAX/USD": "0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7",
        "MATIC/USD": "0x5de33a9112c2b700b8d30b8a3402c103578ccfa2765696471cc672bd5cf6ac52",
        "ARB/USD": "0x3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5",
        "OP/USD": "0x385f64d993f7b77d8182ed5003d97c60aa3361f3cecfe711544d2d59165e9bdf",
        "DOGE/USD": "0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c",
        "ADA/USD": "0x2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d",
        "DOT/USD": "0xca3eed9b267293f6595901c734c7525ce8ef49adafe8284606ceb307afa2ca5b",
        "LINK/USD": "0x8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221",
        "UNI/USD": "0x78d185a741d07edb3412b09008b7c5cfb9bbbd7d568bf00ba737b456ba171501",
        "ATOM/USD": "0xb00b60f88b03a6a625a8d1c048c3f66653edf217439983d037e7222c4e612819",
        "XRP/USD": "0xec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8",
        "LTC/USD": "0x6e3f3fa8253588df9326580180233eb791e03b443a3ba7a1d892e73874e19a54",
        "APT/USD": "0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5",
        "SUI/USD": "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744",
        "TRX/USD": "0x67aed5a24fdad045475e7195c98a98aea119c763f272d4523f5bac93a4f33c2b",
        "NEAR/USD": "0xc415de8d2eba7db216527dff4b60e8f3a5311c740dadb233e13e12547e226750",
    }
    
    def __init__(self, symbol: str, threshold: float, update_interval: float = 10.0):
        """
        Initialize the price monitor
        
        Args:
            symbol: Token symbol (e.g., "BTC/USD", "ETH/USD")
            threshold: Price threshold in USD
            update_interval: Time in seconds between price checks (default 10 seconds)
        """
        self.symbol = symbol.upper()
        self.threshold = threshold
        self.update_interval = update_interval
        self.is_running = False
        
        # Get feed ID for the symbol
        self.feed_id = self.FEED_IDS.get(self.symbol)
        if not self.feed_id:
            raise ValueError(f"Unsupported token symbol: {symbol}. Available: {', '.join(self.FEED_IDS.keys())}")
    
    @classmethod
    def get_available_tokens(cls) -> list:
        """Get list of available token symbols"""
        return list(cls.FEED_IDS.keys())
    
    @classmethod
    def get_feed_id_for_symbol(cls, symbol: str) -> Optional[str]:
        """Get Pyth feed ID for a given symbol"""
        return cls.FEED_IDS.get(symbol.upper())
    
    def get_price(self, feed_id: Optional[str] = None) -> Optional[float]:
        """
        Fetch the current price from Pyth Network
        
        Args:
            feed_id: Optional feed ID to fetch. If None, uses self.feed_id
            
        Returns:
            Current price in USD, or None if request fails
        """
        target_feed_id = feed_id or self.feed_id
        
        try:
            # Use Pyth's latest price feeds endpoint
            url = f"{self.BASE_URL}/v2/updates/price/latest"
            params = {
                "ids[]": target_feed_id
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Parse the price data
            if "parsed" in data and len(data["parsed"]) > 0:
                price_data = data["parsed"][0]["price"]
                price = float(price_data["price"])
                expo = int(price_data["expo"])
                
                # Calculate actual price (price * 10^expo)
                actual_price = price * (10 ** expo)
                return actual_price
            
            return None
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching price: {e}")
            return None
        except (KeyError, ValueError, IndexError) as e:
            print(f"Error parsing price data: {e}")
            return None
    
    @classmethod
    def get_price_for_symbol(cls, symbol: str) -> Optional[float]:
        """
        Get current price for any supported symbol without creating a monitor
        
        Args:
            symbol: Token symbol (e.g., "BTC/USD")
            
        Returns:
            Current price in USD, or None if request fails
        """
        feed_id = cls.get_feed_id_for_symbol(symbol)
        if not feed_id:
            return None
        
        try:
            url = f"{cls.BASE_URL}/v2/updates/price/latest"
            params = {"ids[]": feed_id}
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if "parsed" in data and len(data["parsed"]) > 0:
                price_data = data["parsed"][0]["price"]
                price = float(price_data["price"])
                expo = int(price_data["expo"])
                return price * (10 ** expo)
            
            return None
        except Exception as e:
            print(f"Error fetching price for {symbol}: {e}")
            return None
    
    def check_threshold(self, current_price: float) -> bool:
        """
        Check if current price is below threshold
        
        Args:
            current_price: Current price in USD
            
        Returns:
            True if price is below threshold, False otherwise
        """
        return current_price < self.threshold
    
    def get_single_check(self) -> tuple[Optional[float], Optional[bool]]:
        """
        Perform a single price check
        
        Returns:
            Tuple of (current_price, is_below_threshold)
        """
        current_price = self.get_price()
        if current_price is not None:
            is_below = self.check_threshold(current_price)
            return current_price, is_below
        return None, None


def main():
    """
    Main function to run the price monitor
    """
    print("=" * 60)
    print("Crypto Price Monitor - Powered by Pyth Network")
    print("=" * 60)
    print()
    print("Available tokens:")
    for i, symbol in enumerate(PriceMonitor.get_available_tokens(), 1):
        print(f"  {i}. {symbol}")
    print()
    
    try:
        # Get symbol from user
        symbol_input = input("Enter token symbol (e.g., BTC/USD, ETH/USD): ").strip()
        
        # Get threshold from user
        threshold_input = input("Enter price threshold in USD (e.g., 3000): ")
        threshold = float(threshold_input)
        
        if threshold <= 0:
            print("Error: Threshold must be a positive number")
            return
        
        # Get update interval from user (optional)
        interval_input = input("Enter update interval in seconds (default 10): ").strip()
        update_interval = float(interval_input) if interval_input else 10.0
        
        if update_interval < 0.5:
            print("Warning: Setting interval to minimum of 0.5 seconds to avoid rate limiting")
            update_interval = 0.5
        
        print()
        
        # Create monitor
        monitor = PriceMonitor(symbol_input, threshold, update_interval)
        
        print(f"Starting {monitor.symbol} price monitor...")
        print(f"Threshold: ${threshold:.2f}")
        print(f"Update interval: {update_interval} seconds")
        print("-" * 60)
        
        # Continuous monitoring
        monitor.is_running = True
        try:
            while monitor.is_running:
                current_price = monitor.get_price()
                
                if current_price is not None:
                    is_below = monitor.check_threshold(current_price)
                    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    
                    status = "BELOW" if is_below else "ABOVE"
                    color = "\033[91m" if is_below else "\033[92m"  # Red if below, Green if above
                    reset = "\033[0m"
                    
                    print(f"[{timestamp}] {monitor.symbol}: ${current_price:,.2f} | "
                          f"Status: {color}{status}{reset} threshold (${threshold:.2f}) | "
                          f"Result: {is_below}")
                
                time.sleep(update_interval)
                
        except KeyboardInterrupt:
            print("\n\nMonitoring stopped by user")
            monitor.is_running = False
        
    except ValueError as e:
        print(f"Error: {e}")
    except KeyboardInterrupt:
        print("\n\nExiting...")


if __name__ == "__main__":
    main()

