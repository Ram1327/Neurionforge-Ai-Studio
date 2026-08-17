# NeurionForge AI Studio — API Contract & Specification

> **Host:** `http://localhost:8000` (FastAPI Server)  
> **WebSocket:** `ws://localhost:8000/ws`  
> **Client Types Package:** `@neurionforge/shared-types`

---

## 1. Inference Engine

### WebSocket: `/ws/inference`
Stream token-by-token completions with streaming performance metrics.

#### Client Request (Initial message)
```json
{
  "model_id": "qwen2.5-1.5b-instruct-q4_k_m.gguf",
  "messages": [
    { "role": "system", "content": "You are NeurionForge AI Assistant." },
    { "role": "user", "content": "How do local LLMs work?" }
  ],
  "temperature": 0.7,
  "top_p": 0.9,
  "max_tokens": 512
}
```

#### Server Streaming Responses
```json
{ "token": "Local", "finished": false }
{ "token": " LLMs", "finished": false }
{ "token": " execute", "finished": false }
```

#### Server Final Chunk
```json
{
  "token": "",
  "finished": true,
  "stats": {
    "tokens_per_sec": 44.5,
    "ttft_ms": 185.2,
    "total_tokens": 128,
    "total_duration_sec": 2.87
  }
}
```

---

## 2. Model Management

### `GET /models`
List available models in `MODELS_DIR` (e.g. `D:/models`).

#### Response
```json
[
  {
    "id": "qwen2.5-1.5b-instruct-q4_k_m.gguf",
    "name": "Qwen 2.5 1.5B Instruct",
    "filename": "qwen2.5-1.5b-instruct-q4_k_m.gguf",
    "path": "D:/models/qwen2.5-1.5b-instruct-q4_k_m.gguf",
    "size_gb": 1.12,
    "quantization": "Q4_K_M",
    "context_length": 4096,
    "loaded": false
  }
]
```

### `POST /models/{id}/load`
Load model into RAM/VRAM cache.

#### Response
```json
{
  "id": "qwen2.5-1.5b-instruct-q4_k_m.gguf",
  "loaded": true,
  "load_time_sec": 0.85
}
```

### `POST /models/{id}/unload`
Unload currently loaded model and free memory.

#### Response
```json
{
  "id": "qwen2.5-1.5b-instruct-q4_k_m.gguf",
  "loaded": false,
  "load_time_sec": 0.0
}
```

---

## 3. Fine-Tuning & Adapter Management

### `POST /jobs/train`
Start a LoRA/QLoRA training job in the background.

#### Request
```json
{
  "base_model_id": "Qwen/Qwen2.5-1.5B-Instruct",
  "dataset_id": "toy_dataset.jsonl",
  "adapter_name": "qwen-1.5b-neurionforge-v0",
  "lora_rank": 8,
  "lora_alpha": 16,
  "learning_rate": 0.0002,
  "epochs": 3,
  "batch_size": 2
}
```

#### Response
```json
{
  "job_id": "job_01j7h8k9",
  "status": "queued",
  "created_at": "2026-08-16T22:30:00Z"
}
```

### WebSocket: `/ws/jobs/{job_id}/logs`
Stream training progress, epoch step, and loss metrics.

#### Server Messages
```json
{
  "job_id": "job_01j7h8k9",
  "step": 12,
  "total_steps": 30,
  "epoch": 1.2,
  "loss": 0.4512,
  "elapsed_sec": 45.2,
  "status": "running"
}
```

### `GET /adapters`
List saved LoRA adapters.

#### Response
```json
[
  {
    "id": "qwen-1.5b-neurionforge-v0",
    "name": "qwen-1.5b-neurionforge-v0",
    "base_model_id": "Qwen/Qwen2.5-1.5B-Instruct",
    "path": "apps/server/adapters/qwen-1.5b-neurionforge-v0",
    "created_at": "2026-08-16T22:45:00Z",
    "size_mb": 18.4
  }
]
```

---

## 4. System & Health

### `GET /health`
System diagnostics and hardware report.

#### Response
```json
{
  "status": "ok",
  "models_dir": "D:/models",
  "active_model": null,
  "cpu_threads": 8,
  "gpu_available": false
}
```
