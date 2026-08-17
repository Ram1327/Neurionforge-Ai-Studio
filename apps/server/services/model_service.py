import os
import re
import gc
import time
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

from db import upsert_model, list_models, set_model_loaded, get_model, delete_model_record

# Load environment
dotenv_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path)

MODELS_DIR = os.getenv("MODELS_DIR", "D:/models")

def parse_quantization(filename: str) -> str:
    """Extract quantization level from GGUF filename"""
    match = re.search(r'(q\d+_[a-z0-9_]+|bf16|fp16|f16|f32|q8_0|q4_0|q4_1|q5_0|q5_1)', filename, re.IGNORECASE)
    if match:
        return match.group(1).upper()
    return "UNKNOWN"

def format_model_name(filename: str) -> str:
    """Convert filename into clean display name"""
    clean = re.sub(r'\.gguf$', '', filename, flags=re.IGNORECASE)
    clean = re.sub(r'[-_](q\d+_[a-z0-9_]+|bf16|fp16|f16|f32|q8_0|q4_0|q4_1|q5_0|q5_1)', '', clean, flags=re.IGNORECASE)
    parts = re.split(r'[-_]', clean)
    formatted = " ".join(p.capitalize() for p in parts if p)
    return formatted or filename

class ModelService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelService, cls).__new__(cls)
            cls._instance.loaded_model = None
            cls._instance.active_model_id = None
            cls._instance.active_model_path = None
            cls._instance.load_lock = asyncio.Lock()
            cls._instance.last_activity_time = time.time()
        return cls._instance

    @property
    def is_loaded(self) -> bool:
        return self.loaded_model is not None

    async def scan_models(self) -> List[Dict[str, Any]]:
        """Scan models directory and synchronize with DB"""
        models_path = Path(MODELS_DIR)
        models_found = []

        if models_path.exists() and models_path.is_dir():
            for file_path in models_path.glob("*.gguf"):
                file_size_bytes = file_path.stat().st_size
                size_gb = round(file_size_bytes / (1024 ** 3), 2)
                quant = parse_quantization(file_path.name)
                name = format_model_name(file_path.name)
                is_mmproj = "mmproj" in file_path.name.lower()

                model_id = file_path.name.lower()
                is_currently_active = (model_id == self.active_model_id and self.loaded_model is not None)

                model_data = {
                    "id": model_id,
                    "name": name,
                    "filename": file_path.name,
                    "path": str(file_path),
                    "size_gb": size_gb,
                    "quantization": quant,
                    "context_length": 4096,
                    "loaded": is_currently_active,
                    "gpu_layers": 0,
                    "is_mmproj": is_mmproj
                }
                await upsert_model(model_data)
                models_found.append(model_data)

        # Retrieve full list from DB
        db_models = await list_models()
        valid_models = []
        for m in db_models:
            # Check if file still exists on disk
            if Path(m["path"]).exists():
                m["loaded"] = bool(m["id"] == self.active_model_id and self.loaded_model is not None)
                m["is_mmproj"] = bool("mmproj" in m["filename"].lower())
                valid_models.append(m)
            else:
                await delete_model_record(m["id"])

        return valid_models

    async def load_model(self, model_id: str, n_ctx: int = 4096, n_threads: Optional[int] = None) -> Dict[str, Any]:
        """Load a GGUF model into memory using llama-cpp-python"""
        async with self.load_lock:
            # If already loaded, return immediately
            if self.active_model_id == model_id and self.loaded_model is not None:
                return {
                    "id": model_id,
                    "loaded": True,
                    "load_time_sec": 0.0,
                    "message": "Model already loaded"
                }

            # Find model file
            model_record = await get_model(model_id)
            if model_record:
                model_file = Path(model_record["path"])
            else:
                model_file = Path(MODELS_DIR) / model_id

            if not model_file.exists():
                raise FileNotFoundError(f"Model file not found: {model_file}")

            # Check if user tried to load an mmproj vision projector as a standalone LLM
            filename_lower = model_file.name.lower()
            if "mmproj" in filename_lower:
                raise ValueError(
                    f"'{model_file.name}' is a Multimodal Vision Projector (mmproj), not a standalone language model. "
                    f"Please load a full LLM weight file (e.g. Q4_K_M, Q5_K_M, Q8_0)."
                )

            if any(k in filename_lower for k in ["asr", "speech", "whisper", "conformer", "wav2vec"]):
                raise ValueError(
                    f"'{model_file.name}' is an ASR / Speech Recognition model, not a text generation LLM. "
                    f"llama.cpp requires a text LLM (such as Qwen 2.5, Llama 3.2, Mistral, Gemma 2, or Phi-3.5)."
                )

            # Unload any current model first
            if self.loaded_model is not None:
                del self.loaded_model
                self.loaded_model = None
                self.active_model_id = None
                gc.collect()

            cpu_threads = n_threads or min(8, os.cpu_count() or 4)

            # Load in thread pool so we don't block asyncio event loop
            start_time = time.perf_counter()

            def _load():
                try:
                    from llama_cpp import Llama
                    return Llama(
                        model_path=str(model_file),
                        n_ctx=n_ctx,
                        n_threads=cpu_threads,
                        n_gpu_layers=0,  # CPU only
                        verbose=False
                    )
                except Exception as ex:
                    err_str = str(ex)
                    if "failed to load model" in err_str.lower():
                        raise RuntimeError(
                            f"Incompatible GGUF architecture in '{model_file.name}'. "
                            f"Make sure this is a supported text-generation LLM model."
                        )
                    raise RuntimeError(f"llama.cpp loading failed: {err_str}")

            loop = asyncio.get_running_loop()
            self.loaded_model = await loop.run_in_executor(None, _load)
            load_time = round(time.perf_counter() - start_time, 2)

            self.active_model_id = model_id
            self.active_model_path = str(model_file)
            self.last_activity_time = time.time()

            await set_model_loaded(model_id, True)

            return {
                "id": model_id,
                "loaded": True,
                "load_time_sec": load_time,
                "message": f"Loaded in {load_time}s"
            }

    async def unload_model(self, model_id: Optional[str] = None) -> Dict[str, Any]:
        """Unload active model to free RAM"""
        async with self.load_lock:
            target_id = model_id or self.active_model_id
            if self.loaded_model is not None:
                del self.loaded_model
                self.loaded_model = None
                self.active_model_id = None
                self.active_model_path = None
                gc.collect()

            if target_id:
                await set_model_loaded(target_id, False)

            return {
                "id": target_id or "none",
                "loaded": False,
                "load_time_sec": 0.0,
                "message": "Model unloaded successfully"
            }

    async def delete_model(self, model_id: str) -> Dict[str, Any]:
        """Delete model weight file from disk and database"""
        async with self.load_lock:
            # If active, unload first
            if self.active_model_id == model_id:
                await self.unload_model(model_id)

            model_record = await get_model(model_id)
            if model_record and Path(model_record["path"]).exists():
                try:
                    Path(model_record["path"]).unlink()
                except Exception as e:
                    print(f"[ERROR] Failed to delete file {model_record['path']}: {e}")

            # Also check directly in MODELS_DIR
            direct_file = Path(MODELS_DIR) / model_id
            if direct_file.exists():
                try:
                    direct_file.unlink()
                except Exception:
                    pass

            await delete_model_record(model_id)
            return {"id": model_id, "deleted": True, "message": "Model file deleted successfully"}

model_service = ModelService()
