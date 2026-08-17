import asyncio
import os
import sys
import json
from pathlib import Path
from fastapi.testclient import TestClient

SERVER_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SERVER_ROOT))

from main import app

def test_api_routes():
    print("Testing FastAPI HTTP & WebSocket routes...")
    with TestClient(app) as client:
        # 1. Health check
        res = client.get("/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        data = res.json()
        print(f"[OK] Health check: {data}")
        assert data["status"] == "ok"
        assert data["gpu_available"] == False

        # 2. Get Models
        res = client.get("/models")
        assert res.status_code == 200
        models = res.json()
        print(f"[OK] Models endpoint returned {len(models)} model(s).")
        assert len(models) > 0
        model_id = models[0]["id"]

        # 3. Load Model
        res = client.post(f"/models/{model_id}/load")
        assert res.status_code == 200
        load_data = res.json()
        print(f"[OK] Load model response: {load_data}")
        assert load_data["loaded"] == True

        # 4. WebSocket Streaming Inference
        print("\nTesting WebSocket /ws/inference ...")
        with client.websocket_connect("/ws/inference") as websocket:
            websocket.send_text(json.dumps({
                "model_id": model_id,
                "messages": [
                    {"role": "user", "content": "Count from 1 to 3 in digits separated by comma."}
                ],
                "temperature": 0.2,
                "max_tokens": 16
            }))

            streamed_tokens = []
            final_stats = None

            while True:
                raw_msg = websocket.receive_text()
                chunk = json.loads(raw_msg)
                if chunk.get("token"):
                    streamed_tokens.append(chunk["token"])
                    print(chunk["token"], end="", flush=True)
                if chunk.get("finished"):
                    final_stats = chunk.get("stats")
                    print(f"\n[OK] Stream Finished! Stats: {final_stats}")
                    break

            assert len(streamed_tokens) > 0, "No tokens received from websocket"
            assert final_stats is not None, "No stats in final chunk"
            assert "tokens_per_sec" in final_stats

        # 5. Unload Model
        res = client.post(f"/models/{model_id}/unload")
        assert res.status_code == 200
        print(f"[OK] Model unloaded via API.")

    print("\n--- All FastAPI & WebSocket Tests Passed! ---")

if __name__ == "__main__":
    test_api_routes()
