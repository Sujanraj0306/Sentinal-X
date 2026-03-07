import os
import sys
import json
import urllib.request
from dotenv import load_dotenv

# Load env from MADsystem root
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
env_path = os.path.join(root_dir, ".env")
print(f"Loading env from: {env_path}")
load_dotenv(env_path)

import certifi
os.environ["SSL_CERT_FILE"] = certifi.where()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("NO API KEY!")
    sys.exit(1)

model_id = "gemini-1.5-flash"
url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={api_key}"

payload = {
    "contents": [{"parts":[{"text": "Say Hello"}]}]
}
data = json.dumps(payload).encode('utf-8')
headers = {'Content-Type': 'application/json'}

print(f"Sending direct REST request to {model_id}...")
req = urllib.request.Request(url, data=data, headers=headers, method='POST')

try:
    with urllib.request.urlopen(req, timeout=10) as response:
        result = json.loads(response.read().decode())
        print("SUCCESS! Response:")
        print(result['candidates'][0]['content']['parts'][0]['text'])
except urllib.error.HTTPError as e:
    print(f"HTTP ERROR: {e.code} {e.reason}")
    print(e.read().decode())
except Exception as e:
    print(f"NETWORK ERROR: {str(e)}")
