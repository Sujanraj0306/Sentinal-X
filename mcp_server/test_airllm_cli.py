#!/usr/bin/env python3
"""
Standalone AirLLM CLI — Isolated test script.
Tests loading the Qwen2.5-14B model from SSD via AirLLM and running inference.
Run: cd mcp_server && source venv/bin/activate && python test_airllm_cli.py
"""

import os
import sys
import time
import traceback

# ─── Step 0: Route HF cache to External SSD ─────────────────────────────────
SSD_PATH = os.environ.get("EXTERNAL_MODEL_PATH", "/Volumes/sujan-SSD/AI_Models")
os.environ["HF_HOME"] = SSD_PATH
os.environ["HUGGINGFACE_HUB_CACHE"] = SSD_PATH
os.environ["CUDA_VISIBLE_DEVICES"] = ""
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

MODEL_ID = "Qwen/Qwen2.5-14B-Instruct"

print("=" * 60)
print("  AirLLM CLI — Standalone Inference Test")
print("=" * 60)
print(f"  Model:    {MODEL_ID}")
print(f"  SSD Path: {SSD_PATH}")
print(f"  SSD Mounted: {os.path.exists(SSD_PATH)}")
print("=" * 60)

if not os.path.exists(SSD_PATH):
    print("\n[FATAL] External SSD not mounted at the specified path.")
    print("  Please connect the SSD and try again.")
    sys.exit(1)

# ─── Step 1: Apply MLX Patches ──────────────────────────────────────────────
print("\n[1/4] Applying MLX compatibility patches...")

try:
    import mlx.nn as nn
    _original_update = nn.Module.update

    def _patched_update(self, parameters):
        """Filter out parameters not defined in the module (e.g. 'bias')."""
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
            return filtered
        return _original_update(self, _prune(self, parameters))

    nn.Module.update = _patched_update
    print("  ✅ MLX Module.update patched (skip unknown params like 'bias')")
except ImportError:
    print("  ⚠️  MLX not installed — skipping MLX patches")

try:
    from airllm.airllm_llama_mlx import AirLLMLlamaMlx
    _original_model_generate = AirLLMLlamaMlx.model_generate

    def _patched_model_generate(self, x, temperature=0, max_new_tokens=None):
        gen = _original_model_generate(self, x, temperature, max_new_tokens)
        try:
            yield from gen
        except AttributeError as e:
            if any(attr in str(e) for attr in ["tok_embeddings", "layers", "norm", "output"]):
                pass  # Expected cleanup error — ignore
            else:
                raise

    AirLLMLlamaMlx.model_generate = _patched_model_generate
    print("  ✅ AirLLMLlamaMlx.model_generate patched (ignore cleanup AttributeErrors)")
except ImportError:
    print("  ⚠️  AirLLMLlamaMlx not available — skipping generator patch")

# ─── Step 2: Load Model ─────────────────────────────────────────────────────
print(f"\n[2/4] Loading model: {MODEL_ID}")
print("  This may take a moment on first run (downloading shards to SSD)...\n")

try:
    from airllm import AutoModel
    t0 = time.time()
    model = AutoModel.from_pretrained(MODEL_ID)
    load_time = time.time() - t0
    print(f"  ✅ Model loaded in {load_time:.1f}s")
    print(f"  Backend class: {type(model).__name__}")
except Exception as e:
    print(f"  ❌ Model loading FAILED: {e}")
    traceback.print_exc()
    sys.exit(1)

# ─── Step 3: Prepare Tokenizer & Detect Backend ─────────────────────────────
print("\n[3/4] Preparing tokenizer...")

try:
    from transformers import AutoTokenizer
    tokenizer = model.tokenizer if hasattr(model, "tokenizer") else None
    if tokenizer is None:
        model_name = getattr(model, "model_name", None) or MODEL_ID
        tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    print(f"  ✅ Tokenizer ready: {type(tokenizer).__name__}")
except Exception as e:
    print(f"  ❌ Tokenizer FAILED: {e}")
    traceback.print_exc()
    sys.exit(1)

is_mlx = "mlx" in type(model).__module__.lower() or "mlx" in type(model).__name__.lower()
print(f"  Backend: {'MLX' if is_mlx else 'PyTorch'}")

# ─── Step 4: Interactive CLI ─────────────────────────────────────────────────
print("\n[4/4] Starting interactive CLI. Type 'quit' to exit.\n")
print("-" * 60)

def run_inference(prompt, max_new_tokens=256):
    """Run a single inference and return the generated text."""
    import torch

    # Tokenize to PyTorch first
    inputs = tokenizer(prompt, return_tensors="pt")
    input_ids = inputs["input_ids"].to(torch.device("cpu"))

    # Convert to MLX if needed
    if is_mlx:
        import mlx.core as mx
        input_ids = mx.array(input_ids.numpy())
        print(f"  [Tensor] mlx.core.array, shape={input_ids.shape}, dtype={input_ids.dtype}")
    else:
        print(f"  [Tensor] torch.Tensor, shape={input_ids.shape}, dtype={input_ids.dtype}")

    # Generate
    t0 = time.time()
    generation_output = model.generate(
        input_ids,
        max_new_tokens=max_new_tokens,
        return_dict_in_generate=True
    )
    gen_time = time.time() - t0

    output_ids = generation_output.sequences[0]

    # Decode — handle both MLX and PyTorch output types
    if hasattr(output_ids, "tolist"):
        output_list = output_ids.tolist()
    else:
        output_list = list(output_ids)

    decoded = tokenizer.decode(output_list, skip_special_tokens=True)

    # Strip echoed prompt
    if decoded.startswith(prompt):
        decoded = decoded[len(prompt):].strip()

    return decoded, gen_time

while True:
    try:
        prompt = input("\n🔹 You: ").strip()
    except (EOFError, KeyboardInterrupt):
        print("\n\nGoodbye!")
        break

    if not prompt:
        continue
    if prompt.lower() in ("quit", "exit", "q"):
        print("Goodbye!")
        break

    print(f"\n  ⏳ Generating (max 256 tokens)...")
    try:
        response, elapsed = run_inference(prompt, max_new_tokens=256)
        print(f"\n  ⏱️  Generated in {elapsed:.1f}s")
        print(f"\n🤖 AirLLM:\n{response}\n")
        print("-" * 60)
    except Exception as e:
        print(f"\n  ❌ Inference Error: {e}")
        traceback.print_exc()
        print("-" * 60)
