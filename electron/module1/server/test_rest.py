import os
import certifi
import urllib.request
import json
import ssl
from dotenv import load_dotenv

load_dotenv("../../.env")
api_key = os.getenv("GEMINI_API_KEY")

# Create SSL context using certifi
context = ssl.create_default_context(cafile=certifi.where())

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
payload = {"contents": [{"parts":[{"text": "Say Hello"}]}]}
req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'}, method='POST')

try:
    with urllib.request.urlopen(req, context=context, timeout=10) as response:
        print("SUCCESS:", json.loads(response.read().decode())['candidates'][0]['content']['parts'][0]['text'])
except urllib.error.HTTPError as e:
    print(f"HTTP ERROR: {e.code}")
    print(e.read().decode())
except Exception as e:
    print(f"ERROR: {e}")
