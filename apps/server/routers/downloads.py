import json
import asyncio
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from services.download_service import download_service
from db import list_download_jobs, get_download_job, delete_download_job_record

router = APIRouter(prefix="/downloads", tags=["downloads"])

class StartDownloadPayload(BaseModel):
    repo_id: str
    filename: str
    rfilename: Optional[str] = None

@router.post("/start")
async def start_download(payload: StartDownloadPayload):
    """Start or enqueue a GGUF model download"""
    try:
        job_id = await download_service.enqueue_download(
            repo_id=payload.repo_id,
            filename=payload.filename,
            rfilename=payload.rfilename
        )
        return {
            "job_id": job_id,
            "status": "queued",
            "message": f"Download initiated for {payload.filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start download: {str(e)}")

@router.get("", response_model=List[Dict[str, Any]])
async def get_all_downloads():
    """List recent and active download jobs"""
    return await list_download_jobs()

@router.get("/{job_id}")
async def get_single_download(job_id: str):
    """Get status of a specific download job"""
    job = await get_download_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Download job {job_id} not found")
    return job

@router.post("/{job_id}/cancel")
async def cancel_download_job(job_id: str):
    """Cancel an active or queued download job"""
    success = await download_service.cancel_download(job_id)
    return {"job_id": job_id, "cancelled": success}

@router.delete("/{job_id}")
async def delete_download_job(job_id: str):
    """Remove a download job record from history"""
    await download_service.cancel_download(job_id)
    await delete_download_job_record(job_id)
    return {"job_id": job_id, "deleted": True}

@router.websocket("/ws/{job_id}")
async def websocket_download_progress(websocket: WebSocket, job_id: str):
    """WebSocket stream for real-time download progress, speed, and ETA"""
    await websocket.accept()
    queue = asyncio.Queue()
    await download_service.subscribe(job_id, queue)

    try:
        while True:
            # Wait for next state broadcast
            state_data = await queue.get()
            await websocket.send_text(json.dumps(state_data))

            # If job reached terminal state, stay open for final chunk then end
            if state_data.get("status") in ["done", "failed", "cancelled"]:
                break
    except WebSocketDisconnect:
        pass
    finally:
        await download_service.unsubscribe(job_id, queue)
