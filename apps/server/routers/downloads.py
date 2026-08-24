"""
NeurionForge AI Studio — Downloads Router
Handles GGUF download job management and real-time WebSocket progress streaming.
"""
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
    """Start or enqueue a GGUF model download from HuggingFace Hub."""
    try:
        job_id = await download_service.enqueue_download(
            repo_id=payload.repo_id,
            filename=payload.filename,
            rfilename=payload.rfilename,
        )
        return {
            "job_id": job_id,
            "status": "queued",
            "message": f"Download initiated for {payload.filename}",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start download: {str(e)}")


def _enrich_job(job: Dict[str, Any]) -> Dict[str, Any]:
    """Add a computed `percent` field to a DB job record."""
    total = job.get("total_bytes") or 0
    downloaded = job.get("bytes_downloaded") or 0
    status = job.get("status")
    if status == "done":
        pct = 100.0
    elif total > 0:
        pct = round(downloaded / total * 100, 1)
    else:
        pct = 0.0
    return {**job, "percent": pct}


@router.get("", response_model=List[Dict[str, Any]])
async def get_all_downloads():
    """List recent and active download jobs."""
    jobs = await list_download_jobs()
    return [_enrich_job(j) for j in jobs]


@router.get("/{job_id}")
async def get_single_download(job_id: str):
    """Get the current status of a specific download job."""
    job = await get_download_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Download job '{job_id}' not found")
    return _enrich_job(job)


@router.post("/{job_id}/cancel")
async def cancel_download_job(job_id: str):
    """Cancel an active or queued download job."""
    success = await download_service.cancel_download(job_id)
    return {"job_id": job_id, "cancelled": success}


@router.delete("/{job_id}")
async def delete_download_job(job_id: str):
    """Remove a download job record and clean up partial/temp files (preserving completed models)."""
    import shutil
    from pathlib import Path
    from services.model_service import MODELS_DIR, model_service

    job = await get_download_job(job_id)
    if not job:
        return {"job_id": job_id, "deleted": True}

    is_already_done = (job.get("status") == "done")

    # Only cancel if NOT already done
    if not is_already_done:
        await download_service.cancel_download(job_id)
        try:
            from services.pytorch_download_service import pytorch_download_service
            await pytorch_download_service.cancel_download(job_id)
        except Exception:
            pass

        # Clean up partial / temp files
        dest_path = job.get("dest_path")
        if dest_path:
            p = Path(dest_path)
            try:
                if p.is_dir():
                    shutil.rmtree(str(p), ignore_errors=True)
                elif p.exists():
                    p.unlink(missing_ok=True)
            except Exception:
                pass

        # .part file (legacy)
        part = Path(f"{dest_path}.part") if dest_path else None
        if part and part.exists():
            part.unlink(missing_ok=True)

        # PyTorch temp dir
        tmp_pt = Path(MODELS_DIR) / "pytorch" / f".tmp_{job_id}"
        if tmp_pt.exists():
            shutil.rmtree(str(tmp_pt), ignore_errors=True)

    await delete_download_job_record(job_id)
    await model_service.scan_models()
    return {"job_id": job_id, "deleted": True}



@router.websocket("/ws/{job_id}")
async def websocket_download_progress(websocket: WebSocket, job_id: str):
    """
    WebSocket endpoint that streams real-time download progress for a job.
    Sends JSON messages with status, percent, speed_mbps, eta_sec, etc.
    Closes automatically when the job reaches a terminal state (done/failed/cancelled).
    """
    await websocket.accept()
    queue: asyncio.Queue = asyncio.Queue()
    await download_service.subscribe(job_id, queue)

    try:
        while True:
            try:
                # Use a timeout so we can send periodic heartbeats and detect dead clients
                state_data = await asyncio.wait_for(queue.get(), timeout=15.0)
            except asyncio.TimeoutError:
                # Send a heartbeat ping to keep the connection alive
                try:
                    await websocket.send_text(json.dumps({"type": "heartbeat", "job_id": job_id}))
                except Exception:
                    break
                continue

            try:
                await websocket.send_text(json.dumps(state_data))
            except Exception:
                # Client disconnected
                break

            # Close once we reach a terminal state
            if state_data.get("status") in ("done", "failed", "cancelled"):
                break

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await download_service.unsubscribe(job_id, queue)
