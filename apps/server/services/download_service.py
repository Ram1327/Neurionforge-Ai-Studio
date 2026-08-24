"""
NeurionForge AI Studio — GGUF Download Service (rewritten)
=========================================================
Uses huggingface_hub.hf_hub_download() for correct LFS / CDN / auth handling.
Supports real-time progress via WebSocket broadcast, cancellation, and DB persistence.
"""
import os
import time
import uuid
import asyncio
import threading
from pathlib import Path
from typing import Dict, Any, Optional, Set
from dataclasses import dataclass

from db import create_download_job, update_download_job, get_download_job
from services.model_service import MODELS_DIR, model_service


# ─── State dataclass ──────────────────────────────────────────────────────────

@dataclass
class DownloadState:
    job_id: str
    repo_id: str
    filename: str          # basename shown in UI (e.g. "model.Q4_K_M.gguf")
    rfilename: str         # path inside the repo (may include sub-dirs)
    dest_path: str         # absolute final destination
    status: str
    bytes_downloaded: int = 0
    total_bytes: int = 0
    percent: float = 0.0
    speed_mbps: float = 0.0
    eta_sec: Optional[int] = None
    error: Optional[str] = None
    is_cancelled: bool = False


# ─── Service ──────────────────────────────────────────────────────────────────

class DownloadService:
    """
    Singleton download manager.

    Architecture:
    - An asyncio Queue holds pending DownloadState objects.
    - A single background asyncio Task (_process_queue) drains the queue
      one job at a time, running each download in a thread-pool executor so
      blocking I/O never stalls the event loop.
    - Real-time progress is broadcast to WebSocket subscribers via
      per-job asyncio.Queue instances.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DownloadService, cls).__new__(cls)
            cls._instance._initialised = False
        return cls._instance

    def _ensure_init(self):
        """Lazy-init so that asyncio primitives are created inside the event loop."""
        if not self._initialised:
            self.active_job: Optional[DownloadState] = None
            self.job_queue: asyncio.Queue = asyncio.Queue()
            self.subscribers: Dict[str, Set[asyncio.Queue]] = {}
            self.worker_task: Optional[asyncio.Task] = None
            self.is_running: bool = False
            self._lock = threading.Lock()
            self._initialised = True

    # ── Public lifecycle ──────────────────────────────────────────────────────

    def start_worker(self):
        self._ensure_init()
        if not self.is_running:
            self.is_running = True
            self.worker_task = asyncio.create_task(self._process_queue())
            print("[DOWNLOAD] Worker task started.")

    # ── Subscription helpers ──────────────────────────────────────────────────

    async def subscribe(self, job_id: str, queue: asyncio.Queue):
        self._ensure_init()
        if job_id not in self.subscribers:
            self.subscribers[job_id] = set()
        self.subscribers[job_id].add(queue)

        # Immediately send the current state so the WS client sees progress right away
        if self.active_job and self.active_job.job_id == job_id:
            await queue.put(self._serialize(self.active_job))
        else:
            db_job = await get_download_job(job_id)
            if db_job:
                await queue.put(self._db_to_payload(db_job))

    async def unsubscribe(self, job_id: str, queue: asyncio.Queue):
        self._ensure_init()
        if job_id in self.subscribers:
            self.subscribers[job_id].discard(queue)
            if not self.subscribers[job_id]:
                del self.subscribers[job_id]

    # ── Broadcast helpers ─────────────────────────────────────────────────────

    async def _broadcast(self, state: DownloadState):
        payload = self._serialize(state)
        for q in list(self.subscribers.get(state.job_id, set())):
            try:
                q.put_nowait(payload)
            except Exception:
                pass

    def _broadcast_sync(self, state: DownloadState, loop: asyncio.AbstractEventLoop):
        """Thread-safe broadcast called from the download thread."""
        payload = self._serialize(state)
        for q in list(self.subscribers.get(state.job_id, set())):
            try:
                loop.call_soon_threadsafe(q.put_nowait, payload)
            except Exception:
                pass

    # ── Serialisation ─────────────────────────────────────────────────────────

    def _serialize(self, s: DownloadState) -> Dict[str, Any]:
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
            "error": s.error,
        }

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

    # ── Queue management ──────────────────────────────────────────────────────

    async def enqueue_download(
        self,
        repo_id: str,
        filename: str,
        rfilename: Optional[str] = None,
    ) -> str:
        """Enqueue a GGUF file download.  Returns the job_id immediately."""
        self._ensure_init()

        models_dir = Path(MODELS_DIR)
        models_dir.mkdir(parents=True, exist_ok=True)

        actual_rfilename = rfilename or filename
        dest_path = str(models_dir / filename)

        # Already downloaded?
        if Path(dest_path).exists() and Path(dest_path).stat().st_size > 0:
            job_id = f"job_{uuid.uuid4().hex[:8]}"
            size = Path(dest_path).stat().st_size
            await create_download_job({
                "job_id": job_id,
                "repo_id": repo_id,
                "filename": filename,
                "dest_path": dest_path,
                "status": "done",
                "bytes_downloaded": size,
                "total_bytes": size,
            })
            print(f"[DOWNLOAD] '{filename}' already exists — returning done job {job_id}.")
            return job_id

        # Already downloading?
        with self._lock:
            if self.active_job and self.active_job.filename == filename:
                print(f"[DOWNLOAD] '{filename}' is already downloading ({self.active_job.job_id}).")
                return self.active_job.job_id

        job_id = f"job_{uuid.uuid4().hex[:8]}"
        state = DownloadState(
            job_id=job_id,
            repo_id=repo_id,
            filename=filename,
            rfilename=actual_rfilename,
            dest_path=dest_path,
            status="queued",
        )

        await create_download_job({
            "job_id": job_id,
            "repo_id": repo_id,
            "filename": filename,
            "dest_path": dest_path,
            "status": "queued",
            "bytes_downloaded": 0,
            "total_bytes": 0,
        })

        await self.job_queue.put(state)
        print(f"[DOWNLOAD] Enqueued: {filename}  (job={job_id})")
        return job_id

    async def cancel_download(self, job_id: str) -> bool:
        """Cancel an active or queued download."""
        self._ensure_init()
        if self.active_job and self.active_job.job_id == job_id:
            self.active_job.is_cancelled = True
            self.active_job.status = "cancelled"
            await update_download_job(job_id, status="cancelled")
            await self._broadcast(self.active_job)
            return True
        job = await get_download_job(job_id)
        if job and job.get("status") in ("queued", "running"):
            await update_download_job(job_id, status="cancelled")
            return True
        return False

    # ── Worker loop ───────────────────────────────────────────────────────────

    async def _process_queue(self):
        """Sequential download worker — runs until the service stops."""
        print("[DOWNLOAD] Worker loop running.")
        while self.is_running:
            state: DownloadState = await self.job_queue.get()

            if state.is_cancelled:
                self.job_queue.task_done()
                continue

            # Re-check cancellation (may have been cancelled while queued)
            db_check = await get_download_job(state.job_id)
            if db_check and db_check.get("status") == "cancelled":
                self.job_queue.task_done()
                continue

            with self._lock:
                self.active_job = state

            state.status = "running"
            await update_download_job(state.job_id, status="running")
            await self._broadcast(state)

            loop = asyncio.get_running_loop()
            try:
                await loop.run_in_executor(
                    None,
                    self._execute_download,
                    state,
                    loop,
                )
            except Exception as e:
                # _execute_download already sets state.error and broadcasts on error,
                # but we catch here to be safe and keep the worker alive.
                print(f"[DOWNLOAD][ERROR] {state.filename}: {e}")
                if not state.is_cancelled and state.status not in ("done", "cancelled", "failed"):
                    state.status = "failed"
                    state.error = str(e)
                    await update_download_job(state.job_id, status="failed", error=str(e))
                    await self._broadcast(state)

            with self._lock:
                self.active_job = None

            self.job_queue.task_done()

    # ── Core download (runs in thread-pool) ───────────────────────────────────

    def _execute_download(self, state: DownloadState, loop: asyncio.AbstractEventLoop):
        """
        Download one GGUF file using huggingface_hub.hf_hub_download().

        Strategy
        --------
        1. Use hf_hub_download() to fetch the file into a temporary HF cache dir.
           The library handles:
             - LFS pointer resolution
             - CDN redirects
             - Authentication (HF_TOKEN from env)
             - Integrity verification (sha256)
        2. While the download runs we poll the temp cache folder for progress.
        3. On completion we COPY/MOVE the cached blob to the final dest_path.
        4. On cancellation / failure we clean up partial files.
        """
        import shutil
        from huggingface_hub import hf_hub_download, HfApi

        hf_token = os.getenv("HF_TOKEN") or None
        models_dir = Path(MODELS_DIR)
        cache_dir = models_dir / ".hf_cache"
        cache_dir.mkdir(parents=True, exist_ok=True)

        final_path = Path(state.dest_path)
        final_path.parent.mkdir(parents=True, exist_ok=True)

        # ── Pre-flight: get expected file size ────────────────────────────────
        try:
            api = HfApi(token=hf_token)
            model_info = api.model_info(state.repo_id, files_metadata=True)
            for sibling in (model_info.siblings or []):
                if sibling.rfilename == state.rfilename:
                    state.total_bytes = getattr(sibling, "size", 0) or 0
                    break
        except Exception as e:
            print(f"[DOWNLOAD][WARN] Could not prefetch file size for {state.rfilename}: {e}")
            state.total_bytes = 0

        asyncio.run_coroutine_threadsafe(
            update_download_job(state.job_id, total_bytes=state.total_bytes),
            loop,
        )
        self._broadcast_sync(state, loop)

        # ── Progress polling thread ────────────────────────────────────────────
        stop_poll = threading.Event()

        def _poll():
            """Watch the HF cache dir for the downloading blob and report progress."""
            last_bytes = 0
            last_time = time.time()

            while not stop_poll.is_set():
                time.sleep(0.8)
                if stop_poll.is_set():
                    break

                current_bytes = _cache_download_bytes(cache_dir, state.rfilename)
                if current_bytes == 0:
                    continue

                now = time.time()
                dt = now - last_time
                if dt > 0:
                    delta = max(0, current_bytes - last_bytes)
                    speed_bps = delta / dt
                    state.speed_mbps = speed_bps / (1024 * 1024)
                    if state.total_bytes > 0:
                        state.percent = min(99.0, current_bytes / state.total_bytes * 100)
                        remaining = max(0, state.total_bytes - current_bytes)
                        state.eta_sec = int(remaining / speed_bps) if speed_bps > 0 else None
                    state.bytes_downloaded = current_bytes
                    last_bytes = current_bytes
                    last_time = now

                    asyncio.run_coroutine_threadsafe(
                        update_download_job(
                            state.job_id,
                            bytes_downloaded=current_bytes,
                            total_bytes=state.total_bytes,
                            speed_mbps=state.speed_mbps,
                            eta_sec=state.eta_sec,
                        ),
                        loop,
                    )
                    self._broadcast_sync(state, loop)

        poll_thread = threading.Thread(target=_poll, daemon=True)
        poll_thread.start()

        try:
            # ── The actual download ────────────────────────────────────────────
            # hf_hub_download returns the path of the cached file.
            # We use local_dir to have the file placed directly where we want it.
            print(f"[DOWNLOAD] Starting hf_hub_download: repo={state.repo_id}  file={state.rfilename}")

            downloaded_path = hf_hub_download(
                repo_id=state.repo_id,
                filename=state.rfilename,
                local_dir=str(models_dir),   # download directly to models_dir
                cache_dir=str(cache_dir),
                token=hf_token,
                force_download=False,         # allow reuse of existing cached blobs
            )

            stop_poll.set()
            poll_thread.join(timeout=3)

            if state.is_cancelled:
                _cleanup_partial(final_path, cache_dir, state.rfilename)
                state.status = "cancelled"
                asyncio.run_coroutine_threadsafe(
                    update_download_job(state.job_id, status="cancelled"),
                    loop,
                ).result()
                self._broadcast_sync(state, loop)
                return

            # ── Ensure final file is at the correct flat path ─────────────────
            # hf_hub_download with local_dir may place the file in a subdir if
            # rfilename contains path separators (e.g. "some/folder/model.gguf").
            downloaded_path_obj = Path(downloaded_path)
            if downloaded_path_obj != final_path and downloaded_path_obj.exists():
                if final_path.exists():
                    final_path.unlink(missing_ok=True)
                shutil.move(str(downloaded_path_obj), str(final_path))
                print(f"[DOWNLOAD] Moved {downloaded_path_obj.name} → {final_path}")

            # Verify the final file exists and is non-empty
            if not final_path.exists() or final_path.stat().st_size == 0:
                raise RuntimeError(
                    f"Download appeared to succeed but file is missing: {final_path}"
                )

            final_size = final_path.stat().st_size
            state.status = "done"
            state.percent = 100.0
            state.bytes_downloaded = final_size
            state.total_bytes = final_size
            state.eta_sec = 0
            state.speed_mbps = 0.0

            print(f"[DOWNLOAD] ✅ Complete: {final_path.name}  ({final_size / 1024**2:.1f} MB)")

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

            # Trigger model scan so the new model appears immediately
            asyncio.run_coroutine_threadsafe(model_service.scan_models(), loop)

        except Exception as e:
            stop_poll.set()
            poll_thread.join(timeout=3)

            err_msg = _humanise_hf_error(e, state.repo_id, state.filename)

            if not state.is_cancelled:
                state.status = "failed"
                state.error = err_msg
                asyncio.run_coroutine_threadsafe(
                    update_download_job(state.job_id, status="failed", error=err_msg),
                    loop,
                )
                self._broadcast_sync(state, loop)

            print(f"[DOWNLOAD][ERROR] {state.filename}: {err_msg}")
            raise


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _cache_download_bytes(cache_dir: Path, rfilename: str) -> int:
    """
    Estimate how many bytes have been downloaded so far by scanning the
    HuggingFace cache directory for blobs related to the target file.
    HF cache stores blobs in  <cache>/blobs/<sha>  and also writes
    <sha>.incomplete files while downloading.
    """
    total = 0
    if not cache_dir.exists():
        return 0
    try:
        for blob_file in cache_dir.rglob("*"):
            if not blob_file.is_file():
                continue
            # Only count blobs (not metadata json / lock files)
            name = blob_file.name
            if name.endswith((".json", ".lock", ".metadata")):
                continue
            try:
                total += blob_file.stat().st_size
            except OSError:
                pass
    except Exception:
        pass
    return total


def _cleanup_partial(final_path: Path, cache_dir: Path, rfilename: str):
    """Remove partial download artefacts on cancellation."""
    import shutil
    try:
        if final_path.exists() and final_path.stat().st_size == 0:
            final_path.unlink(missing_ok=True)
    except Exception:
        pass


def _humanise_hf_error(exc: Exception, repo_id: str, filename: str) -> str:
    """Convert huggingface_hub exceptions to user-friendly messages."""
    exc_name = type(exc).__name__
    msg = str(exc)

    if "GatedRepoError" in exc_name or "gated" in msg.lower() or "restricted" in msg.lower():
        return (
            f"'{repo_id}' is gated / restricted. "
            f"Accept the terms at https://huggingface.co/{repo_id} and set HF_TOKEN in .env."
        )
    if "RepositoryNotFoundError" in exc_name or "404" in msg:
        return f"Repository '{repo_id}' not found on HuggingFace Hub."
    if "EntryNotFoundError" in exc_name:
        return f"File '{filename}' not found in repository '{repo_id}'."
    if "401" in msg or "Unauthorized" in msg or "credentials" in msg.lower():
        return (
            f"Authentication required for '{repo_id}'. Set HF_TOKEN in .env."
        )
    if "ConnectionError" in exc_name or "requests.exceptions" in exc_name or "timeout" in msg.lower():
        return f"Network error while downloading '{filename}'. Check your internet connection."
    return msg


# ─── Singleton ────────────────────────────────────────────────────────────────

download_service = DownloadService()
