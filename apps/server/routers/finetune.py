import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from services.finetune_service import finetune_service

router = APIRouter(prefix="/finetune", tags=["finetune"])

class StartTrainingRequest(BaseModel):
    base_model_id: str = Field(default="Qwen/Qwen2.5-1.5B-Instruct")
    dataset_id: str
    adapter_name: str = Field(..., min_length=1, max_length=64)
    lora_rank: int = Field(default=16, ge=4, le=128)
    lora_alpha: int = Field(default=32, ge=8, le=256)
    learning_rate: float = Field(default=2e-4, ge=1e-6, le=1e-2)
    epochs: int = Field(default=3, ge=1, le=20)
    batch_size: int = Field(default=1, ge=1, le=8)
    target_modules: Optional[List[str]] = Field(default=["q_proj", "v_proj"])

@router.get("/jobs", response_model=List[Dict[str, Any]])
async def list_jobs():
    """List all fine-tuning training jobs"""
    return await finetune_service.list_jobs()

@router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    """Retrieve details for a specific training job"""
    job = await finetune_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Training job not found")
    return job

@router.post("/jobs")
async def start_job(payload: StartTrainingRequest):
    """Start a new LoRA fine-tuning background job"""
    try:
        job = await finetune_service.start_training_job(
            base_model_id=payload.base_model_id,
            dataset_id=payload.dataset_id,
            adapter_name=payload.adapter_name,
            lora_rank=payload.lora_rank,
            lora_alpha=payload.lora_alpha,
            learning_rate=payload.learning_rate,
            epochs=payload.epochs,
            batch_size=payload.batch_size,
            target_modules=payload.target_modules
        )
        return {"status": "started", "job": job}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        msg = str(e)
        if msg.startswith("MODEL_NOT_DOWNLOADED::"):
            parts = msg.split("::", 2)
            repo_id = parts[1] if len(parts) > 1 else payload.base_model_id
            raise HTTPException(
                status_code=409,
                detail={
                    "needs_download": True,
                    "repo_id": repo_id,
                    "message": parts[2] if len(parts) > 2 else msg,
                }
            )
        raise HTTPException(status_code=400, detail=msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start training job: {str(e)}")

@router.post("/jobs/{job_id}/cancel")
async def cancel_job(job_id: str):
    """Cancel an active or queued training job"""
    return await finetune_service.cancel_training_job(job_id)

@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    """Delete a training job record and cancel if running"""
    return await finetune_service.delete_job(job_id)

@router.websocket("/ws/{job_id}")
async def websocket_training_logs(websocket: WebSocket, job_id: str):
    """WebSocket stream for real-time training step logs, loss metrics, and status"""
    await websocket.accept()

    active = finetune_service.get_or_create_active_job(job_id)
    log_queue = asyncio.Queue()
    active.log_queues.add(log_queue)

    try:
        # First send replay of historical logs for this job
        for past_log in active.log_history:
            await websocket.send_text(json.dumps(past_log))

        # Stream new incoming logs
        while True:
            log_payload = await log_queue.get()
            await websocket.send_text(json.dumps(log_payload))

            if log_payload.get("status") in ("completed", "failed", "cancelled"):
                # Job reached terminal state
                break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_text(json.dumps({
                "job_id": job_id,
                "status": "error",
                "message": f"WebSocket log streaming error: {str(e)}"
            }))
        except Exception:
            pass
    finally:
        active.log_queues.discard(log_queue)
