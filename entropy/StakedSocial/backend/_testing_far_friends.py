import os
from farcaster import Warpcast
from dotenv import load_dotenv # can be installed with `pip install python-dotenv`

load_dotenv()

client = Warpcast(mnemonic="during bird throw govern lecture fuel unique hill praise sell rifle deer")
# client.get_followers(fid=30)
user = client.get_user_by_username("pulkith")  
print(user)
print(user.fid)

followers = client.get_followers(fid=user.fid)
print(followers)
# print(client.get_healthcheck())
