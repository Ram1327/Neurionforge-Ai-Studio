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
        print("\n1. Testing GET /hub/search?q=mixedbread ...")
        res = client.get("/hub/search?q=mixedbread&limit=5")
        assert res.status_code == 200, f"Search failed: {res.text}"
        data = res.json()
        print(f"[OK] Found {len(data)} repos matching 'mixedbread':")
        assert len(data) > 0

        # 2. Test Listing GGUF Files for mixedbread (which has subfolder gguf/...)
        target_repo = "mixedbread-ai/mxbai-embed-large-v1"
        print(f"\n2. Testing GET /hub/files?repo_id={target_repo} ...")
        res = client.get(f"/hub/files?repo_id={target_repo}")
        assert res.status_code == 200, f"List files failed: {res.text}"
        files = res.json()
        print(f"[OK] Found {len(files)} GGUF file(s) in {target_repo}:")
        for f in files:
            print(f"   * {f['filename']} (rpath: {f['rfilename']}, {f['size_gb']} GB, URL: {f['url']})")
        assert len(files) > 0
        assert files[0]["rfilename"].startswith("gguf/")

        # 3. Test Download Endpoint with rfilename
        print("\n3. Testing POST /downloads/start with rfilename ...")
        start_res = client.post("/downloads/start", json={
            "repo_id": target_repo,
            "filename": files[0]["filename"],
            "rfilename": files[0]["rfilename"]
        })
        assert start_res.status_code == 200
        job_data = start_res.json()
        print(f"[OK] Download enqueued: {job_data}")
        assert "job_id" in job_data

        # 4. Test Cancel Job
        job_id = job_data["job_id"]
        cancel_res = client.post(f"/downloads/{job_id}/cancel")
        assert cancel_res.status_code == 200
        print(f"[OK] Cancelled job {job_id}: {cancel_res.json()}")

    print("\n--- All Phase 1.1 Backend Hub & Download Tests Passed! ---")

if __name__ == "__main__":
    test_hub_and_downloads()
