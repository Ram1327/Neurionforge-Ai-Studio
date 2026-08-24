import os
import sys
import time
import json
import uuid
import asyncio
import threading
from pathlib import Path
from typing import Dict, Any, Optional, List, Set

from db import (
    create_training_job_record,
    update_training_job_record,
    get_training_job_record,
    list_training_job_records,
    delete_training_job_record,
    get_dataset_record,
    upsert_adapter_record
)
from services.adapter_service import adapter_service, get_dir_size_mb

BASE_DIR = Path(__file__).resolve().parent.parent
ADAPTERS_DIR = BASE_DIR / "adapters"
TEMP_CHECKPOINTS_DIR = BASE_DIR / "temp_checkpoints"

class ActiveTrainingJob:
    def __init__(self, job_id: str):
        self.job_id = job_id
        self.stop_event = threading.Event()
        self.log_queues: Set[asyncio.Queue] = set()
        self.log_history: List[Dict[str, Any]] = []

class FineTuneService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FineTuneService, cls).__new__(cls)
            cls._instance.active_jobs: Dict[str, ActiveTrainingJob] = {}
            ADAPTERS_DIR.mkdir(parents=True, exist_ok=True)
            TEMP_CHECKPOINTS_DIR.mkdir(parents=True, exist_ok=True)
        return cls._instance

    def get_or_create_active_job(self, job_id: str) -> ActiveTrainingJob:
        if job_id not in self.active_jobs:
            self.active_jobs[job_id] = ActiveTrainingJob(job_id)
        return self.active_jobs[job_id]

    def broadcast_log(self, job_id: str, log_payload: Dict[str, Any], loop: asyncio.AbstractEventLoop):
        """Threadsafe broadcast of log event to all WebSocket listeners"""
        active = self.active_jobs.get(job_id)
        if not active:
            return
        
        active.log_history.append(log_payload)
        for q in list(active.log_queues):
            loop.call_soon_threadsafe(q.put_nowait, log_payload)

    async def start_training_job(
        self,
        base_model_id: str,
        dataset_id: str,
        adapter_name: str,
        lora_rank: int = 16,
        lora_alpha: int = 32,
        learning_rate: float = 2e-4,
        epochs: int = 3,
        batch_size: int = 1,
        target_modules: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Validates inputs, initializes DB record, and launches background fine-tuning thread"""
        dataset = await get_dataset_record(dataset_id)
        if not dataset or not Path(dataset["path"]).exists():
            raise FileNotFoundError(f"Dataset '{dataset_id}' not found.")

        # Phase 3: check if model is available locally in D:/models/pytorch/
        import os as _os
        models_root = _os.getenv("MODELS_DIR", "D:/models")
        pytorch_dir = Path(models_root) / "pytorch"
        folder_name = base_model_id.split("/")[-1]
        local_model_path = pytorch_dir / folder_name
        local_model_exists = local_model_path.exists() and (local_model_path / "config.json").exists()

        if not local_model_exists:
            # Signal to the frontend that the model needs to be downloaded first
            raise ValueError(
                f"MODEL_NOT_DOWNLOADED::{base_model_id}::The base model '{base_model_id}' is not in D:/models/pytorch/. "
                "Please download it first."
            )

        target_modules = target_modules or ["q_proj", "v_proj"]
        job_id = f"job-{uuid.uuid4().hex[:8]}"
        clean_adapter_name = adapter_name.strip() or f"adapter-{job_id}"
        adapter_dir_name = clean_adapter_name.lower().replace(" ", "-").replace("_", "-")
        output_dir = ADAPTERS_DIR / adapter_dir_name

        job_data = {
            "job_id": job_id,
            "base_model_id": base_model_id,
            "dataset_id": dataset_id,
            "adapter_name": clean_adapter_name,
            "status": "queued",
            "lora_rank": lora_rank,
            "lora_alpha": lora_alpha,
            "learning_rate": learning_rate,
            "epochs": epochs,
            "batch_size": batch_size,
            "target_modules": json.dumps(target_modules),
            "current_step": 0,
            "total_steps": 0,
            "current_loss": None,
            "final_loss": None,
            "output_dir": str(output_dir)
        }
        await create_training_job_record(job_data)

        # Register active job
        active = self.get_or_create_active_job(job_id)
        loop = asyncio.get_running_loop()

        # Launch training worker in background thread
        threading.Thread(
            target=self._run_training_worker,
            args=(job_id, dataset["path"], base_model_id, clean_adapter_name, output_dir, lora_rank, lora_alpha, learning_rate, epochs, batch_size, target_modules, active, loop),
            daemon=True
        ).start()

        return job_data

    def _run_training_worker(
        self,
        job_id: str,
        dataset_path_str: str,
        base_model_id: str,
        adapter_name: str,
        output_dir: Path,
        lora_rank: int,
        lora_alpha: int,
        learning_rate: float,
        epochs: int,
        batch_size: int,
        target_modules: List[str],
        active: ActiveTrainingJob,
        loop: asyncio.AbstractEventLoop
    ):
        """Synchronous fine-tuning worker executed in separate OS thread"""
        start_time = time.perf_counter()

        def emit_log(step: int, total_steps: int, loss: float, epoch: float, msg: str = "", status: str = "running"):
            elapsed = round(time.perf_counter() - start_time, 1)
            payload = {
                "job_id": job_id,
                "step": step,
                "total_steps": total_steps,
                "loss": round(loss, 4) if loss is not None else None,
                "epoch": round(epoch, 2),
                "elapsed_sec": elapsed,
                "status": status,
                "message": msg
            }
            self.broadcast_log(job_id, payload, loop)
            # Asynchronously update DB
            asyncio.run_coroutine_threadsafe(
                update_training_job_record(
                    job_id,
                    status=status,
                    current_step=step,
                    total_steps=total_steps,
                    current_loss=payload["loss"]
                ),
                loop
            )

        try:
            emit_log(0, 0, None, 0.0, f"Initializing LoRA fine-tuning for '{base_model_id}'...", status="running")

            import torch
            from datasets import load_dataset
            from transformers import (
                AutoModelForCausalLM,
                AutoTokenizer,
                TrainingArguments,
                Trainer,
                DataCollatorForSeq2Seq,
                TrainerCallback
            )
            from peft import LoraConfig, get_peft_model

            if active.stop_event.is_set():
                raise InterruptedError("Training cancelled by user.")

            # Phase 3: resolve model path — prefer D:/models/pytorch/ over HF cache
            from services.model_service import MODELS_DIR
            pytorch_dir = BASE_DIR.parent / "models" / "pytorch"  # D:/models/pytorch
            # Try environment variable path
            import os as _os
            models_root = _os.getenv("MODELS_DIR", "D:/models")
            pytorch_dir = Path(models_root) / "pytorch"

            # Derive folder name from repo_id (e.g. Qwen/Qwen2.5-0.5B-Instruct → Qwen2.5-0.5B-Instruct)
            folder_name = base_model_id.split("/")[-1]
            local_model_path = pytorch_dir / folder_name
            local_model_exists = local_model_path.exists() and (local_model_path / "config.json").exists()

            model_source = str(local_model_path) if local_model_exists else base_model_id
            if local_model_exists:
                emit_log(0, 0, None, 0.0, f"Using local model: D:/models/pytorch/{folder_name}")
            else:
                emit_log(0, 0, None, 0.0, f"Loading from HuggingFace Hub: {base_model_id}")

            emit_log(0, 0, None, 0.0, "Loading base model tokenizer and weights on CPU...")
            tokenizer = AutoTokenizer.from_pretrained(model_source, trust_remote_code=True)
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token

            model = AutoModelForCausalLM.from_pretrained(
                model_source,
                torch_dtype=torch.float32,
                trust_remote_code=True,
                low_cpu_mem_usage=True
            )

            if active.stop_event.is_set():
                raise InterruptedError("Training cancelled by user.")

            emit_log(0, 0, None, 0.0, f"Attaching LoRA adapter (rank={lora_rank}, alpha={lora_alpha})...")
            lora_config = LoraConfig(
                r=lora_rank,
                lora_alpha=lora_alpha,
                target_modules=target_modules,
                lora_dropout=0.05,
                bias="none",
                task_type="CAUSAL_LM"
            )
            peft_model = get_peft_model(model, lora_config)

            emit_log(0, 0, None, 0.0, "Tokenizing and preprocessing dataset...")
            raw_dataset = load_dataset("json", data_files=dataset_path_str, split="train")

            def preprocess_function(examples):
                texts = []
                for row in examples.get("messages", []):
                    if isinstance(row, list):
                        formatted = tokenizer.apply_chat_template(row, tokenize=False, add_generation_prompt=False)
                        texts.append(formatted)
                if not texts:
                    # Check for instruction format fallback
                    instructions = examples.get("instruction", []) or examples.get("prompt", [])
                    responses = examples.get("response", []) or examples.get("completion", [])
                    for ins, resp in zip(instructions, responses):
                        msgs = [{"role": "user", "content": ins}, {"role": "assistant", "content": resp}]
                        texts.append(tokenizer.apply_chat_template(msgs, tokenize=False, add_generation_prompt=False))

                model_inputs = tokenizer(texts, max_length=512, truncation=True, padding=True)
                model_inputs["labels"] = model_inputs["input_ids"].copy()
                return model_inputs

            tokenized_dataset = raw_dataset.map(
                preprocess_function,
                batched=True,
                remove_columns=raw_dataset.column_names
            )

            dataset_size = len(tokenized_dataset)
            emit_log(0, 0, None, 0.0, f"Dataset ready ({dataset_size} examples). Configuring trainer...")

            # Calculate total steps
            grad_accum = 2
            steps_per_epoch = max(1, dataset_size // (batch_size * grad_accum))
            calculated_total_steps = steps_per_epoch * epochs

            class StreamingTrainerCallback(TrainerCallback):
                def __init__(self, total_steps: int):
                    self.total_steps = total_steps
                    self.last_loss = None

                def on_log(self, args, state, control, logs=None, **kwargs):
                    if logs and "loss" in logs:
                        self.last_loss = logs["loss"]
                        emit_log(
                            step=state.global_step,
                            total_steps=self.total_steps or state.max_steps,
                            loss=logs["loss"],
                            epoch=state.epoch or 0.0,
                            msg=f"Step {state.global_step}/{self.total_steps or state.max_steps} — Loss: {logs['loss']:.4f}",
                            status="running"
                        )

                def on_step_end(self, args, state, control, **kwargs):
                    if active.stop_event.is_set():
                        control.should_training_stop = True

            job_checkpoint_dir = TEMP_CHECKPOINTS_DIR / job_id
            job_checkpoint_dir.mkdir(parents=True, exist_ok=True)

            training_args = TrainingArguments(
                output_dir=str(job_checkpoint_dir),
                num_train_epochs=epochs,
                per_device_train_batch_size=batch_size,
                gradient_accumulation_steps=grad_accum,
                learning_rate=learning_rate,
                logging_steps=1,
                save_strategy="no",
                report_to="none",
                use_cpu=True,
                disable_tqdm=True
            )

            callback = StreamingTrainerCallback(calculated_total_steps)

            trainer = Trainer(
                model=peft_model,
                args=training_args,
                train_dataset=tokenized_dataset,
                data_collator=DataCollatorForSeq2Seq(tokenizer, pad_to_multiple_of=8),
                callbacks=[callback]
            )

            emit_log(0, calculated_total_steps, None, 0.0, f"Starting training ({epochs} epochs, {calculated_total_steps} steps)...")
            train_result = trainer.train()

            if active.stop_event.is_set():
                raise InterruptedError("Training cancelled by user.")

            final_loss = round(float(train_result.training_loss), 4) if hasattr(train_result, "training_loss") else callback.last_loss

            # Save adapter and tokenizer
            emit_log(calculated_total_steps, calculated_total_steps, final_loss, float(epochs), f"Saving LoRA adapter to {output_dir.name}...")
            output_dir.mkdir(parents=True, exist_ok=True)
            peft_model.save_pretrained(str(output_dir))
            tokenizer.save_pretrained(str(output_dir))

            # Calculate size
            size_mb = get_dir_size_mb(output_dir)

            # Record adapter in DB
            adapter_record = {
                "id": output_dir.name,
                "name": adapter_name,
                "base_model_id": base_model_id,
                "job_id": job_id,
                "path": str(output_dir),
                "lora_rank": lora_rank,
                "lora_alpha": lora_alpha,
                "final_loss": final_loss,
                "epochs": epochs,
                "size_mb": size_mb
            }
            asyncio.run_coroutine_threadsafe(upsert_adapter_record(adapter_record), loop)

            # Mark completed in DB and broadcast
            asyncio.run_coroutine_threadsafe(
                update_training_job_record(
                    job_id,
                    status="completed",
                    current_step=calculated_total_steps,
                    total_steps=calculated_total_steps,
                    final_loss=final_loss,
                    finished_at=time.strftime("%Y-%m-%d %H:%M:%S")
                ),
                loop
            )
            emit_log(
                calculated_total_steps,
                calculated_total_steps,
                final_loss,
                float(epochs),
                f"Training completed successfully! Adapter saved ({size_mb} MB).",
                status="completed"
            )

        except InterruptedError as e:
            emit_log(0, 0, None, 0.0, "Training cancelled by user.", status="cancelled")
            asyncio.run_coroutine_threadsafe(
                update_training_job_record(job_id, status="cancelled", error="Cancelled by user"),
                loop
            )
        except Exception as e:
            err_msg = str(e)
            emit_log(0, 0, None, 0.0, f"Training failed: {err_msg}", status="failed")
            asyncio.run_coroutine_threadsafe(
                update_training_job_record(job_id, status="failed", error=err_msg),
                loop
            )
        finally:
            # Cleanup temp checkpoints directory
            try:
                import shutil
                shutil.rmtree(str(TEMP_CHECKPOINTS_DIR / job_id), ignore_errors=True)
            except Exception:
                pass

    async def cancel_training_job(self, job_id: str) -> Dict[str, Any]:
        """Signals active training job to stop"""
        active = self.active_jobs.get(job_id)
        if active:
            active.stop_event.set()
            await update_training_job_record(job_id, status="cancelled", error="Cancelled by user")
            return {"job_id": job_id, "status": "cancelled", "message": "Cancellation signal sent."}
        
        job = await get_training_job_record(job_id)
        if job and job["status"] in ("queued", "running"):
            await update_training_job_record(job_id, status="cancelled")
            return {"job_id": job_id, "status": "cancelled", "message": "Job marked as cancelled."}
        
        return {"job_id": job_id, "status": "not_running", "message": "Job is not actively running."}

    async def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        return await get_training_job_record(job_id)

    async def list_jobs(self) -> List[Dict[str, Any]]:
        return await list_training_job_records()

    async def delete_job(self, job_id: str) -> Dict[str, Any]:
        await self.cancel_training_job(job_id)
        await delete_training_job_record(job_id)
        if job_id in self.active_jobs:
            del self.active_jobs[job_id]
        return {"job_id": job_id, "deleted": True}

finetune_service = FineTuneService()
