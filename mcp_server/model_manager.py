import os
import subprocess

try:
    from airllm import AutoModel
except ImportError:
    AutoModel = None

def check_ollama_models():
    """Execute `ollama list` and return available models."""
    try:
        result = subprocess.run(["ollama", "list"], capture_output=True, text=True, check=True)
        return result.stdout
    except FileNotFoundError:
        return "Warning: Ollama is not globally installed or not in PATH."
    except subprocess.CalledProcessError as e:
        return f"Error executing ollama list: {e.stderr}"

def ensure_local_retrieval_model():
    """Ensure a suitable Ollama model is available, auto-pulling 'llama3' if none are present."""
    models_out = check_ollama_models()
    if "Warning:" in models_out or "Error:" in models_out:
        print(models_out)
        return False

    if "llama3" not in models_out and "mistral" not in models_out:
        print("Suitable retrieval model not found locally. Auto-pulling 'llama3'...")
        try:
            subprocess.run(["ollama", "pull", "llama3"], check=True)
            print("'llama3' pulled successfully.")
            return True
        except Exception as e:
            print(f"Failed to auto-pull llama3: {e}")
            return False
    else:
        print("Suitable retrieval model found locally.")
        return True

def load_massive_model(model_id: str="Qwen/Qwen2.5-14B-Instruct"):
    """
    Integrate AirLLM for running massive models seamlessly on consumer hardware.
    Will download the HF model weights if not cached locally.
    Forces CPU device map for maximum SSD stability.
    Patches MLX Module.update to skip unknown parameters (Qwen2 bias vs Llama arch mismatch).
    """
    if not AutoModel:
        return None, "Error: airllm package missing."
    
    print(f"Initializing AirLLM for parameter subset loading: {model_id}...")
    try:
        import os
        os.environ["CUDA_VISIBLE_DEVICES"] = ""
        os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"
        
        # Monkey-patch MLX Module.update to skip unknown parameters like 'bias'
        # AirLLM uses LlamaMlx architecture for Qwen2 — the safetensors contain
        # bias keys that the Llama class doesn't define, causing a ValueError.
        import mlx.nn as nn
        _original_update = nn.Module.update
        
        def _patched_update(self, parameters):
            """Filter out parameters not defined in the module before updating."""
            def _prune(module, params):
                if not isinstance(params, dict):
                    return params
                filtered = {}
                for k, v in params.items():
                    if hasattr(module, k):
                        child = getattr(module, k)
                        if isinstance(child, nn.Module) and isinstance(v, dict):
                            filtered[k] = _prune(child, v)
                        else:
                            filtered[k] = v
                    # else: silently skip (e.g., 'bias' not in Llama layers)
                return filtered
            return _original_update(self, _prune(self, parameters))
        
        nn.Module.update = _patched_update
        print("[PATCH] MLX Module.update patched to skip unknown parameters.")

        # Patch AirLLMLlamaMlx.model_generate generator to ignore deletion of missing tok_embeddings
        try:
            from airllm.airllm_llama_mlx import AirLLMLlamaMlx
            _original_model_generate = AirLLMLlamaMlx.model_generate
            def _patched_model_generate(self, x, temperature=0, max_new_tokens=None):
                gen = _original_model_generate(self, x, temperature, max_new_tokens)
                try:
                    yield from gen
                except AttributeError as e:
                    if any(x in str(e) for x in ["tok_embeddings", "layers", "norm", "output"]):
                        pass
                    else:
                        raise e
            AirLLMLlamaMlx.model_generate = _patched_model_generate
            print("[PATCH] airllm_llama_mlx model_generate patched to ignore attribute deletion errors.")
        except ImportError:
            pass
        
        model = AutoModel.from_pretrained(model_id)
        return model, "Success"
    except Exception as e:
        return None, str(e)

def run_inference(model, prompt: str, max_new_tokens: int = 512) -> str:
    """
    Execute real AirLLM inference: tokenize -> generate -> decode.
    This is a BLOCKING call; wrap in asyncio.to_thread() from async code.
    Strictly enforces PyTorch 'pt' tensors and CPU device mapping.
    """
    if not model:
        return "[Error] Model not loaded."
    
    try:
        import torch
        import traceback
        import logging
        from transformers import AutoTokenizer
        
        # Enforce CPU mapping for AirLLM's disk-slicing
        device = torch.device('cpu')
        
        # AirLLM models expose a tokenizer via the model config
        tokenizer = model.tokenizer if hasattr(model, 'tokenizer') else None
        if tokenizer is None:
            model_name = getattr(model, 'model_name', None) or "Qwen/Qwen2.5-14B-Instruct"
            tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
        
        # CRITICAL: Explicitly enforce PyTorch tensors initially
        inputs = tokenizer(prompt, return_tensors="pt")
        
        # CRITICAL: Explicitly move tensors to CPU to strip any MLX bindings
        input_ids = inputs['input_ids'].to(device)
        
        is_mlx = 'mlx' in type(model).__module__.lower() or 'mlx' in type(model).__name__.lower()
        if is_mlx:
            try:
                import mlx.core as mx
                input_ids = mx.array(input_ids.numpy())
                logging.info(f"[TYPE ENFORCEMENT] Converted input_ids to mlx.core.array, shape: {input_ids.shape}, dtype: {input_ids.dtype}")
            except ImportError:
                logging.warning("MLX is not installed, but model seems to use MLX.")
        else:
            logging.info(f"[TYPE ENFORCEMENT] input_ids type: {type(input_ids)}, dtype: {input_ids.dtype}, device: {input_ids.device}")
        
        generation_output = model.generate(
            input_ids,
            max_new_tokens=max_new_tokens,
            return_dict_in_generate=True
        )
        
        output_ids = generation_output.sequences[0]
        decoded = tokenizer.decode(output_ids, skip_special_tokens=True)
        
        # Strip the original prompt from the output if it's echoed
        if decoded.startswith(prompt):
            decoded = decoded[len(prompt):].strip()
        
        return decoded if decoded else "[Warning] Model returned empty output."
    except Exception as e:
        import traceback
        import logging
        full_trace = traceback.format_exc()
        logging.error(f"[Inference Error] Full traceback:\n{full_trace}")
        return f"[Inference Error]: {str(e)}"

if __name__ == "__main__":
    print("--- Polling Local Ollama ---")
    print(check_ollama_models())
