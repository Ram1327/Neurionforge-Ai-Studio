"""
Phase 3: GGUF Conversion Service
Merges a LoRA adapter (optional) into a PyTorch base model and converts to GGUF format.
Uses a bundled conversion approach via llama_cpp's built-in convert utilities.
Streams progress updates over asyncio queues (same pattern as finetune WS).
"""
import os
import gc
import sys
import uuid
import time
import json
import shutil
import asyncio
import threading
from pathlib import Path
from typing import Dict, Any, Optional, Set, List

from db import (
    create_convert_job, update_convert_job, get_convert_job, list_convert_jobs
)
from services.model_service import MODELS_DIR, model_service

PYTORCH_DIR = Path(MODELS_DIR) / "pytorch"
GGUF_OUTPUT_DIR = Path(MODELS_DIR)


class ConvertJob:
    def __init__(self, job_id: str):
        self.job_id = job_id
        self.stop_event = threading.Event()
        self.log_queues: Set[asyncio.Queue] = set()
        self.log_history: List[Dict[str, Any]] = []


class ConvertService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ConvertService, cls).__new__(cls)
            cls._instance.active_jobs: Dict[str, ConvertJob] = {}
        return cls._instance

    def _broadcast(self, job_id: str, payload: Dict[str, Any], loop: asyncio.AbstractEventLoop):
        job = self.active_jobs.get(job_id)
        if job:
            job.log_history.append(payload)
            for q in list(job.log_queues):
                loop.call_soon_threadsafe(q.put_nowait, payload)

    async def start_conversion(
        self,
        model_id: str,
        quantization: str = "Q4_K_M",
        adapter_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Start a background GGUF conversion job"""
        # Resolve model path
        # model_id may be 'pytorch::qwen2.5-0.5b-instruct' or a folder name
        if model_id.startswith("pytorch::"):
            folder_name = model_id[len("pytorch::"):]
        else:
            folder_name = model_id

        model_path = PYTORCH_DIR / folder_name
        if not model_path.exists() or not (model_path / "config.json").exists():
            # Try to find by scanning pytorch dir
            found = False
            if PYTORCH_DIR.exists():
                for d in PYTORCH_DIR.iterdir():
                    if d.is_dir() and d.name.lower() == folder_name.lower():
                        model_path = d
                        folder_name = d.name
                        found = True
                        break
            if not found:
                raise FileNotFoundError(
                    f"PyTorch model '{folder_name}' not found in {PYTORCH_DIR}. "
                    "Please download it first via Model Manager."
                )

        # Resolve adapter path if provided
        adapter_path = None
        if adapter_id:
            from services.adapter_service import ADAPTERS_DIR
            a_path = Path(str(ADAPTERS_DIR)) / adapter_id
            if a_path.exists():
                adapter_path = a_path

        # Build output filename
        suffix = f"-lora-{adapter_id}" if adapter_id else ""
        quant_lower = quantization.lower().replace("_", "-")
        output_name = f"{folder_name}{suffix}-{quant_lower}.gguf"
        output_path = GGUF_OUTPUT_DIR / output_name

        job_id = f"cvt_{uuid.uuid4().hex[:8]}"
        job_data = {
            "job_id": job_id,
            "model_id": model_id,
            "adapter_id": adapter_id,
            "quantization": quantization,
            "status": "queued",
        }
        await create_convert_job(job_data)

        convert_job = ConvertJob(job_id)
        self.active_jobs[job_id] = convert_job
        loop = asyncio.get_running_loop()

        threading.Thread(
            target=self._run_conversion,
            args=(job_id, model_path, adapter_path, quantization, output_path, output_name, convert_job, loop),
            daemon=True,
        ).start()

        return {**job_data, "output_filename": output_name}

    def _run_conversion(
        self,
        job_id: str,
        model_path: Path,
        adapter_path: Optional[Path],
        quantization: str,
        output_path: Path,
        output_name: str,
        convert_job: ConvertJob,
        loop: asyncio.AbstractEventLoop,
    ):
        start = time.perf_counter()

        def emit(step: str, progress: float, status: str = "running"):
            elapsed = round(time.perf_counter() - start, 1)
            payload = {
                "job_id": job_id,
                "step": step,
                "progress": round(progress, 1),
                "status": status,
                "elapsed_sec": elapsed,
            }
            self._broadcast(job_id, payload, loop)
            asyncio.run_coroutine_threadsafe(
                update_convert_job(job_id, step=step, progress=progress, status=status),
                loop,
            )

        tmp_merged = None
        try:
            if adapter_path and adapter_path.exists():
                emit(f"Loading base model to merge adapter '{adapter_path.name}'...", 5.0)
                import torch
                from transformers import AutoModelForCausalLM, AutoTokenizer
                from peft import PeftModel

                tokenizer = AutoTokenizer.from_pretrained(str(model_path), trust_remote_code=True)
                model = AutoModelForCausalLM.from_pretrained(
                    str(model_path),
                    torch_dtype=torch.float32,
                    trust_remote_code=True,
                    low_cpu_mem_usage=True,
                )

                emit("Merging LoRA adapter weights...", 15.0)
                peft_model = PeftModel.from_pretrained(model, str(adapter_path))
                model = peft_model.merge_and_unload()

                tmp_merged = Path(MODELS_DIR) / f".tmp_merge_{job_id}"
                emit("Saving merged weights for conversion...", 25.0)
                model.save_pretrained(str(tmp_merged))
                tokenizer.save_pretrained(str(tmp_merged))

                del model
                del peft_model
                gc.collect()
                source_dir = tmp_merged
            else:
                emit("Direct base model conversion...", 5.0)
                source_dir = model_path

            # Execute GGUF conversion & quantization
            converted = self._do_convert(source_dir, output_path, quantization, emit)

            if converted and output_path.exists():
                import datetime
                now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                emit(f"Conversion complete! Saved: {output_name}", 100.0, status="done")
                try:
                    asyncio.run_coroutine_threadsafe(
                        update_convert_job(
                            job_id,
                            status="done",
                            progress=100.0,
                            output_filename=output_name,
                            finished_at=now_str,
                        ),
                        loop,
                    ).result(timeout=5)
                except Exception:
                    pass
                # Trigger model scan so the new GGUF appears in Model Manager immediately
                try:
                    asyncio.run_coroutine_threadsafe(model_service.scan_models(), loop).result(timeout=5)
                except Exception:
                    pass
            else:
                raise RuntimeError("Conversion produced no output file.")

        except Exception as e:
            emit(f"Error: {e}", 0.0, status="failed")
            try:
                asyncio.run_coroutine_threadsafe(
                    update_convert_job(job_id, status="failed", error=str(e)),
                    loop,
                ).result(timeout=5)
            except Exception:
                pass
        finally:
            self.active_jobs.pop(job_id, None)
            if tmp_merged and tmp_merged.exists():
                shutil.rmtree(str(tmp_merged), ignore_errors=True)

    def _do_convert(
        self,
        model_dir: Path,
        output_path: Path,
        quantization: str,
        emit,
    ) -> bool:
        """
        Convert HuggingFace model directory to GGUF format using bundled convert_hf_to_gguf.py
        followed by llama_cpp.llama_model_quantize for quantization formats.
        """
        import subprocess
        import sys

        scripts_dir = Path(__file__).parent.parent / "scripts"
        convert_script = scripts_dir / "convert_hf_to_gguf.py"

        if not convert_script.exists():
            raise FileNotFoundError(f"Bundled conversion script not found at {convert_script}")

        quant_upper = quantization.upper()
        needs_quantize = quant_upper not in ("F16", "F32", "AUTO")

        tmp_f16 = None
        if needs_quantize:
            tmp_f16 = output_path.parent / f".tmp_f16_{output_path.stem}.gguf"
            f16_target = tmp_f16
        else:
            f16_target = output_path

        emit("Converting HuggingFace tensors to F16 GGUF...", 35.0)

        cmd = [
            sys.executable,
            str(convert_script),
            str(model_dir),
            "--outfile", str(f16_target),
            "--outtype", "f16",
        ]

        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0 or not f16_target.exists():
            err_msg = proc.stderr[-400:] if proc.stderr else "convert_hf_to_gguf failed"
            raise RuntimeError(f"GGUF conversion failed: {err_msg}")

        emit("F16 GGUF generated successfully.", 65.0)

        # If user requested F16, we're done
        if not needs_quantize:
            return output_path.exists()

        # Step 2: Quantize using llama-cpp-python native bindings
        emit(f"Quantizing to {quant_upper} (AVX2 multi-threaded)...", 70.0)
        try:
            import llama_cpp

            ftype_map = {
                "Q4_K_M": getattr(llama_cpp, "LLAMA_FTYPE_MOSTLY_Q4_K_M", 15),
                "Q4_K_S": getattr(llama_cpp, "LLAMA_FTYPE_MOSTLY_Q4_K_S", 14),
                "Q4_0": getattr(llama_cpp, "LLAMA_FTYPE_MOSTLY_Q4_0", 2),
                "Q4_1": getattr(llama_cpp, "LLAMA_FTYPE_MOSTLY_Q4_1", 3),
                "Q5_K_M": getattr(llama_cpp, "LLAMA_FTYPE_MOSTLY_Q5_K_M", 17),
                "Q5_0": getattr(llama_cpp, "LLAMA_FTYPE_MOSTLY_Q5_0", 8),
                "Q6_K": getattr(llama_cpp, "LLAMA_FTYPE_MOSTLY_Q6_K", 18),
                "Q8_0": getattr(llama_cpp, "LLAMA_FTYPE_MOSTLY_Q8_0", 7),
                "Q2_K": getattr(llama_cpp, "LLAMA_FTYPE_MOSTLY_Q2_K", 10),
            }

            ftype = ftype_map.get(quant_upper, 15)
            params = llama_cpp.llama_model_quantize_default_params()
            params.ftype = ftype
            params.nthread = os.cpu_count() or 4

            emit(f"Computing {quant_upper} quantization blocks...", 80.0)
            res = llama_cpp.llama_model_quantize(
                str(f16_target).encode("utf-8"),
                str(output_path).encode("utf-8"),
                params,
            )

            # Remove temporary F16 file
            if tmp_f16 and tmp_f16.exists():
                tmp_f16.unlink(missing_ok=True)

            if res == 0 and output_path.exists():
                emit(f"Quantized to {quant_upper} successfully.", 95.0)
                return True
            else:
                raise RuntimeError(f"llama_model_quantize returned error code: {res}")

        except Exception as e:
            if tmp_f16 and tmp_f16.exists():
                tmp_f16.unlink(missing_ok=True)
            raise e

    async def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        return await get_convert_job(job_id)

    async def list_jobs(self) -> List[Dict[str, Any]]:
        return await list_convert_jobs()

    async def get_replay(self, job_id: str) -> List[Dict[str, Any]]:
        job = self.active_jobs.get(job_id)
        return job.log_history if job else []


convert_service = ConvertService()
