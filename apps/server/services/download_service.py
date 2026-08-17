import os
import time
import uuid
import asyncio
import requests
from pathlib import Path
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass
from huggingface_hub import hf_hub_url

from db import create_download_job, update_download_job, get_download_job, list_download_jobs
from services.model_service import MODELS_DIR, model_service

@dataclass
class DownloadState:
    job_id: str
    repo_id: str
    filename: str
    rfilename: str
    dest_path: str
    status: str
    bytes_downloaded: int = 0
    total_bytes: int = 0
    percent: float = 0.0
    speed_mbps: float = 0.0
    eta_sec: Optional[int] = None
    error: Optional[str] = None
    is_cancelled: bool = False

class DownloadService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DownloadService, cls).__new__(cls)
            cls._instance.active_job: Optional[DownloadState] = None
            cls._instance.job_queue: asyncio.Queue = asyncio.Queue()
            cls._instance.subscribers: Dict[str, Set[asyncio.Queue]] = {}
            cls._instance.worker_task: Optional[asyncio.Task] = None
            cls._instance.is_running = False
        return cls._instance

    def start_worker(self):
        if not self.is_running:
            self.is_running = True
            self.worker_task = asyncio.create_task(self._process_queue())

    async def subscribe(self, job_id: str, queue: asyncio.Queue):
        if job_id not in self.subscribers:
            self.subscribers[job_id] = set()
        self.subscribers[job_id].add(queue)

        # Send current state immediately if available
        if self.active_job and self.active_job.job_id == job_id:
            await queue.put(self._serialize_state(self.active_job))
        else:
            db_job = await get_download_job(job_id)
            if db_job:
                total = db_job.get("total_bytes") or 0
                downloaded = db_job.get("bytes_downloaded") or 0
                status = db_job.get("status")
                pct = 100.0 if status == "done" else (round((downloaded / total * 100), 1) if total > 0 else 0.0)
                await queue.put({
                    "job_id": job_id,
                    "repo_id": db_job.get("repo_id"),
                    "filename": db_job.get("filename"),
                    "status": status,
                    "bytes_downloaded": downloaded,
                    "total_bytes": total,
                    "percent": pct,
                    "speed_mbps": db_job.get("speed_mbps") or 0.0,
                    "eta_sec": db_job.get("eta_sec"),
                    "error": db_job.get("error")
                })

    async def unsubscribe(self, job_id: str, queue: asyncio.Queue):
        if job_id in self.subscribers:
            self.subscribers[job_id].discard(queue)
            if not self.subscribers[job_id]:
                del self.subscribers[job_id]

    async def _broadcast(self, state: DownloadState):
        payload = self._serialize_state(state)
        queues = self.subscribers.get(state.job_id, set())
        for q in list(queues):
            try:
                q.put_nowait(payload)
            except Exception:
                pass

    def _serialize_state(self, s: DownloadState) -> Dict[str, Any]:
        pct = 100.0 if s.status == "done" else round(s.percent, 1)
        return {
            "job_id": s.job_id,
            "repo_id": s.repo_id,
            "filename": s.filename,
            "status": s.status,
            "bytes_downloaded": s.bytes_downloaded,
            "total_bytes": s.total_bytes,
            "percent": pct,
            "speed_mbps": round(s.speed_mbps, 2),
            "eta_sec": s.eta_sec,
            "error": s.error
        }

    async def enqueue_download(self, repo_id: str, filename: str, rfilename: Optional[str] = None) -> str:
        """Enqueue a new GGUF download job"""
        models_dir = Path(MODELS_DIR)
        models_dir.mkdir(parents=True, exist_ok=True)
        
        clean_filename = Path(filename).name
        target_rfilename = rfilename or filename
        dest_path = str(models_dir / clean_filename)

        # Check if already completed
        if Path(dest_path).exists() and Path(dest_path).stat().st_size > 0:
            job_id = f"job_{uuid.uuid4().hex[:8]}"
            size = Path(dest_path).stat().st_size
            await create_download_job({
                "job_id": job_id,
                "repo_id": repo_id,
                "filename": clean_filename,
                "dest_path": dest_path,
                "status": "done",
                "bytes_downloaded": size,
                "total_bytes": size,
            })
            return job_id

        # Check if currently active or already queued
        if self.active_job and self.active_job.repo_id == repo_id and self.active_job.filename == clean_filename:
            return self.active_job.job_id

        job_id = f"job_{uuid.uuid4().hex[:8]}"
        state = DownloadState(
            job_id=job_id,
            repo_id=repo_id,
            filename=clean_filename,
            rfilename=target_rfilename,
            dest_path=dest_path,
            status="queued"
        )

        await create_download_job({
            "job_id": job_id,
            "repo_id": repo_id,
            "filename": clean_filename,
            "dest_path": dest_path,
            "status": "queued",
            "bytes_downloaded": 0,
            "total_bytes": 0
        })

        await self.job_queue.put(state)
        return job_id

    async def cancel_download(self, job_id: str) -> bool:
        """Cancel an active or queued download job"""
        if self.active_job and self.active_job.job_id == job_id:
            self.active_job.is_cancelled = True
            self.active_job.status = "cancelled"
            await update_download_job(job_id, status="cancelled")
            await self._broadcast(self.active_job)
            return True

        job = await get_download_job(job_id)
        if job and job["status"] in ["queued", "running"]:
            await update_download_job(job_id, status="cancelled")
            return True

        return False

    async def _process_queue(self):
        """Worker loop executing downloads sequentially"""
        while self.is_running:
            state: DownloadState = await self.job_queue.get()
            if state.is_cancelled:
                self.job_queue.task_done()
                continue

            self.active_job = state
            state.status = "running"
            await update_download_job(state.job_id, status="running")
            await self._broadcast(state)

            loop = asyncio.get_running_loop()
            try:
                await loop.run_in_executor(None, self._execute_download_sync, state)
            except Exception as e:
                print(f"[ERROR] Download execution failed for {state.filename}: {e}")
                state.status = "failed"
                state.error = str(e)
                await update_download_job(state.job_id, status="failed", error=str(e))
                await self._broadcast(state)

            self.active_job = None
            self.job_queue.task_done()

    def _execute_download_sync(self, state: DownloadState):
        """Synchronous download execution with HTTP range resumption and LFS redirect support"""
        try:
            url = hf_hub_url(state.repo_id, state.rfilename)
        except Exception:
            url = f"https://huggingface.co/{state.repo_id}/resolve/main/{state.rfilename}"

        part_path = Path(f"{state.dest_path}.part")
        final_path = Path(state.dest_path)

        existing_bytes = part_path.stat().st_size if part_path.exists() else 0
        headers = {
            "User-Agent": "NeurionForge-AI-Studio/1.0",
        }
        if existing_bytes > 0:
            headers["Range"] = f"bytes={existing_bytes}-"

        try:
            with requests.get(url, headers=headers, stream=True, timeout=30, allow_redirects=True) as resp:
                if resp.status_code == 416:
                    # Requested Range Not Satisfiable -> file might already be complete
                    part_path.rename(final_path)
                    state.status = "done"
                    state.percent = 100.0
                    state.bytes_downloaded = existing_bytes
                    state.total_bytes = existing_bytes
                    asyncio.run(update_download_job(state.job_id, status="done", bytes_downloaded=existing_bytes, total_bytes=existing_bytes))
                    asyncio.run(self._broadcast(state))
                    asyncio.run(model_service.scan_models())
                    return

                resp.raise_for_status()

                # Determine total size
                content_range = resp.headers.get("Content-Range")
                if content_range:
                    total_bytes = int(content_range.split("/")[-1])
                else:
                    content_length = int(resp.headers.get("Content-Length", 0))
                    total_bytes = existing_bytes + content_length

                state.total_bytes = total_bytes
                state.bytes_downloaded = existing_bytes

                file_mode = "ab" if existing_bytes > 0 and resp.status_code == 206 else "wb"
                if file_mode == "wb":
                    state.bytes_downloaded = 0

                start_time = time.time()
                last_update_time = start_time
                bytes_since_last = 0

                with open(part_path, file_mode) as f:
                    for chunk in resp.iter_content(chunk_size=512 * 1024):
                        if state.is_cancelled:
                            break

                        if chunk:
                            f.write(chunk)
                            chunk_len = len(chunk)
                            state.bytes_downloaded += chunk_len
                            bytes_since_last += chunk_len

                            now = time.time()
                            if now - last_update_time >= 0.4:
                                dt = now - last_update_time
                                speed_bps = bytes_since_last / dt if dt > 0 else 0
                                state.speed_mbps = speed_bps / (1024 * 1024)

                                if total_bytes > 0:
                                    state.percent = min(99.9, (state.bytes_downloaded / total_bytes) * 100)
                                    remaining_bytes = max(0, total_bytes - state.bytes_downloaded)
                                    state.eta_sec = int(remaining_bytes / speed_bps) if speed_bps > 0 else None

                                last_update_time = now
                                bytes_since_last = 0

                                asyncio.run(self._broadcast(state))

                if state.is_cancelled:
                    state.status = "cancelled"
                    asyncio.run(update_download_job(
                        state.job_id,
                        status="cancelled",
                        bytes_downloaded=state.bytes_downloaded,
                        total_bytes=state.total_bytes
                    ))
                    asyncio.run(self._broadcast(state))
                    return

                # Download finished successfully
                if part_path.exists():
                    if final_path.exists():
                        final_path.unlink()
                    part_path.rename(final_path)

                state.status = "done"
                state.percent = 100.0
                state.bytes_downloaded = state.total_bytes
                state.eta_sec = 0
                state.speed_mbps = 0.0

                asyncio.run(update_download_job(
                    state.job_id,
                    status="done",
                    bytes_downloaded=state.total_bytes,
                    total_bytes=state.total_bytes
                ))
                asyncio.run(self._broadcast(state))
                # Trigger model scan so it immediately becomes available to load
                asyncio.run(model_service.scan_models())

        except Exception as e:
            if not state.is_cancelled:
                state.status = "failed"
                state.error = str(e)
                asyncio.run(update_download_job(state.job_id, status="failed", error=str(e)))
                asyncio.run(self._broadcast(state))
                raise

download_service = DownloadService()
