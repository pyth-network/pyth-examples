"""
Optimistic Messaging Backend
A discrete WebSocket-based messaging system that works alongside XMTP
Messages are stored in JSON format for persistence
"""

import json
import os
from datetime import datetime
from flask import Flask, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room, rooms
import uuid

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'optimistic-messaging-secret')
CORS(app)

# Initialize SocketIO - allow CORS from all origins
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='threading',
    logger=False,
    engineio_logger=False
)

# Message storage file
MESSAGES_FILE = os.path.join(os.path.dirname(__file__), 'messages.json')
CHATS_FILE = os.path.join(os.path.dirname(__file__), 'chats.json')

# Active connections tracking
active_users = {}  # {user_id: {socket_id, username, wallet}}
chat_rooms = {}    # {chat_id: [user_ids]}


def load_chats():
    """Load chats from JSON file"""
    if os.path.exists(CHATS_FILE):
        try:
            with open(CHATS_FILE, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {}
    return {}


def save_chats(chats):
    """Save chats to JSON file"""
    try:
        with open(CHATS_FILE, 'w') as f:
            json.dump(chats, f, indent=2)
    except IOError as e:
        print(f"Error saving chats: {e}")


def save_chat(chat_id, chat_data):
    """Save a single chat"""
    chats = load_chats()
    chats[chat_id] = chat_data
    save_chats(chats)


def load_messages():
    """Load messages from JSON file"""
    if os.path.exists(MESSAGES_FILE):
        try:
            with open(MESSAGES_FILE, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {}
    return {}


def save_messages(messages):
    """Save messages to JSON file"""
    try:
        os.makedirs(os.path.dirname(MESSAGES_FILE), exist_ok=True)
        with open(MESSAGES_FILE, 'w') as f:
            json.dump(messages, f, indent=2)
    except IOError as e:
        print(f"Error saving messages: {e}")


def get_chat_messages(chat_id):
    """Get all messages for a specific chat"""
    messages = load_messages()
    return messages.get(chat_id, [])


def save_message(chat_id, message):
    """Save a single message to a chat"""
    messages = load_messages()
    if chat_id not in messages:
        messages[chat_id] = []
    messages[chat_id].append(message)
    save_messages(messages)


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return {'status': 'ok', 'service': 'optimistic-messaging'}


@socketio.on('connect')
def handle_connect():
    """Handle user connection"""
    print(f'Client connected: {request.sid}')


@socketio.on('register_user')
def handle_register_user(data):
    """Register a user when they join"""
    user_id = data.get('user_id')
    username = data.get('username')
    wallet = data.get('wallet')

    if not user_id:
        emit('error', {'message': 'user_id is required'})
        return

    active_users[user_id] = {
        'socket_id': request.sid,
        'username': username,
        'wallet': wallet,
        'connected_at': datetime.now().isoformat()
    }

    print(f'User registered: {user_id} ({username})')
    emit('user_registered', {
        'user_id': user_id,
        'status': 'success'
    })


@socketio.on('join_chat')
def handle_join_chat(data):
    """User joins a chat room"""
    chat_id = data.get('chat_id')
    user_id = data.get('user_id')

    if not chat_id or not user_id:
        emit('error', {'message': 'chat_id and user_id are required'})
        return

    # Join the socket to the room
    join_room(chat_id)

    # Track user in chat
    if chat_id not in chat_rooms:
        chat_rooms[chat_id] = []
    if user_id not in chat_rooms[chat_id]:
        chat_rooms[chat_id].append(user_id)

    # Load and send chat history
    messages = get_chat_messages(chat_id)

    emit('chat_joined', {
        'chat_id': chat_id,
        'user_id': user_id,
        'messages': messages,
        'active_users': chat_rooms.get(chat_id, [])
    })

    # Notify others in the chat
    emit('user_joined', {
        'chat_id': chat_id,
        'user_id': user_id,
        'active_users': chat_rooms.get(chat_id, [])
    }, room=chat_id, skip_sid=request.sid)

    print(f'User {user_id} joined chat {chat_id}')


@socketio.on('leave_chat')
def handle_leave_chat(data):
    """User leaves a chat room"""
    chat_id = data.get('chat_id')
    user_id = data.get('user_id')

    if chat_id and user_id:
        leave_room(chat_id)

        if chat_id in chat_rooms and user_id in chat_rooms[chat_id]:
            chat_rooms[chat_id].remove(user_id)

        # Notify others in the chat
        emit('user_left', {
            'chat_id': chat_id,
            'user_id': user_id,
            'active_users': chat_rooms.get(chat_id, [])
        }, room=chat_id)

        print(f'User {user_id} left chat {chat_id}')


@socketio.on('send_message')
def handle_send_message(data):
    """Handle incoming message"""
    chat_id = data.get('chat_id')
    user_id = data.get('user_id')
    content = data.get('content')
    username = data.get('username')
    wallet = data.get('wallet')

    if not chat_id or not content:
        emit('error', {'message': 'chat_id and content are required'})
        return

    # Create message object
    message = {
        'id': str(uuid.uuid4()),
        'chat_id': chat_id,
        'user_id': user_id,
        'username': username,
        'wallet': wallet,
        'content': content,
        'timestamp': datetime.now().isoformat(),
        'status': 'sent'
    }

    # Save message to file
    save_message(chat_id, message)

    # Broadcast to all users in the chat room
    emit('new_message', message, room=chat_id)

    print(f'Message from {user_id} in chat {chat_id}: {content[:50]}...')


@socketio.on('typing')
def handle_typing(data):
    """Handle typing indicator"""
    chat_id = data.get('chat_id')
    user_id = data.get('user_id')
    username = data.get('username')
    is_typing = data.get('is_typing', False)

    if chat_id:
        emit('user_typing', {
            'chat_id': chat_id,
            'user_id': user_id,
            'username': username,
            'is_typing': is_typing
        }, room=chat_id, skip_sid=request.sid)


@socketio.on('disconnect')
def handle_disconnect():
    """Handle user disconnection"""
    # Find and remove user from active users
    user_id = None
    for uid, user_data in active_users.items():
        if user_data.get('socket_id') == request.sid:
            user_id = uid
            break

    if user_id:
        del active_users[user_id]

        # Remove from all chat rooms
        for chat_id in list(chat_rooms.keys()):
            if user_id in chat_rooms[chat_id]:
                chat_rooms[chat_id].remove(user_id)

        print(f'User {user_id} disconnected')


@app.route('/api/messages/<chat_id>', methods=['GET'])
def get_messages(chat_id):
    """Get all messages for a chat"""
    messages = get_chat_messages(chat_id)
    return {'chat_id': chat_id, 'messages': messages}


@app.route('/api/active-users', methods=['GET'])
def get_active_users_endpoint():
    """Get list of active users"""
    return {'active_users': list(active_users.keys()), 'count': len(active_users)}


@app.route('/api/chats', methods=['GET'])
def get_chats():
    """Get all chats with message count"""
    messages = load_messages()
    chats = {}
    for chat_id, chat_messages in messages.items():
        chats[chat_id] = {
            'message_count': len(chat_messages),
            'last_message': chat_messages[-1] if chat_messages else None,
            'active_users': len(chat_rooms.get(chat_id, []))
        }
    return {'chats': chats}


@app.route('/api/broadcast-chat', methods=['POST'])
def broadcast_chat():
    """Broadcast new chat creation to all connected users"""
    data = request.get_json()
    chat_data = data.get('chat')

    if chat_data:
        chat_id = chat_data.get('chatId')
        save_chat(chat_id, chat_data)
        socketio.emit('new_chat_created', chat_data, broadcast=True)
        print(f"Chat broadcasted: {chat_id}")

    return {'status': 'broadcasted'}


@app.route('/api/get-all-chats', methods=['GET'])
def get_all_chats():
    """Get all saved chats"""
    chats = load_chats()
    return {'chats': chats}


if __name__ == '__main__':
    print("Starting Optimistic Messaging Server...")
    print(f"Messages will be stored in: {MESSAGES_FILE}")
    socketio.run(app, host='0.0.0.0', port=5001, debug=True)
