#!/usr/bin/env python3
"""
Flask API for Multi-Token Price Monitor using Pyth Network
Supports monitoring any cryptocurrency available on Pyth Network
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from price_monitor import PriceMonitor
import threading
import time
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global state for monitoring sessions
monitoring_sessions = {}  # {session_id: {monitor, thread, is_running, latest_data}}
session_counter = 0


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "crypto-price-monitor",
        "timestamp": datetime.now().isoformat()
    })


@app.route('/api/tokens', methods=['GET'])
def get_available_tokens():
    """Get list of all available tokens"""
    tokens = PriceMonitor.get_available_tokens()
    print('hi')
    return jsonify({
        "success": True,
        "count": len(tokens),
        "tokens": tokens
    }) 
    


@app.route('/api/price/<path:symbol>', methods=['GET'])
def get_token_price(symbol):
    """
    Get current price for any token
    
    Path parameter:
        symbol: Token symbol (e.g., BTC/USD, ETH/USD)
    """
    symbol = symbol.upper()
    print('hi')

    
    # Check if symbol is supported
    if symbol not in PriceMonitor.get_available_tokens():
        print('hi')

        return jsonify({
            "success": False,
            "error": f"Unsupported token: {symbol}",
            "available_tokens": PriceMonitor.get_available_tokens()
        }), 400
    
    # Fetch price
    price = PriceMonitor.get_price_for_symbol(symbol)
    
    if price is not None:
        print('hi')

        return jsonify({
            "success": True,
            "symbol": symbol,
            "price": price,
            "timestamp": datetime.now().isoformat()
        })

    else:
        print('hi')

        return jsonify({
            "success": False,
            "error": f"Failed to fetch price for {symbol}"
        }), 500


@app.route('/api/check', methods=['POST'])
def check_price_threshold():
    """
    Check if a token's current price is below a threshold (single check)
    
    Request body:
        {
            "symbol": "BTC/USD",
            "threshold": 50000
        }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({
            "success": False,
            "error": "Request body is required"
        }), 400
    
    symbol = data.get('symbol', '').upper()
    threshold = data.get('threshold')
    
    if not symbol or threshold is None:
        return jsonify({
            "success": False,
            "error": "Both 'symbol' and 'threshold' are required"
        }), 400
    
    try:
        threshold = float(threshold)
    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "error": "Threshold must be a number"
        }), 400
    
    # Check if symbol is supported
    if symbol not in PriceMonitor.get_available_tokens():
        return jsonify({
            "success": False,
            "error": f"Unsupported token: {symbol}",
            "available_tokens": PriceMonitor.get_available_tokens()
        }), 400
    
    # Create temporary monitor and check
    try:
        monitor = PriceMonitor(symbol, threshold)
        price, is_below = monitor.get_single_check()
        
        if price is not None:
            return jsonify({
                "success": True,
                "symbol": symbol,
                "price": price,
                "threshold": threshold,
                "is_below_threshold": is_below,
                "result": is_below,  # Boolean result
                "timestamp": datetime.now().isoformat()
            })
        else:
            return jsonify({
                "success": False,
                "error": f"Failed to fetch price for {symbol}"
            }), 500
            
    except ValueError as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400


def background_monitor(session_id):
    """Background thread that continuously monitors token price"""
    session = monitoring_sessions[session_id]
    monitor = session['monitor']
    
    while session['is_running']:
        try:
            price = monitor.get_price()
            if price is not None:
                is_below = monitor.check_threshold(price)
                session['latest_data'] = {
                    "symbol": monitor.symbol,
                    "price": price,
                    "is_below_threshold": is_below,
                    "threshold": monitor.threshold,
                    "timestamp": datetime.now().isoformat(),
                    "status": "Monitoring"
                }
            time.sleep(monitor.update_interval)
        except Exception as e:
            print(f"Error in monitoring thread for session {session_id}: {e}")
            time.sleep(5)


@app.route('/api/monitor/start', methods=['POST'])
def start_monitoring():
    """
    Start monitoring a token's price against a threshold
    
    Request body:
        {
            "symbol": "BTC/USD",
            "threshold": 50000,
            "update_interval": 10  # optional, defaults to 10
        }
    
    Returns a session_id to track this monitoring session
    """
    global session_counter
    
    data = request.get_json()
    
    if not data:
        return jsonify({
            "success": False,
            "error": "Request body is required"
        }), 400
    
    symbol = data.get('symbol', '').upper()
    threshold = data.get('threshold')
    update_interval = data.get('update_interval', 10.0)
    
    if not symbol or threshold is None:
        return jsonify({
            "success": False,
            "error": "Both 'symbol' and 'threshold' are required"
        }), 400
    
    try:
        threshold = float(threshold)
        update_interval = float(update_interval)
    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "error": "Threshold and update_interval must be numbers"
        }), 400
    
    # Check if symbol is supported
    if symbol not in PriceMonitor.get_available_tokens():
        return jsonify({
            "success": False,
            "error": f"Unsupported token: {symbol}",
            "available_tokens": PriceMonitor.get_available_tokens()
        }), 400
    
    # Create monitor
    try:
        monitor = PriceMonitor(symbol, threshold, update_interval)
    except ValueError as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400
    
    # Create new session
    session_counter += 1
    session_id = f"session_{session_counter}"
    
    monitoring_sessions[session_id] = {
        'monitor': monitor,
        'is_running': True,
        'latest_data': {
            "symbol": symbol,
            "price": None,
            "is_below_threshold": None,
            "threshold": threshold,
            "timestamp": None,
            "status": "Starting..."
        }
    }
    
    # Start background monitoring thread
    thread = threading.Thread(target=background_monitor, args=(session_id,), daemon=True)
    monitoring_sessions[session_id]['thread'] = thread
    thread.start()
    
    return jsonify({
        "success": True,
        "message": f"Started monitoring {symbol} with threshold ${threshold:.2f}",
        "session_id": session_id,
        "symbol": symbol,
        "threshold": threshold,
        "update_interval": update_interval
    })


@app.route('/api/monitor/<session_id>', methods=['GET'])
def get_monitor_status(session_id):
    """
    Get current status of a monitoring session
    
    Path parameter:
        session_id: The session ID returned from /api/monitor/start
    """
    if session_id not in monitoring_sessions:
        return jsonify({
            "success": False,
            "error": "Session not found"
        }), 404
    
    session = monitoring_sessions[session_id]
    return jsonify({
        "success": True,
        "session_id": session_id,
        "is_running": session['is_running'],
        "data": session['latest_data']
    })


@app.route('/api/monitor/<session_id>/stop', methods=['POST'])
def stop_monitoring(session_id):
    """
    Stop a monitoring session
    
    Path parameter:
        session_id: The session ID to stop
    """
    if session_id not in monitoring_sessions:
        return jsonify({
            "success": False,
            "error": "Session not found"
        }), 404
    
    session = monitoring_sessions[session_id]
    session['is_running'] = False
    session['latest_data']['status'] = "Stopped"
    
    return jsonify({
        "success": True,
        "message": f"Stopped monitoring session {session_id}"
    })


@app.route('/api/monitor/sessions', methods=['GET'])
def list_monitoring_sessions():
    """Get list of all active monitoring sessions"""
    sessions = []
    for session_id, session in monitoring_sessions.items():
        sessions.append({
            "session_id": session_id,
            "symbol": session['monitor'].symbol,
            "threshold": session['monitor'].threshold,
            "is_running": session['is_running'],
            "status": session['latest_data']['status']
        })
    
    return jsonify({
        "success": True,
        "count": len(sessions),
        "sessions": sessions
    })


if __name__ == '__main__':
    print("=" * 70)
    print("Multi-Token Price Monitor API - Powered by Pyth Network")
    print("=" * 70)
    print("\nStarting Flask server...")
    print("Local access: http://localhost:5000")
    print("\nTo expose publicly with ngrok:")
    print("  ngrok http 5000")
    print("\nAPI Endpoints:")
    print("  GET  /health                           - Health check")
    print("  GET  /api/tokens                       - List all available tokens")
    print("  GET  /api/price/<symbol>               - Get current price for any token")
    print("  POST /api/check                        - Check price vs threshold (single)")
    print("  POST /api/monitor/start                - Start monitoring session")
    print("  GET  /api/monitor/<session_id>         - Get monitoring session status")
    print("  POST /api/monitor/<session_id>/stop    - Stop monitoring session")
    print("  GET  /api/monitor/sessions             - List all monitoring sessions")
    print("=" * 70)
    print()
    
    app.run(host='0.0.0.0', port=8080, debug=False)
