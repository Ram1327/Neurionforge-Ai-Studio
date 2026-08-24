import os
import sys
import psutil
import asyncio
import time
from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import init_db
from services.model_service import model_service, MODELS_DIR
from services.download_service import download_service
from services.dataset_service import dataset_service
from services.adapter_service import adapter_service
from services.pytorch_download_service import pytorch_download_service
from routers.models import router as models_router
from routers.inference import router as inference_router
from routers.hub import router as hub_router
from routers.downloads import router as downloads_router
from routers.datasets import router as datasets_router
from routers.adapters import router as adapters_router
from routers.finetune import router as finetune_router
from routers.convert import router as convert_router

# Load environment
dotenv_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path)

IDLE_UNLOAD_SECONDS = int(os.getenv("IDLE_UNLOAD_SECONDS", "600"))

async def idle_checker():
    """Background task to unload model when idle to save RAM"""
    if IDLE_UNLOAD_SECONDS <= 0:
        return
    while True:
        await asyncio.sleep(30)
        if model_service.loaded_model is not None:
            idle_time = time.time() - model_service.last_activity_time
            if idle_time > IDLE_UNLOAD_SECONDS:
                print(f"[IDLE] Unloading model {model_service.active_model_id} after {int(idle_time)}s of inactivity.")
                await model_service.unload_model()

def cleanup_temp_files():
    """Remove leftover .part or .tmp_* files from interrupted downloads"""
    import shutil
    try:
        md = Path(MODELS_DIR)
        if md.exists():
            for p in md.glob("*.part"):
                p.unlink(missing_ok=True)
            for tmp in md.glob(".tmp_*"):
                if tmp.is_dir():
                    shutil.rmtree(str(tmp), ignore_errors=True)
                else:
                    tmp.unlink(missing_ok=True)
            pt = md / "pytorch"
            if pt.exists():
                for tmp in pt.glob(".tmp_*"):
                    if tmp.is_dir():
                        shutil.rmtree(str(tmp), ignore_errors=True)
                    else:
                        tmp.unlink(missing_ok=True)
    except Exception:
        pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure directories exist, cleanup stale temp files, initialize database, scan local models, start download worker
    Path(MODELS_DIR).mkdir(parents=True, exist_ok=True)
    (Path(MODELS_DIR) / "pytorch").mkdir(parents=True, exist_ok=True)
    cleanup_temp_files()
    await init_db()
    await model_service.scan_models()
    await dataset_service.ensure_default_dataset()
    await adapter_service.scan_adapters()
    download_service.start_worker()
    idle_task = asyncio.create_task(idle_checker())
    print(f"[STARTUP] NeurionForge AI Studio Server running. Models dir: {MODELS_DIR}")
    yield
    # Shutdown: cleanup
    idle_task.cancel()
    if model_service.loaded_model is not None:
        await model_service.unload_model()
    print("[SHUTDOWN] Server cleanup complete.")

app = FastAPI(
    title="NeurionForge AI Studio Server",
    description="Local-first LLM inference, Hub downloader, and PEFT LoRA fine-tuning engine",
    version="0.2.0",
    lifespan=lifespan
)

# Enable CORS for Next.js web client
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://aistudio.neurionforge.com",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(models_router)
app.include_router(inference_router)
app.include_router(hub_router)
app.include_router(downloads_router)
app.include_router(datasets_router)
app.include_router(adapters_router)
app.include_router(finetune_router)
app.include_router(convert_router)


@app.get("/health")
async def health_check():
    """System and hardware status"""
    mem = psutil.virtual_memory()
    return {
        "status": "ok",
        "models_dir": MODELS_DIR,
        "active_model": model_service.active_model_id,
        "is_model_loaded": model_service.is_loaded,
        "cpu_threads": os.cpu_count() or 4,
        "gpu_available": False,
        "total_ram_gb": round(mem.total / (1024 ** 3), 2),
        "available_ram_gb": round(mem.available / (1024 ** 3), 2)
    }

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        reload_excludes=["data/*", "*.db", "*.db-journal", "*.part", "*.gguf", "logs/*", ".venv/*"]
    )
