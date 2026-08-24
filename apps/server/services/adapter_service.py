import os
import json
import time
import shutil
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional

from db import (
    upsert_adapter_record,
    list_adapter_records,
    get_adapter_record,
    delete_adapter_record
)

BASE_DIR = Path(__file__).resolve().parent.parent
ADAPTERS_DIR = BASE_DIR / "adapters"

def get_dir_size_mb(path: Path) -> float:
    if not path.exists():
        return 0.0
    total = sum(f.stat().st_size for f in path.glob("**/*") if f.is_file())
    return round(total / (1024 * 1024), 2)

class AdapterService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AdapterService, cls).__new__(cls)
            ADAPTERS_DIR.mkdir(parents=True, exist_ok=True)
        return cls._instance

    async def scan_adapters(self) -> List[Dict[str, Any]]:
        """Scan adapters directory and synchronize DB"""
        if not ADAPTERS_DIR.exists():
            return []

        for adapter_folder in ADAPTERS_DIR.iterdir():
            if adapter_folder.is_dir():
                config_file = adapter_folder / "adapter_config.json"
                weights_bin = adapter_folder / "adapter_model.bin"
                weights_safetensors = adapter_folder / "adapter_model.safetensors"

                if config_file.exists() or weights_bin.exists() or weights_safetensors.exists():
                    adapter_id = adapter_folder.name
                    size_mb = get_dir_size_mb(adapter_folder)
                    
                    base_model_id = "Qwen/Qwen2.5-1.5B-Instruct"
                    lora_rank = 16
                    lora_alpha = 32

                    if config_file.exists():
                        try:
                            cfg = json.loads(config_file.read_text(encoding="utf-8"))
                            base_model_id = cfg.get("base_model_name_or_path", base_model_id)
                            lora_rank = cfg.get("r", lora_rank)
                            lora_alpha = cfg.get("lora_alpha", lora_alpha)
                        except Exception:
                            pass

                    # Clean readable name
                    clean_name = adapter_id.replace("-", " ").replace("_", " ").title()

                    adapter_data = {
                        "id": adapter_id,
                        "name": clean_name,
                        "base_model_id": base_model_id,
                        "job_id": None,
                        "path": str(adapter_folder),
                        "lora_rank": lora_rank,
                        "lora_alpha": lora_alpha,
                        "final_loss": None,
                        "epochs": 3,
                        "size_mb": size_mb
                    }
                    await upsert_adapter_record(adapter_data)

        # Retrieve valid adapters
        db_records = await list_adapter_records()
        valid = []
        for r in db_records:
            if Path(r["path"]).exists():
                valid.append(r)
            else:
                await delete_adapter_record(r["id"])
        return valid

    async def list_adapters(self) -> List[Dict[str, Any]]:
        return await self.scan_adapters()

    async def get_adapter(self, adapter_id: str) -> Optional[Dict[str, Any]]:
        record = await get_adapter_record(adapter_id)
        if record and Path(record["path"]).exists():
            return record
        return None

    async def delete_adapter(self, adapter_id: str) -> Dict[str, Any]:
        record = await get_adapter_record(adapter_id)
        if record:
            p = Path(record["path"])
            if p.exists() and p.is_dir():
                try:
                    shutil.rmtree(p)
                except Exception as e:
                    print(f"[ADAPTER] Error deleting folder {p}: {e}")
            await delete_adapter_record(adapter_id)
            return {"id": adapter_id, "deleted": True}
        return {"id": adapter_id, "deleted": False, "message": "Adapter not found"}

    async def test_adapter_chat(
        self,
        adapter_id: str,
        messages: List[Dict[str, str]],
        max_tokens: int = 128,
        temperature: float = 0.7
    ) -> Dict[str, Any]:
        """Runs test inference on CPU with base model + PEFT adapter"""
        record = await self.get_adapter(adapter_id)
        if not record:
            raise FileNotFoundError(f"Adapter '{adapter_id}' not found.")

        adapter_path = record["path"]
        base_model_id = record.get("base_model_id") or "Qwen/Qwen2.5-1.5B-Instruct"

        def _run_test():
            import torch
            from transformers import AutoModelForCausalLM, AutoTokenizer
            from peft import PeftModel

            start_t = time.perf_counter()

            tokenizer = AutoTokenizer.from_pretrained(adapter_path, trust_remote_code=True)
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token

            # Load base model on CPU
            base_model = AutoModelForCausalLM.from_pretrained(
                base_model_id,
                torch_dtype=torch.float32,
                trust_remote_code=True,
                low_cpu_mem_usage=True
            )

            # Load PEFT adapter
            peft_model = PeftModel.from_pretrained(base_model, adapter_path)
            peft_model.eval()

            # Format input
            formatted_prompt = tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True
            )
            inputs = tokenizer(formatted_prompt, return_tensors="pt")

            gen_start = time.perf_counter()
            with torch.no_grad():
                outputs = peft_model.generate(
                    **inputs,
                    max_new_tokens=max_tokens,
                    temperature=max(0.1, temperature),
                    do_sample=temperature > 0.0,
                    pad_token_id=tokenizer.pad_token_id
                )
            gen_dur = time.perf_counter() - gen_start
            total_dur = time.perf_counter() - start_t

            new_tokens = outputs[0][inputs.input_ids.shape[1]:]
            response_text = tokenizer.decode(new_tokens, skip_special_tokens=True).strip()
            num_tokens = len(new_tokens)
            tps = round(num_tokens / gen_dur, 2) if gen_dur > 0 else 0.0

            return {
                "response": response_text,
                "stats": {
                    "total_tokens": num_tokens,
                    "tokens_per_sec": tps,
                    "gen_duration_sec": round(gen_dur, 2),
                    "total_duration_sec": round(total_dur, 2)
                }
            }

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _run_test)

adapter_service = AdapterService()
