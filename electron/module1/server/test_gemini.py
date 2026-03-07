import os
import sys
from dotenv import load_dotenv
import google.generativeai as genai

# Load env from MADsystem root
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
env_path = os.path.join(root_dir, ".env")
print(f"Loading env from: {env_path}")
load_dotenv(env_path)

api_key = os.getenv("GEMINI_API_KEY")
print(f"API Key present: {bool(api_key)}")
if api_key:
    # Just print start/end to avoid leaking full key in logs
    print(f"API Key length: {len(api_key)}")
    print(f"API Key starts with: {api_key[:5]}")
    print(f"API Key ends with: {api_key[-5:]}")

try:
    genai.configure(api_key=api_key)
    print("Configured genai object successfully.")
    
    print("Fetching models...")
    models = [m.name for m in genai.list_models() if "generateContent" in m.supported_generation_methods]
    print(f"Available models: {models}")
    
    model_name = 'gemini-2.0-flash'
    print(f"Testing {model_name}...")
    model = genai.GenerativeModel(model_name)
    response = model.generate_content("Say 'Hello' and nothing else.")
    print(f"Response: {response.text}")
    print("SUCCESS")
    
except Exception as e:
    import traceback
    print("=== ERROR STACK TRACE ===")
    traceback.print_exc()
    print(f"Error: {e}")
