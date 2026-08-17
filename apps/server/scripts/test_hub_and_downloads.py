import asyncio
import os
import sys
from pathlib import Path
from fastapi.testclient import TestClient

SERVER_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SERVER_ROOT))

from main import app

def test_hub_and_downloads():
    print("--- Testing Phase 1.1 HuggingFace Hub & Download API ---")
    with TestClient(app) as client:
        # 1. Test Hub Search
        print("\n1. Testing GET /hub/search?q=qwen ...")
        res = client.get("/hub/search?q=qwen&limit=5")
        assert res.status_code == 200, f"Search failed: {res.text}"
        data = res.json()
        print(f"[OK] Found {len(data)} repos matching 'qwen':")
        for item in data[:3]:
            print(f"   * {item['repo_id']} (Downloads: {item['downloads']} | Likes: {item['likes']})")
        assert len(data) > 0

        # 2. Test Listing GGUF Files for a known repo
        target_repo = "Qwen/Qwen2.5-1.5B-Instruct-GGUF"
        print(f"\n2. Testing GET /hub/files?repo_id={target_repo} ...")
        res = client.get(f"/hub/files?repo_id={target_repo}")
        assert res.status_code == 200, f"List files failed: {res.text}"
        files = res.json()
        print(f"[OK] Found {len(files)} GGUF file(s) in {target_repo}:")
        for f in files[:4]:
            print(f"   * {f['filename']} ({f['quantization']}, {f['size_gb']} GB) - Exists locally: {f['already_downloaded']}")
        assert len(files) > 0

        # 3. Test Download Endpoint & Job Listing
        print("\n3. Testing GET /downloads ...")
        res = client.get("/downloads")
        assert res.status_code == 200
        jobs = res.json()
        print(f"[OK] Current download jobs in DB: {len(jobs)}")

    print("\n--- All Phase 1.1 Backend Hub & Download Tests Passed! ---")

if __name__ == "__main__":
    test_hub_and_downloads()
