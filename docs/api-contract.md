# NeurionForge AI Studio — API Contract & Specification

> **Host:** `http://localhost:8000` (FastAPI Server)
> **WebSocket:** `ws://localhost:8000`
> **Client Types Package:** `@neurionforge/shared-types`
>
> **IMPORTANT:** This is the canonical contract between `apps/web` and `apps/server`.
> Do not change a request/response shape in either app without updating this file first.
> When in doubt, this file wins.

---

## 1. System & Health

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

---

## 2. Inference Engine

### WebSocket: `/ws/inference`
Stream token-by-token completions with performance metrics.

#### Client sends (initial message)
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

#### Server streams (newline-delimited JSON)
```json
{ "token": "Local", "finished": false }
{ "token": " LLMs", "finished": false }
```

#### Server final chunk
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

## 3. Model Management

### `GET /models`
List available GGUF models scanned from `MODELS_DIR` (`D:/models`).

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

### `POST /models/scan`
Re-scan `MODELS_DIR` for GGUF files. Returns updated model list.

### `POST /models/{id}/load`
Load GGUF model into RAM/VRAM.
```json
{ "id": "qwen2.5-1.5b-instruct-q4_k_m.gguf", "loaded": true, "load_time_sec": 0.85 }
```

### `POST /models/{id}/unload`
Unload model and free memory.

### `DELETE /models/{id}`
Delete GGUF file from disk.

### `GET /models/pytorch` *(PLANNED — not yet implemented)*
List PyTorch / HuggingFace model folders downloaded to `D:/models/pytorch/`.

#### Response
```json
[
  {
    "id": "Qwen--Qwen2.5-1.5B-Instruct",
    "repo_id": "Qwen/Qwen2.5-1.5B-Instruct",
    "path": "D:/models/pytorch/Qwen--Qwen2.5-1.5B-Instruct",
    "size_gb": 3.1,
    "downloaded_at": "2026-08-19T20:00:00Z"
  }
]
```

---

## 4. HuggingFace Hub

### `GET /hub/search?q={query}&limit={n}`
Search HuggingFace Hub for model repos.

#### Response
```json
[
  {
    "id": "Qwen/Qwen2.5-1.5B-Instruct",
    "name": "Qwen2.5-1.5B-Instruct",
    "downloads": 150000,
    "likes": 800,
    "tags": ["text-generation", "pytorch"],
    "has_gguf": true
  }
]
```

### `GET /hub/files?repo_id={repo_id}`
List GGUF files available in a specific HuggingFace repo.

#### Response
```json
[
  {
    "filename": "qwen2.5-1.5b-instruct-q4_k_m.gguf",
    "size_bytes": 1200000000,
    "quantization": "Q4_K_M"
  }
]
```

### `GET /hub/pytorch-files?repo_id={repo_id}` *(PLANNED — not yet implemented)*
List PyTorch weight files available in a HuggingFace repo (for fine-tuning downloads).

---

## 5. Downloads

### `GET /downloads`
List all download jobs (active, queued, completed, cancelled, failed).

#### Response
```json
[
  {
    "job_id": "dl_abc123",
    "repo_id": "Qwen/Qwen2.5-1.5B-Instruct",
    "filename": "qwen2.5-1.5b-instruct-q4_k_m.gguf",
    "rfilename": "qwen2.5-1.5b-instruct-q4_k_m.gguf",
    "status": "running",
    "bytes_downloaded": 500000000,
    "total_bytes": 1200000000,
    "percent": 41.7,
    "speed_mbps": 8.2,
    "eta_sec": 85
  }
]
```

### `POST /downloads/start`
Start a download job. Currently supports GGUF files only.
**PLANNED:** Extend to support `model_type: "gguf" | "pytorch"` and custom `dest_path`.

#### Request
```json
{
  "repo_id": "Qwen/Qwen2.5-1.5B-Instruct",
  "filename": "qwen2.5-1.5b-instruct-q4_k_m.gguf",
  "rfilename": "qwen2.5-1.5b-instruct-q4_k_m.gguf"
}
```

#### Future request shape (PLANNED)
```json
{
  "repo_id": "Qwen/Qwen2.5-1.5B-Instruct",
  "filename": "qwen2.5-1.5b-instruct-q4_k_m.gguf",
  "model_type": "gguf",
  "dest_path": "D:/models/"
}
```

#### Response
```json
{ "job_id": "dl_abc123", "status": "queued" }
```

### `POST /downloads/{job_id}/cancel`
Cancel an active download.

### `DELETE /downloads/{job_id}`
Remove a completed/cancelled download job from history.

### WebSocket: `/downloads/ws/{job_id}`
Stream download progress events for a specific job. Emits the same `DownloadJob` shape as `GET /downloads` items.

---

## 6. Fine-Tuning & Adapters

### `GET /finetune/jobs`
List all training jobs.

### `POST /finetune/jobs`
Start a LoRA/QLoRA training job.

#### Request
```json
{
  "base_model_id": "Qwen/Qwen2.5-1.5B-Instruct",
  "dataset_id": "my-dataset-id",
  "adapter_name": "qwen-neurion-lora-v1",
  "lora_rank": 16,
  "lora_alpha": 32,
  "learning_rate": 0.0002,
  "epochs": 3,
  "batch_size": 2
}
```

#### Response
```json
{ "status": "queued", "job": { "job_id": "job_abc123", "status": "queued", ... } }
```

### `GET /finetune/jobs/{job_id}`
Get a single training job.

### `POST /finetune/jobs/{job_id}/cancel`
Cancel a running job.

### `DELETE /finetune/jobs/{job_id}`
Delete a job record.

### WebSocket: `/finetune/ws/{job_id}`
Stream training progress (step, loss, epoch, status).

#### Server messages
```json
{
  "job_id": "job_abc123",
  "step": 12,
  "total_steps": 30,
  "epoch": 1.2,
  "loss": 0.4512,
  "elapsed_sec": 45.2,
  "status": "running"
}
```

---

## 7. Adapters

### `GET /adapters`
List saved LoRA adapters.

#### Response
```json
[
  {
    "id": "qwen-neurion-lora-v1",
    "name": "qwen-neurion-lora-v1",
    "base_model_id": "Qwen/Qwen2.5-1.5B-Instruct",
    "path": "apps/server/adapters/qwen-neurion-lora-v1",
    "created_at": "2026-08-19T20:00:00Z",
    "size_mb": 18.4,
    "status": "completed"
  }
]
```

### `GET /adapters/{id}`
Get a single adapter.

### `DELETE /adapters/{id}`
Delete adapter from disk.

### `POST /adapters/{id}/test-chat`
Test-chat with base model + adapter loaded.

#### Request
```json
{
  "messages": [{ "role": "user", "content": "Hello!" }],
  "max_tokens": 128,
  "temperature": 0.7
}
```

---

## 8. Datasets

### `GET /datasets`
List uploaded datasets.

### `POST /datasets/upload`
Upload a JSONL dataset.
```json
{ "name": "my-dataset", "content": "jsonl string..." }
```

### `POST /datasets/validate`
Validate JSONL format before training.
```json
{ "content": "jsonl string..." }
```

### `GET /datasets/{id}`
Get a single dataset.

### `DELETE /datasets/{id}`
Delete a dataset.

---

## 9. Conversion (PyTorch ? GGUF)

### `POST /convert/to-gguf`
Start a PyTorch ? GGUF conversion job.

#### Request
```json
{
  "base_model_id": "Qwen/Qwen2.5-1.5B-Instruct",
  "adapter_id": "qwen-neurion-lora-v1",
  "quantization": "Q4_K_M",
  "output_name": "qwen-neurion-lora-v1-q4.gguf"
}
```
`adapter_id` is optional — omit to convert the base model without a LoRA adapter.

#### Response
```json
{ "status": "queued", "job": { "job_id": "conv_abc123", ... } }
```

### `GET /convert/jobs`
List all conversion jobs.

### `GET /convert/jobs/{job_id}`
Get a single conversion job status.

### `POST /convert/pytorch/download`
*(Legacy — being removed. Use `/downloads/start` with `model_type: "pytorch"` instead.)*

### `POST /convert/pytorch/cancel/{job_id}`
Cancel a PyTorch download started via the legacy endpoint.
