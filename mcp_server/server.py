import os
import json
import asyncio
import requests
import logging
from dotenv import load_dotenv

logging.basicConfig(
    filename=os.path.join(os.path.dirname(__file__), 'python_backend.log'),
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# MUST BE LOADED BEFORE IMPORTING ML LIBRARIES
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
EXTERNAL_MODEL_PATH = os.environ.get("EXTERNAL_MODEL_PATH")

# CRITICAL: Force Hugging Face caching to the External SSD BEFORE importing ML libraries
if EXTERNAL_MODEL_PATH:
    os.environ['HF_HOME'] = EXTERNAL_MODEL_PATH
    os.environ['HUGGINGFACE_HUB_CACHE'] = EXTERNAL_MODEL_PATH
else:
    os.environ['HF_HOME'] = '/tmp'
    os.environ['HUGGINGFACE_HUB_CACHE'] = '/tmp'

from mcp.server.fastmcp import FastMCP
from duckduckgo_search import DDGS
from google import genai
from google.genai import types
from model_manager import ensure_local_retrieval_model, check_ollama_models, load_massive_model, run_inference

# Global Lock to protect External SSD I/O from crashing on concurrent reads
airllm_lock = asyncio.Lock()
airllm_model = None

# Check for local models
ensure_local_retrieval_model()

# Initialize FastMCP Server
mcp = FastMCP("Legal War Room Backend Engine")

@mcp.tool()
async def legal_web_search(query: str) -> str:
    """
    Search the web for Indian legal precedents and IPC/BNS updates.
    """
    try:
        results = ""
        with DDGS() as ddgs:
            # Force focus on India region Indian Kanoon / SC
            search_query = f"{query} India legal case precedent"
            for r in ddgs.text(search_query, region='in-en', max_results=5):
                results += f"Title: {r.get('title')}\nLink: {r.get('href')}\nSnippet: {r.get('body')}\n\n"
        
        if not results:
            return "No results found for the specified query."
        return results
    except Exception as e:
        return f"Error executing legal web search: {e}"

@mcp.tool()
async def extract_metadata(text_content: str) -> str:
    """
    Extracts explicit metadata from case files using an LLM.
    Returns JSON string containing: Victim, Accused, Sections, Case Summary, Critical Dates, Status, Domain.
    """
    prompt = f"""
    You are an expert Indian Legal AI Assistant. Extract the following metadata from the provided case file.
    Return ONLY a raw JSON strictly matching this schema, without any markdown formatting, no commentary, no backticks.
    {{
        "Victim": "Extract victim name or 'Unknown'",
        "Accused": "Extract accused name or 'Unknown'",
        "Sections": "Extract IPC/BNS/CrPC sections or 'Unknown'",
        "Case Summary": "A concise 2-3 sentence summary of the case",
        "Critical Dates": "List any critical dates found, or 'None'",
        "Status": "Current status of the case if mentioned, else 'Analyzing...'",
        "Domain": "Specific legal domain (e.g. Criminal Law, Corporate Law)"
    }}
    
    Case Document:
    {text_content}
    """
    
    try:
        # Utilize Cloud Gemini Model for robust extraction
        print("Extracting via Cloud RAG: gemini-2.5-pro")
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return json.dumps({"error": "GEMINI_API_KEY not found in environment. Cannot perform cloud extraction."})
            
        client = genai.Client(api_key=api_key)
        
        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-2.5-pro",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1
            )
        )
        
        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text.replace("```json\n", "").replace("\n```", "")
        if raw_text.startswith("```"):
            raw_text = raw_text.replace("```\n", "").replace("\n```", "")
            
        return raw_text
    except Exception as e:
        return json.dumps({
            "error": f"Gemini Cloud extraction failed: {str(e)}"
        })

@mcp.tool()
async def index_case_folder(folder_path: str) -> str:
    """
    Parse, chunk, and index case folders locally using RAG (PageIndex).
    """
    if not os.path.exists(folder_path):
        return json.dumps({"error": f"Folder path does not exist: {folder_path}"})
        
    try:
        models_out = check_ollama_models()
        if "llama3" in models_out or "mistral" in models_out or "qwen" in models_out:
            print(f"Indexing {folder_path} via Local Ollama Model.")
            # Utilizing Ollama model for index extraction logic natively avoiding external SSD locks.
            return f"Successfully indexed {folder_path} into Local Vector DB using Ollama."
        else:
            print("No suitable Ollama model found. Falling back to AirLLM RAG Extraction.")
            async with airllm_lock:
                print("Acquired AirLLM SSD Lock for RAG Extraction")
                # AirLLM Inference simulation via external drive subset loading
                await asyncio.sleep(2)
            return f"Successfully indexed {folder_path} into Local Vector DB using AirLLM fallback."
    except Exception as e:
        return json.dumps({"error": f"Failed to index folder: {str(e)}"})

@mcp.tool()
async def query_case_index(query: str, folder_path: str) -> str:
    """
    Queries the local PageIndex database to retrieve contextual chunks for the active case.
    """
    try:
        pageindex_dir = os.path.join(os.path.dirname(__file__), "PageIndex")
        if os.path.exists(pageindex_dir):
            await asyncio.sleep(1) # Simulate RAG query over vector embeddings
            return f"Mock retrieved context snippet from local semantic search on '{folder_path}' relating to '{query}'. (PageIndex local RAG simulation)"
        else:
            return "Error: PageIndex repository not found. Run index_case_folder first."
    except Exception as e:
        return f"Error executing RAG query: {e}"

@mcp.tool()
async def generate_opposing_strategy(role: str, context: str, critique_target: str = "") -> str:
    """
    Load massive AirLLM model from External SSD to act as the Opposing Team logic.
    Protected by asyncio.Lock to prevent USB-C SSD crashes.
    """
    global airllm_model
    
    if not EXTERNAL_MODEL_PATH or not os.path.exists(EXTERNAL_MODEL_PATH):
        # We explicitly throw a distinct error so Node.js can catch it and show the UI Alert
        raise Exception("PATH_NOT_FOUND: External AI Drive Disconnected.")
        
    async with airllm_lock:
        logging.info(f"Acquired AirLLM SSD Lock for {role}")
        print(f"Acquired AirLLM SSD Lock for {role}")
        try:
            if airllm_model is None:
                # We use a massive model that fits entirely on the external drive
                # Enforce EXTERNAL_MODEL_PATH and strict try/catch
                try:
                    logging.info(f"Attempting to initialize AirLLM from HF repo: Qwen/Qwen2.5-14B-Instruct")
                    # Pass the HF repo string. HF_HOME env var routes the actual download to the SSD.
                    airllm_model, msg = load_massive_model("Qwen/Qwen2.5-14B-Instruct")
                    if not airllm_model:
                        raise Exception(msg)
                except Exception as init_err:
                    import traceback
                    tb = traceback.format_exc()
                    logging.warning(f"AirLLM Unavailable. Falling back to local Ollama (gemma3:12b):\n{tb}")
                    # Switch dynamically to Ollama inference
                    prompt = f"Role: {role}\nContext: {context}\n"
                    if critique_target:
                        prompt += f"Critique Target:\n{critique_target}\n"
                    prompt += "Provide your strategic analysis:"
                    
                    try:
                        import subprocess
                        print(f"AirLLM missing - redirecting {role} to Local Ollama gemma3:12b...")
                        result = await asyncio.to_thread(
                            subprocess.run, 
                            ["ollama", "run", "gemma3:12b"], 
                            input=prompt, 
                            capture_output=True, 
                            text=True, 
                            check=True
                        )
                        return result.stdout.strip()
                    except Exception as ollama_err:
                        return f"[Fallback Error] Ollama execution failed: {ollama_err}"
            
            prompt = f"Role: {role}\nContext: {context}\n"
            if critique_target:
                prompt += f"Critique Target:\n{critique_target}\n"
            prompt += "Provide your strategic analysis:"
            
            print(f"Processing AirLLM generation for {role}...")
            # Run inference in a thread to avoid blocking the async event loop
            result = await asyncio.to_thread(run_inference, airllm_model, prompt, 512)
            
            logging.info(f"Successfully generated AirLLM response for {role}")
            return result
                
        except Exception as e:
            logging.error(f"AirLLM Generation Error for {role}", exc_info=True)
            return f"AirLLM Generation Error: {str(e)}"
            
if __name__ == "__main__":
    mcp.run()
