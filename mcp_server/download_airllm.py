import os
import sys
from dotenv import load_dotenv

os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "1"

load_dotenv()
ext_path = os.getenv("EXTERNAL_MODEL_PATH")
if ext_path:
    os.environ["HF_HOME"] = ext_path
    os.environ["HUGGINGFACE_HUB_CACHE"] = ext_path
    print(f"✅ EXTERNAL_MODEL_PATH verified: {ext_path}")
else:
    print("❌ EXTERNAL_MODEL_PATH not set in .env")
    sys.exit(1)

print("\n--- Massive Model Pre-Downloader ---")
print("Initializing AirLLM chunked download for Qwen/Qwen2.5-14B-Instruct...")
print("Please wait. Hugging Face TQDM progress bars will appear below...\n")

try:
    from airllm import AutoModel
    
    # This automatically triggers huggingface_hub to download all shards
    # to the external SSD path defined above.
    model = AutoModel.from_pretrained("Qwen/Qwen2.5-14B-Instruct")
    
    print("\n✅ Download Complete! The model is fully cached on the External SSD.")
    print("You can now safely restart the MADsystem Node server and Debate.")

except ImportError:
    print("❌ Error: airllm not installed in this environment.")
except Exception as e:
    print(f"❌ Download Failed. Error: {e}")
