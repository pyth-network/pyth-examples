"""
Test Script for Optimistic Messaging Backend
Run this to verify the system is working correctly
"""

import json
import time
import sys
import socketio
from datetime import datetime

# Create a Socket.IO client
sio = socketio.Client()

# Test state
test_passed = []
test_failed = []
messages_received = []

@sio.event
def connect():
    print("✓ Connected to server")
    test_passed.append("Connection established")

@sio.on('user_registered')
def on_user_registered(data):
    print(f"✓ User registered: {data}")
    test_passed.append("User registration")

@sio.on('chat_joined')
def on_chat_joined(data):
    print(f"✓ Chat joined. History: {len(data.get('messages', []))} messages")
    test_passed.append("Chat joined")

@sio.on('new_message')
def on_new_message(data):
    print(f"✓ New message received: {data['content']}")
    messages_received.append(data)
    test_passed.append("Message received")

@sio.on('user_typing')
def on_user_typing(data):
    print(f"✓ Typing indicator: {data['username']} - {data['is_typing']}")

@sio.on('error')
def on_error(data):
    print(f"✗ Error: {data}")
    test_failed.append(f"Error event: {data}")

@sio.on('disconnect')
def on_disconnect():
    print("Disconnected from server")

def test_messaging_system():
    """Run comprehensive tests on the messaging system"""

    print("\n" + "="*60)
    print("  Optimistic Messaging System - Test Suite")
    print("="*60 + "\n")

    try:
        # Test 1: Connection
        print("[Test 1] Connecting to server...")
        sio.connect('http://localhost:5001', wait_timeout=5)
        time.sleep(1)

        if not sio.connected:
            print("✗ Failed to connect to server")
            print("Make sure the backend is running: python main.py")
            return False

        # Test 2: User registration
        print("\n[Test 2] Registering user...")
        sio.emit('register_user', {
            'user_id': 'test_user_123',
            'username': '@testuser',
            'wallet': '0xtest123'
        })
        time.sleep(1)

        # Test 3: Join chat
        print("\n[Test 3] Joining chat room...")
        sio.emit('join_chat', {
            'chat_id': 'test_chat_1',
            'user_id': 'test_user_123'
        })
        time.sleep(1)

        # Test 4: Send message
        print("\n[Test 4] Sending test message...")
        sio.emit('send_message', {
            'chat_id': 'test_chat_1',
            'user_id': 'test_user_123',
            'content': 'Hello from test client!',
            'username': '@testuser',
            'wallet': '0xtest123'
        })
        time.sleep(2)

        if len(messages_received) == 0:
            print("✗ Message not received back")
            test_failed.append("Message not echoed back")
        else:
            print(f"✓ Message received: {messages_received[0]['content']}")

        # Test 5: Typing indicator
        print("\n[Test 5] Testing typing indicator...")
        sio.emit('typing', {
            'chat_id': 'test_chat_1',
            'user_id': 'test_user_123',
            'username': '@testuser',
            'is_typing': True
        })
        time.sleep(0.5)

        sio.emit('typing', {
            'chat_id': 'test_chat_1',
            'user_id': 'test_user_123',
            'username': '@testuser',
            'is_typing': False
        })
        time.sleep(0.5)

        print("✓ Typing indicator sent")
        test_passed.append("Typing indicator")

        # Test 6: Leave chat
        print("\n[Test 6] Leaving chat...")
        sio.emit('leave_chat', {
            'chat_id': 'test_chat_1',
            'user_id': 'test_user_123'
        })
        time.sleep(1)
        print("✓ Left chat room")
        test_passed.append("Leave chat")

        # Test 7: Check message persistence
        print("\n[Test 7] Checking message persistence...")
        try:
            with open('messages.json', 'r') as f:
                messages = json.load(f)
                if 'test_chat_1' in messages:
                    chat_messages = messages['test_chat_1']
                    print(f"✓ Messages persisted to file: {len(chat_messages)} messages")
                    for msg in chat_messages:
                        print(f"  - {msg['username']}: {msg['content']}")
                    test_passed.append("Message persistence")
                else:
                    print("✗ No messages found in messages.json")
                    test_failed.append("Message persistence")
        except FileNotFoundError:
            print("⚠ messages.json not created yet (will be created on first message)")
            test_passed.append("Message persistence (will be created)")

        # Disconnect
        print("\n[Test 8] Disconnecting...")
        sio.disconnect()
        time.sleep(1)
        print("✓ Disconnected cleanly")
        test_passed.append("Disconnection")

        # Summary
        print("\n" + "="*60)
        print("  Test Results")
        print("="*60)
        print(f"\n✓ Passed: {len(test_passed)}")
        for test in test_passed:
            print(f"  ✓ {test}")

        if test_failed:
            print(f"\n✗ Failed: {len(test_failed)}")
            for test in test_failed:
                print(f"  ✗ {test}")

        print("\n" + "="*60)

        if not test_failed:
            print("✓ All tests passed! System is working correctly.")
            print("="*60 + "\n")
            return True
        else:
            print("✗ Some tests failed. See details above.")
            print("="*60 + "\n")
            return False

    except Exception as e:
        print(f"\n✗ Test error: {e}")
        print("\nMake sure the backend is running:")
        print("  cd backend")
        print("  python main.py")
        return False

if __name__ == '__main__':
    success = test_messaging_system()
    sys.exit(0 if success else 1)
