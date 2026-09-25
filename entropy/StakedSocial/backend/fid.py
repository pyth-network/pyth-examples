from flask import Flask, request, jsonify
from farcaster import Warpcast
from dotenv import load_dotenv
from flask_cors import CORS
import os
import requests

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# initialize Warpcast client once
client = Warpcast(mnemonic=os.getenv("FARCASTER_MNEMONIC"))

cached_wallet_addresses = {}

def get_wallet_address(fid: int):
    if fid in cached_wallet_addresses:
        return cached_wallet_addresses[fid]
    else:
        endpoint = f"https://api.warpcast.com/v2/user?fid={fid}"
        response = requests.get(endpoint)
        data = response.json()
        # wallet_address = data["result"]["extras"]["custodyAddress"]
        wallet_address = data["result"]["extras"]["ethWallets"][0]
        cached_wallet_addresses[fid] = wallet_address
        return wallet_address

@app.route("/user", methods=["GET"])
def get_user():
    username = request.args.get("username")

    if not username:
        return jsonify({"error": "Provide ?username="}), 400

    user = client.get_user_by_username(username)

    # print(client.get_user_verifications(fid=user.fid))

    resp = {
        "fid": user.fid,
        'username': user.username,
        'display_name': user.display_name,
        'pfp': user.pfp.url,
        'wallet_address': get_wallet_address(user.fid),
    }
    return jsonify(resp)


@app.route("/followers", methods=["GET"])
def get_followers():
    fid = request.args.get("fid")
    if not fid:
        return jsonify({"error": "Provide ?fid="}), 400

    followers = client.get_followers(fid=int(fid))
    print("GOT")
    print(followers)
    resp = {"followers": []}
    for follower in followers.users:
        resp["followers"].append({
            "fid": follower.fid,
            "username": follower.username,
            "display_name": follower.display_name,
            "pfp": follower.pfp.url,
            "wallet_address": get_wallet_address(follower.fid),
        })
    return jsonify(resp)



@app.route("/following", methods=["GET"])
def get_following():
    fid = request.args.get("fid")
    if not fid:
        return jsonify({"error": "Provide ?fid="}), 400

    following = client.get_following(fid=int(fid))
    resp = {"following": []}
    for following in following.users:
        resp["following"].append({
            "fid": following.fid,
            "username": following.username,
            "display_name": following.display_name,
            "pfp": following.pfp.url,
            "wallet_address": get_wallet_address(following.fid),
        })
    return jsonify(resp)

@app.route("/friends", methods=["GET"])
def get_friends():
    fid = request.args.get("fid")
    if not fid:
        return jsonify({"error": "Provide ?fid="}), 400

    followers = client.get_followers(fid=int(fid))
    following = client.get_following(fid=int(fid))

    resp = {"friends": []}
    
    followers_fid_set = set(follower.fid for follower in followers.users)
    following_fid_set = set(following.fid for following in following.users)

    friends_fid_set = followers_fid_set | following_fid_set

    for candidate in following.users:
        if candidate.fid in friends_fid_set:
            resp["friends"].append({
                "fid": candidate.fid,
                "fid_str": str(candidate.fid),
                "username": candidate.username,
                "display_name": candidate.display_name,
                "pfp": candidate.pfp.url,
                "wallet_address": get_wallet_address(candidate.fid),
            })
    return jsonify(resp)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)