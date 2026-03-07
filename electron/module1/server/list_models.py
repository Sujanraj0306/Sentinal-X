import os
import certifi
import google.generativeai as genai
from dotenv import load_dotenv

# Find root dir
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
load_dotenv(os.path.join(root_dir, ".env"))

os.environ["SSL_CERT_FILE"] = certifi.where()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

for m in genai.list_models():
    if "generateContent" in m.supported_generation_methods:
        print(m.name)
