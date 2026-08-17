import asyncio
import os
import sys
from pathlib import Path

# Add server root to sys.path
SERVER_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SERVER_ROOT))

from db import init_db
from services.model_service import model_service

async def test_backend_core():
    print("1. Initializing DB...")
    await init_db()
    print("[OK] DB Initialized.")

    print("2. Scanning models...")
    models = await model_service.scan_models()
    print(f"[OK] Found {len(models)} model(s):")
    for m in models:
        print(f"   • {m['name']} ({m['quantization']}, {m['size_gb']} GB) - Loaded: {m['loaded']}")

    if not models:
        print("[WARNING] No models found in D:/models.")
        return

    first_model = models[0]
    model_id = first_model["id"]

    print(f"\n3. Loading model: {model_id} ...")
    load_res = await model_service.load_model(model_id)
    print(f"[OK] Model loaded: {load_res}")

    print("\n4. Testing generation...")
    llm = model_service.loaded_model
    resp = llm.create_chat_completion(
        messages=[
            {"role": "system", "content": "You are NeurionForge Assistant."},
            {"role": "user", "content": "Say 'NeurionForge Phase 1 is alive!' in 5 words."}
        ],
        max_tokens=32
    )
    content = resp["choices"][0]["message"]["content"]
    print(f"[OK] Generation Response: {content.strip()}")

    print("\n5. Unloading model...")
    unload_res = await model_service.unload_model(model_id)
    print(f"[OK] Model unloaded: {unload_res}")
    print("\n--- All Backend Core Tests Passed! ---")

if __name__ == "__main__":
    asyncio.run(test_backend_core())
