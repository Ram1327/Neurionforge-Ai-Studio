import os
import json
import uuid
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional

from db import (
    create_dataset_record,
    list_dataset_records,
    get_dataset_record,
    delete_dataset_record
)

BASE_DIR = Path(__file__).resolve().parent.parent
DATASETS_DIR = BASE_DIR / "data" / "datasets"

class DatasetService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DatasetService, cls).__new__(cls)
            DATASETS_DIR.mkdir(parents=True, exist_ok=True)
        return cls._instance

    def validate_jsonl_content(self, content_str: str) -> Tuple[bool, str, int, str]:
        """
        Validates JSONL dataset content.
        Returns: (is_valid, error_message, row_count, detected_format)
        """
        lines = [l.strip() for l in content_str.strip().splitlines() if l.strip()]
        if not lines:
            return False, "Dataset file is empty.", 0, "unknown"

        detected_format = "unknown"
        valid_rows = 0

        for idx, line in enumerate(lines, 1):
            try:
                obj = json.loads(line)
            except Exception as e:
                return False, f"Line {idx} is invalid JSON: {str(e)}", 0, "unknown"

            if not isinstance(obj, dict):
                return False, f"Line {idx} must be a JSON object", 0, "unknown"

            if "messages" in obj and isinstance(obj["messages"], list):
                if len(obj["messages"]) < 2:
                    return False, f"Line {idx}: 'messages' array must contain at least 2 turns (user and assistant)", 0, "unknown"
                for m in obj["messages"]:
                    if not isinstance(m, dict) or "role" not in m or "content" not in m:
                        return False, f"Line {idx}: each message turn must have 'role' and 'content' fields", 0, "unknown"
                if detected_format == "unknown":
                    detected_format = "chat"
            elif ("instruction" in obj and "response" in obj) or ("prompt" in obj and "completion" in obj):
                if detected_format == "unknown":
                    detected_format = "instruction"
            else:
                return False, (
                    f"Line {idx}: Unsupported format. Each row must either have a 'messages' list "
                    f"or ('instruction', 'response') / ('prompt', 'completion') keys."
                ), 0, "unknown"

            valid_rows += 1

        return True, "", valid_rows, detected_format

    async def ensure_default_dataset(self):
        """Seed starter dataset from data/toy_dataset.jsonl if datasets table is empty"""
        existing = await list_dataset_records()
        toy_file = BASE_DIR / "data" / "toy_dataset.jsonl"
        if not existing and toy_file.exists():
            try:
                content = toy_file.read_text(encoding="utf-8")
                is_valid, _, row_count, fmt = self.validate_jsonl_content(content)
                if is_valid:
                    dest_file = DATASETS_DIR / "toy_dataset.jsonl"
                    dest_file.write_text(content, encoding="utf-8")
                    await create_dataset_record({
                        "id": "toy-neurionforge-v0",
                        "name": "NeurionForge Domain Starter Dataset",
                        "filename": "toy_dataset.jsonl",
                        "path": str(dest_file),
                        "row_count": row_count,
                        "size_bytes": len(content.encode("utf-8")),
                        "format": fmt
                    })
                    print("[DATASET] Seeded default toy dataset into database.")
            except Exception as e:
                print(f"[DATASET] Warning: Could not seed toy dataset: {e}")

    async def save_dataset(self, name: str, content_str: str) -> Dict[str, Any]:
        """Validate and persist new JSONL dataset"""
        is_valid, err, row_count, detected_fmt = self.validate_jsonl_content(content_str)
        if not is_valid:
            raise ValueError(err)

        dataset_id = str(uuid.uuid4())[:8]
        safe_name = "".join(c for c in name if c.isalnum() or c in ("-", "_", " ")).strip() or "dataset"
        filename = f"{dataset_id}_{safe_name.replace(' ', '_')}.jsonl"
        file_path = DATASETS_DIR / filename

        file_path.write_text(content_str, encoding="utf-8")
        size_bytes = len(content_str.encode("utf-8"))


        dataset_data = {
            "id": dataset_id,
            "name": name.strip(),
            "filename": filename,
            "path": str(file_path),
            "row_count": row_count,
            "size_bytes": size_bytes,
            "format": detected_fmt
        }
        await create_dataset_record(dataset_data)
        return dataset_data

    async def list_datasets(self) -> List[Dict[str, Any]]:
        """List all registered datasets"""
        records = await list_dataset_records()
        valid = []
        for r in records:
            if Path(r["path"]).exists():
                valid.append(r)
            else:
                await delete_dataset_record(r["id"])
        return valid

    async def get_dataset(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        record = await get_dataset_record(dataset_id)
        if record and Path(record["path"]).exists():
            return record
        return None

    async def delete_dataset(self, dataset_id: str) -> Dict[str, Any]:
        record = await get_dataset_record(dataset_id)
        if record:
            p = Path(record["path"])
            if p.exists():
                try:
                    p.unlink()
                except Exception as e:
                    print(f"[DATASET] Failed to remove file {p}: {e}")
            await delete_dataset_record(dataset_id)
            return {"id": dataset_id, "deleted": True}
        return {"id": dataset_id, "deleted": False, "message": "Dataset not found"}

dataset_service = DatasetService()
