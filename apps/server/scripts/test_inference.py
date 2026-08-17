"""
CLI Inference Test for NeurionForge AI Studio
Streams token-by-token completion from local GGUF model using llama-cpp-python
"""
import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
dotenv_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path)

MODELS_DIR = os.getenv("MODELS_DIR", "D:/models")
MODEL_FILENAME = "qwen2.5-1.5b-instruct-q4_k_m.gguf"
MODEL_PATH = Path(MODELS_DIR) / MODEL_FILENAME

def run_test_inference(prompt: str = "Explain what NeurionForge AI Studio is in 2 concise sentences."):
    if not MODEL_PATH.exists():
        print(f"[ERROR] Model file not found at {MODEL_PATH}")
        print("Please run `python scripts/download_model.py` first.")
        sys.exit(1)

    print(f"Loading model from {MODEL_PATH} ...")
    try:
        from llama_cpp import Llama
    except ImportError:
        print("[ERROR] llama-cpp-python is not installed.")
        print("Please install it in your virtual environment.")
        sys.exit(1)

    load_start = time.perf_counter()
    llm = Llama(
        model_path=str(MODEL_PATH),
        n_ctx=2048,
        n_threads=os.cpu_count() or 4,
        verbose=False
    )
    load_time = time.perf_counter() - load_start
    print(f"[OK] Model loaded in {load_time:.2f}s\n")

    messages = [
        {"role": "system", "content": "You are NeurionForge AI Assistant, a fast, helpful local AI companion."},
        {"role": "user", "content": prompt}
    ]

    print(f"Prompt: {prompt}\n--- Response Stream ---")
    start_time = time.perf_counter()
    first_token_time = None
    token_count = 0

    response_stream = llm.create_chat_completion(
        messages=messages,
        temperature=0.7,
        max_tokens=256,
        stream=True
    )

    for chunk in response_stream:
        choices = chunk.get("choices", [])
        if not choices:
            continue
        delta = choices[0].get("delta", {})
        token_text = delta.get("content", "")
        if token_text:
            if first_token_time is None:
                first_token_time = time.perf_counter()
            print(token_text, end="", flush=True)
            token_count += 1

    end_time = time.perf_counter()
    print("\n-----------------------")

    if token_count > 0 and first_token_time:
        ttft_ms = (first_token_time - start_time) * 1000
        generation_duration = end_time - first_token_time
        tps = token_count / generation_duration if generation_duration > 0 else 0
        print(f"\n[Performance Metrics]")
        print(f"• Generated Tokens: {token_count}")
        print(f"• Time-to-First-Token (TTFT): {ttft_ms:.1f} ms")
        print(f"• Speed: {tps:.2f} tokens/sec")
        print(f"• Total Generation Time: {end_time - start_time:.2f}s")
    else:
        print("[Warning] No tokens generated.")

if __name__ == "__main__":
    prompt = sys.argv[1] if len(sys.argv) > 1 else "Explain what NeurionForge AI Studio is in 2 concise sentences."
    run_test_inference(prompt)
