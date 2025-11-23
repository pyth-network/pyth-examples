#!/usr/bin/env python3
"""
Test script for Multi-Token Price Monitor API
Tests all endpoints to verify functionality
"""

import requests
import time
import sys

BASE_URL = "http://localhost:5000"


def test_health():
    """Test health check endpoint"""
    print("\n" + "="*60)
    print("Test 1: Health Check")
    print("="*60)
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ PASSED - API is healthy")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ FAILED - Status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAILED - Error: {e}")
        print("\n⚠️  Make sure the server is running: python app.py")
        return False


def test_get_tokens():
    """Test get available tokens endpoint"""
    print("\n" + "="*60)
    print("Test 2: Get Available Tokens")
    print("="*60)
    
    try:
        response = requests.get(f"{BASE_URL}/api/tokens", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ PASSED - Found {data['count']} tokens")
            print(f"   Sample tokens: {', '.join(data['tokens'][:5])}...")
            return True
        else:
            print(f"❌ FAILED - Status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAILED - Error: {e}")
        return False


def test_get_price():
    """Test get token price endpoint"""
    print("\n" + "="*60)
    print("Test 3: Get Token Price")
    print("="*60)
    
    symbols = ["BTC/USD", "ETH/USD", "SOL/USD"]
    
    for symbol in symbols:
        try:
            response = requests.get(f"{BASE_URL}/api/price/{symbol}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ {symbol}: ${data['price']:,.2f}")
            else:
                print(f"❌ FAILED for {symbol} - Status: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ FAILED for {symbol} - Error: {e}")
            return False
    
    return True


def test_check_threshold():
    """Test check price threshold endpoint"""
    print("\n" + "="*60)
    print("Test 4: Check Price vs Threshold")
    print("="*60)
    
    test_cases = [
        {"symbol": "BTC/USD", "threshold": 50000},
        {"symbol": "ETH/USD", "threshold": 3000},
        {"symbol": "SOL/USD", "threshold": 100},
    ]
    
    for test in test_cases:
        try:
            response = requests.post(
                f"{BASE_URL}/api/check",
                json=test,
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                status = "BELOW" if data['is_below_threshold'] else "ABOVE"
                print(f"✅ {test['symbol']}: ${data['price']:,.2f} is {status} ${test['threshold']:,.2f}")
            else:
                print(f"❌ FAILED for {test['symbol']} - Status: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ FAILED for {test['symbol']} - Error: {e}")
            return False
    
    return True


def test_monitoring():
    """Test monitoring session endpoints"""
    print("\n" + "="*60)
    print("Test 5: Monitoring Sessions")
    print("="*60)
    
    # Start monitoring
    print("\n📍 Starting monitoring session...")
    try:
        response = requests.post(
            f"{BASE_URL}/api/monitor/start",
            json={
                "symbol": "BTC/USD",
                "threshold": 50000,
                "update_interval": 5
            },
            timeout=5
        )
        
        if response.status_code != 200:
            print(f"❌ FAILED to start monitoring - Status: {response.status_code}")
            return False
        
        data = response.json()
        session_id = data['session_id']
        print(f"✅ Started monitoring session: {session_id}")
        print(f"   Symbol: {data['symbol']}")
        print(f"   Threshold: ${data['threshold']:,.2f}")
        
    except Exception as e:
        print(f"❌ FAILED to start monitoring - Error: {e}")
        return False
    
    # Wait for first update
    print("\n⏳ Waiting 6 seconds for first update...")
    time.sleep(6)
    
    # Check status
    print("\n📍 Checking session status...")
    try:
        response = requests.get(f"{BASE_URL}/api/monitor/{session_id}", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            session_data = data['data']
            
            if session_data['price']:
                print(f"✅ Got monitoring data:")
                print(f"   Price: ${session_data['price']:,.2f}")
                print(f"   Below threshold: {session_data['is_below_threshold']}")
                print(f"   Status: {session_data['status']}")
            else:
                print("⚠️  Monitoring started but no data yet (needs more time)")
        else:
            print(f"❌ FAILED to get status - Status: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ FAILED to get status - Error: {e}")
        return False
    
    # List sessions
    print("\n📍 Listing all sessions...")
    try:
        response = requests.get(f"{BASE_URL}/api/monitor/sessions", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {data['count']} session(s)")
        else:
            print(f"❌ FAILED to list sessions - Status: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ FAILED to list sessions - Error: {e}")
        return False
    
    # Stop monitoring
    print("\n📍 Stopping monitoring session...")
    try:
        response = requests.post(f"{BASE_URL}/api/monitor/{session_id}/stop", timeout=5)
        
        if response.status_code == 200:
            print(f"✅ Stopped monitoring session")
        else:
            print(f"❌ FAILED to stop monitoring - Status: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ FAILED to stop monitoring - Error: {e}")
        return False
    
    return True


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("Multi-Token Price Monitor API - Test Suite")
    print("="*60)
    print(f"Testing API at: {BASE_URL}")
    
    results = []
    
    # Run tests
    results.append(("Health Check", test_health()))
    if not results[-1][1]:
        print("\n⚠️  Cannot continue - API is not running")
        sys.exit(1)
    
    results.append(("Get Tokens", test_get_tokens()))
    results.append(("Get Prices", test_get_price()))
    results.append(("Check Threshold", test_check_threshold()))
    results.append(("Monitoring Sessions", test_monitoring()))
    
    # Summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status} - {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! API is working correctly.")
        print("\nNext steps:")
        print("1. Read API_DOCUMENTATION.md for complete endpoint reference")
        print("2. Deploy with ngrok: ngrok http 5000")
        print("3. Start monitoring your favorite cryptocurrencies!")
    else:
        print("\n⚠️  Some tests failed. Please check the errors above.")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        BASE_URL = sys.argv[1]
    
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nTests interrupted by user")
        sys.exit(1)

