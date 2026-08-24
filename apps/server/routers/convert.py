"""
Phase 3: Convert Router
POST /convert/to-gguf      — start a conversion job
GET  /convert/jobs         — list all conversion jobs
GET  /convert/jobs/{id}    — get one job
WS   /convert/ws/{job_id} — real-time progress stream
POST /convert/pytorch/download — download a HF model to D:/models/pytorch/
"""
import json
import asyncio
from typing import Optional

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from services.convert_service import convert_service
from services.pytorch_download_service import pytorch_download_service

router = APIRouter(prefix="/convert", tags=["convert"])


# ─── Request Models ─────────────────────────────────────────────────────────

class ConvertRequest(BaseModel):
    model_id: str                         # 'pytorch::qwen2.5-0.5b-instruct' or folder name
    quantization: str = "Q4_K_M"         # Q4_K_M | Q8_0 | F16
    adapter_id: Optional[str] = None     # optional LoRA adapter to merge in

class PytorchDownloadRequest(BaseModel):
    repo_id: str                          # HuggingFace repo id e.g. 'Qwen/Qwen2.5-0.5B-Instruct'


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/to-gguf")
async def start_conversion(payload: ConvertRequest):
    """Start a GGUF conversion job (with optional LoRA merge)"""
    try:
        job = await convert_service.start_conversion(
            model_id=payload.model_id,
            quantization=payload.quantization,
            adapter_id=payload.adapter_id,
        )
        return {"status": "queued", "job": job}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed to start: {e}")


@router.get("/jobs")
async def list_convert_jobs():
    """List all conversion jobs"""
    return await convert_service.list_jobs()


@router.get("/jobs/{job_id}")
async def get_convert_job(job_id: str):
    """Get status of a specific conversion job"""
    job = await convert_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Convert job {job_id} not found")
    return job


@router.post("/pytorch/download")
async def download_pytorch_model(payload: PytorchDownloadRequest):
    """Download a HuggingFace PyTorch model to D:/models/pytorch/"""
    try:
        job_id = await pytorch_download_service.enqueue_download(payload.repo_id)
        return {
            "job_id": job_id,
            "status": "queued",
            "message": f"Downloading {payload.repo_id} to D:/models/pytorch/"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start download: {e}")


@router.post("/pytorch/cancel/{job_id}")
async def cancel_pytorch_download(job_id: str):
    """Cancel an active PyTorch model download"""
    success = await pytorch_download_service.cancel_download(job_id)
    return {"job_id": job_id, "cancelled": success}


# ─── WebSocket: Conversion Progress ─────────────────────────────────────────

@router.websocket("/ws/{job_id}")
async def websocket_convert_progress(websocket: WebSocket, job_id: str):
    """Real-time progress stream for an active conversion job"""
    await websocket.accept()
    queue: asyncio.Queue = asyncio.Queue()

    # Register listener on the active job
    active = convert_service.active_jobs.get(job_id)
    if active:
        active.log_queues.add(queue)
        # Replay history
        for evt in active.log_history:
            await queue.put(evt)
    else:
        # Job already finished — send DB state and close
        job = await convert_service.get_job(job_id)
        if job:
            await websocket.send_text(json.dumps({
                "job_id": job_id,
                "step": job.get("step", ""),
                "progress": job.get("progress", 0.0),
                "status": job.get("status", "unknown"),
                "elapsed_sec": 0,
            }))
        await websocket.close()
        return

    try:
        while True:
            payload = await queue.get()
            await websocket.send_text(json.dumps(payload))
            if payload.get("status") in ("done", "failed", "cancelled"):
                break
    except WebSocketDisconnect:
        pass
    finally:
        if active:
            active.log_queues.discard(queue)


# ─── WebSocket: PyTorch Download Progress (reuses existing /downloads/ws pattern) ─

@router.websocket("/pytorch/ws/{job_id}")
async def websocket_pytorch_download(websocket: WebSocket, job_id: str):
    """Real-time progress for a PyTorch model download"""
    await websocket.accept()
    queue: asyncio.Queue = asyncio.Queue()
    await pytorch_download_service.subscribe(job_id, queue)

    try:
        while True:
            data = await queue.get()
            await websocket.send_text(json.dumps(data))
            if data.get("status") in ("done", "failed", "cancelled"):
                break
    except WebSocketDisconnect:
        pass
    finally:
        await pytorch_download_service.unsubscribe(job_id, queue)
