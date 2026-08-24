"""
Phase 3: PyTorch HuggingFace Model Downloader
Downloads full HF model repos (safetensors + tokenizer) into D:/models/pytorch/<folder>/
Uses the same job/progress/broadcast pattern as download_service.py so the
frontend DownloadProgressCard works identically.
"""
import os
import time
import uuid
import asyncio
import threading
from pathlib import Path
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass, field

from db import create_download_job, update_download_job, get_download_job
from services.model_service import MODELS_DIR, model_service


PYTORCH_DIR = Path(MODELS_DIR) / "pytorch"


@dataclass
class PytorchDownloadState:
    job_id: str
    repo_id: str
    folder_name: str
    dest_path: str
    status: str
    bytes_downloaded: int = 0
    total_bytes: int = 0
    percent: float = 0.0
    speed_mbps: float = 0.0
    eta_sec: Optional[int] = None
    error: Optional[str] = None
    is_cancelled: bool = False


class PytorchDownloadService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PytorchDownloadService, cls).__new__(cls)
            cls._instance.active_job: Optional[PytorchDownloadState] = None
            cls._instance.subscribers: Dict[str, Set[asyncio.Queue]] = {}
            cls._instance._lock = threading.Lock()
        return cls._instance

    async def subscribe(self, job_id: str, queue: asyncio.Queue):
        if job_id not in self.subscribers:
            self.subscribers[job_id] = set()
        self.subscribers[job_id].add(queue)
        # Send current snapshot immediately
        db_job = await get_download_job(job_id)
        if db_job:
            await queue.put(self._db_to_payload(db_job))

    async def unsubscribe(self, job_id: str, queue: asyncio.Queue):
        if job_id in self.subscribers:
            self.subscribers[job_id].discard(queue)

    def _db_to_payload(self, db_job: Dict[str, Any]) -> Dict[str, Any]:
        total = db_job.get("total_bytes") or 0
        downloaded = db_job.get("bytes_downloaded") or 0
        status = db_job.get("status", "queued")
        pct = 100.0 if status == "done" else (round(downloaded / total * 100, 1) if total > 0 else 0.0)
        return {
            "job_id": db_job["job_id"],
            "repo_id": db_job.get("repo_id", ""),
            "filename": db_job.get("filename", ""),
            "status": status,
            "bytes_downloaded": downloaded,
            "total_bytes": total,
            "percent": pct,
            "speed_mbps": db_job.get("speed_mbps") or 0.0,
            "eta_sec": db_job.get("eta_sec"),
            "error": db_job.get("error"),
        }

    def _broadcast_sync(self, state: PytorchDownloadState, loop: asyncio.AbstractEventLoop):
        payload = {
            "job_id": state.job_id,
            "repo_id": state.repo_id,
            "filename": state.folder_name,
            "status": state.status,
            "bytes_downloaded": state.bytes_downloaded,
            "total_bytes": state.total_bytes,
            "percent": round(state.percent, 1),
            "speed_mbps": round(state.speed_mbps, 2),
            "eta_sec": state.eta_sec,
            "error": state.error,
        }
        queues = self.subscribers.get(state.job_id, set())
        for q in list(queues):
            loop.call_soon_threadsafe(q.put_nowait, payload)

    async def enqueue_download(self, repo_id: str) -> str:
        """Enqueue a HuggingFace PyTorch model download to D:/models/pytorch/"""
        PYTORCH_DIR.mkdir(parents=True, exist_ok=True)
        folder_name = repo_id.split("/")[-1]
        dest_path = str(PYTORCH_DIR / folder_name)

        # Already downloaded?
        if Path(dest_path).exists() and (Path(dest_path) / "config.json").exists():
            job_id = f"pt_{uuid.uuid4().hex[:8]}"
            await create_download_job({
                "job_id": job_id,
                "repo_id": repo_id,
                "filename": folder_name,
                "dest_path": dest_path,
                "status": "done",
                "bytes_downloaded": 0,
                "total_bytes": 0,
            })
            return job_id

        # Currently active?
        with self._lock:
            if self.active_job and self.active_job.repo_id == repo_id:
                return self.active_job.job_id

        job_id = f"pt_{uuid.uuid4().hex[:8]}"
        state = PytorchDownloadState(
            job_id=job_id,
            repo_id=repo_id,
            folder_name=folder_name,
            dest_path=dest_path,
            status="queued",
        )

        await create_download_job({
            "job_id": job_id,
            "repo_id": repo_id,
            "filename": folder_name,
            "dest_path": dest_path,
            "status": "queued",
            "bytes_downloaded": 0,
            "total_bytes": 0,
        })

        loop = asyncio.get_running_loop()
        threading.Thread(
            target=self._run_download,
            args=(state, loop),
            daemon=True
        ).start()

        return job_id

    def _run_download(self, state: PytorchDownloadState, loop: asyncio.AbstractEventLoop):
        with self._lock:
            self.active_job = state

        state.status = "running"
        asyncio.run_coroutine_threadsafe(
            update_download_job(state.job_id, status="running"), loop
        ).result()
        self._broadcast_sync(state, loop)

        stop_poll = threading.Event()
        poll_thread = threading.Thread(target=lambda: None, daemon=True)  # default no-op thread

        try:
            from huggingface_hub import snapshot_download, HfApi
            import shutil

            tmp_dir = PYTORCH_DIR / f".tmp_{state.job_id}"
            tmp_dir.mkdir(parents=True, exist_ok=True)

            hf_token = os.getenv("HF_TOKEN") or None

            # Estimate total size from HfApi (best effort)
            try:
                api_hf = HfApi(token=hf_token)
                info = api_hf.model_info(state.repo_id)
                state.total_bytes = sum(
                    s.size for s in (info.siblings or [])
                    if s.rfilename.endswith((".safetensors", ".bin", ".json", ".model", ".txt"))
                )
            except Exception:
                state.total_bytes = 0

            def _safe_dir_size(path: Path) -> int:
                """
                Sum all file sizes under path.
                Also parses HuggingFace .incomplete filename to extract expected total
                size from the filename format: <hash>.<expected_bytes>.incomplete
                """
                total_sz = 0
                try:
                    for f in path.rglob("*"):
                        try:
                            if not f.is_file():
                                continue
                            sz = 0
                            try:
                                sz = f.stat().st_size
                            except (OSError, PermissionError):
                                try:
                                    with open(str(f), "rb") as fh:
                                        fh.seek(0, 2)
                                        sz = fh.tell()
                                except Exception:
                                    pass
                            total_sz += sz
                            # Detect expected total from .incomplete filename
                            if state.total_bytes == 0 and f.name.endswith(".incomplete"):
                                parts = f.name.split(".")
                                if len(parts) >= 3:
                                    try:
                                        expected = int(parts[-2])
                                        if expected > 0:
                                            state.total_bytes = expected
                                    except ValueError:
                                        pass
                        except Exception:
                            pass
                except Exception:
                    pass
                return total_sz


            def _poll_progress():
                last_size = 0
                while not stop_poll.is_set():
                    time.sleep(1.5)
                    try:
                        cache_path = PYTORCH_DIR / ".hf_cache"
                        current = _safe_dir_size(tmp_dir) + _safe_dir_size(cache_path)
                        delta = current - last_size
                        state.bytes_downloaded = current
                        if state.total_bytes > 0:
                            state.percent = min(99.0, current / state.total_bytes * 100)
                        speed_bps = delta / 1.5
                        state.speed_mbps = speed_bps / (1024 * 1024)
                        if speed_bps > 0 and state.total_bytes > 0:
                            remaining = max(0, state.total_bytes - current)
                            state.eta_sec = int(remaining / speed_bps)
                        last_size = current
                        asyncio.run_coroutine_threadsafe(
                            update_download_job(
                                state.job_id,
                                bytes_downloaded=current,
                                total_bytes=state.total_bytes,
                                speed_mbps=state.speed_mbps,
                            ),
                            loop,
                        )
                        self._broadcast_sync(state, loop)
                    except Exception:
                        pass

            poll_thread = threading.Thread(target=_poll_progress, daemon=True)
            poll_thread.start()

            # Use a local cache_dir so blobs stay on same drive and are measurable
            cache_dir = PYTORCH_DIR / ".hf_cache"
            cache_dir.mkdir(parents=True, exist_ok=True)

            snapshot_download(
                repo_id=state.repo_id,
                local_dir=str(tmp_dir),
                cache_dir=str(cache_dir),
                token=hf_token,
                ignore_patterns=["*.gguf", "*.pt", "flax_*", "tf_*", "rust_*"],
            )

            stop_poll.set()

            # --- Move to final destination ---
            final_path = PYTORCH_DIR / state.folder_name
            if final_path.exists():
                shutil.rmtree(str(final_path))
            shutil.move(str(tmp_dir), str(final_path))

            state.status = "done"
            state.percent = 100.0
            state.eta_sec = 0
            state.speed_mbps = 0.0

            try:
                final_size = sum(f.stat().st_size for f in final_path.rglob("*") if f.is_file())
            except Exception:
                final_size = state.bytes_downloaded

            state.bytes_downloaded = final_size
            state.total_bytes = final_size

            asyncio.run_coroutine_threadsafe(
                update_download_job(
                    state.job_id,
                    status="done",
                    bytes_downloaded=final_size,
                    total_bytes=final_size,
                ),
                loop,
            ).result()
            self._broadcast_sync(state, loop)

            # Trigger model scan so new model appears in Model Manager immediately
            asyncio.run_coroutine_threadsafe(model_service.scan_models(), loop)

        except Exception as e:
            exc_name = type(e).__name__
            err_msg = str(e)
            if "GatedRepoError" in exc_name or "gated" in err_msg.lower() or "restricted" in err_msg.lower() or "401" in err_msg:
                err_msg = (
                    f"Access to '{state.repo_id}' is restricted or gated. "
                    f"Accept the terms at https://huggingface.co/{state.repo_id} and set HF_TOKEN in .env."
                )
            elif "RepositoryNotFoundError" in exc_name or "404" in err_msg:
                err_msg = f"Repository '{state.repo_id}' was not found on HuggingFace Hub."
            elif "EntryNotFoundError" in exc_name:
                err_msg = f"One or more files were not found in '{state.repo_id}'."

            if not state.is_cancelled:
                state.status = "failed"
                state.error = err_msg
                asyncio.run_coroutine_threadsafe(
                    update_download_job(state.job_id, status="failed", error=err_msg), loop
                )
                self._broadcast_sync(state, loop)
        finally:
            # Always stop the progress polling thread
            stop_poll.set()
            poll_thread.join(timeout=3)

            with self._lock:
                self.active_job = None
            # Clean up tmp if still there
            tmp = PYTORCH_DIR / f".tmp_{state.job_id}"
            if tmp.exists():
                import shutil as _s
                _s.rmtree(str(tmp), ignore_errors=True)

    async def cancel_download(self, job_id: str) -> bool:
        with self._lock:
            if self.active_job and self.active_job.job_id == job_id:
                self.active_job.is_cancelled = True
                self.active_job.status = "cancelled"
                await update_download_job(job_id, status="cancelled")
                return True
        await update_download_job(job_id, status="cancelled")
        return True

    async def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        return await get_download_job(job_id)


pytorch_download_service = PytorchDownloadService()
