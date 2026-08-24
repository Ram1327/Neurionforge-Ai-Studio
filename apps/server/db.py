import os
import aiosqlite
from pathlib import Path
from typing import List, Optional, Dict, Any

DB_PATH = Path(__file__).resolve().parent / "data" / "studio.db"

async def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS models (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                filename TEXT NOT NULL,
                path TEXT NOT NULL,
                size_gb REAL NOT NULL,
                quantization TEXT NOT NULL,
                context_length INTEGER NOT NULL DEFAULT 4096,
                loaded BOOLEAN NOT NULL DEFAULT 0,
                gpu_layers INTEGER DEFAULT 0,
                last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                model_id TEXT,
                system_prompt TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                tokens_per_sec REAL,
                ttft_ms REAL,
                total_tokens INTEGER,
                total_duration_sec REAL,
                FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS downloads (
                job_id TEXT PRIMARY KEY,
                repo_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                dest_path TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'queued',
                bytes_downloaded INTEGER DEFAULT 0,
                total_bytes INTEGER DEFAULT 0,
                speed_mbps REAL DEFAULT 0.0,
                eta_sec INTEGER,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                finished_at TIMESTAMP,
                error TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS datasets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                filename TEXT NOT NULL,
                path TEXT NOT NULL,
                row_count INTEGER NOT NULL DEFAULT 0,
                size_bytes INTEGER NOT NULL DEFAULT 0,
                format TEXT NOT NULL DEFAULT 'chat',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS training_jobs (
                job_id TEXT PRIMARY KEY,
                base_model_id TEXT NOT NULL,
                dataset_id TEXT NOT NULL,
                adapter_name TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'queued',
                lora_rank INTEGER NOT NULL DEFAULT 16,
                lora_alpha INTEGER NOT NULL DEFAULT 32,
                learning_rate REAL NOT NULL DEFAULT 0.0002,
                epochs INTEGER NOT NULL DEFAULT 3,
                batch_size INTEGER NOT NULL DEFAULT 1,
                target_modules TEXT DEFAULT '["q_proj", "v_proj"]',
                current_step INTEGER DEFAULT 0,
                total_steps INTEGER DEFAULT 0,
                current_loss REAL,
                final_loss REAL,
                output_dir TEXT,
                started_at TIMESTAMP,
                finished_at TIMESTAMP,
                error TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS adapters (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                base_model_id TEXT NOT NULL,
                job_id TEXT,
                path TEXT NOT NULL,
                lora_rank INTEGER DEFAULT 16,
                lora_alpha INTEGER DEFAULT 32,
                final_loss REAL,
                epochs INTEGER DEFAULT 3,
                size_mb REAL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_tested_at TIMESTAMP
            )
        """)
        # Phase 3: conversion jobs table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS convert_jobs (
                job_id TEXT PRIMARY KEY,
                model_id TEXT NOT NULL,
                adapter_id TEXT,
                quantization TEXT NOT NULL DEFAULT 'Q4_K_M',
                output_filename TEXT,
                status TEXT NOT NULL DEFAULT 'queued',
                progress REAL DEFAULT 0.0,
                step TEXT DEFAULT '',
                error TEXT,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                finished_at TIMESTAMP
            )
        """)
        # Phase 3: add format and hf_repo_id columns to models table (gguf or pytorch) if not already present
        try:
            await db.execute("ALTER TABLE models ADD COLUMN format TEXT NOT NULL DEFAULT 'gguf'")
        except Exception:
            pass  # Column already exists
        try:
            await db.execute("ALTER TABLE models ADD COLUMN hf_repo_id TEXT")
        except Exception:
            pass  # Column already exists
        # Fix any existing records that are pytorch models
        await db.execute("UPDATE models SET format = 'pytorch' WHERE id LIKE 'pytorch::%' OR path LIKE '%/pytorch/%' OR path LIKE '%\\pytorch\\%'")
        # Reset any stale loaded state and mark interrupted running downloads/jobs as failed
        await db.execute("UPDATE models SET loaded = 0")
        await db.execute("UPDATE downloads SET status = 'failed', error = 'Server restarted mid-download' WHERE status = 'running'")
        await db.execute("UPDATE training_jobs SET status = 'failed', error = 'Server restarted mid-training' WHERE status = 'running'")
        await db.execute("UPDATE convert_jobs SET status = 'failed', error = 'Server restarted mid-conversion' WHERE status IN ('running', 'queued')")
        await db.commit()

async def get_db_connection() -> aiosqlite.Connection:
    db = await aiosqlite.connect(str(DB_PATH))
    db.row_factory = aiosqlite.Row
    return db

# --- Model Operations ---

async def upsert_model(model_data: Dict[str, Any]):
    model_data.setdefault("format", "gguf")
    model_data.setdefault("hf_repo_id", None)
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute("""
            INSERT INTO models (id, name, filename, path, size_gb, quantization, context_length, loaded, gpu_layers, format, hf_repo_id)
            VALUES (:id, :name, :filename, :path, :size_gb, :quantization, :context_length, :loaded, :gpu_layers, :format, :hf_repo_id)
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                path=excluded.path,
                size_gb=excluded.size_gb,
                quantization=excluded.quantization,
                context_length=excluded.context_length,
                format=excluded.format,
                hf_repo_id=excluded.hf_repo_id
        """, model_data)
        await db.commit()

async def list_models() -> List[Dict[str, Any]]:
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM models ORDER BY name ASC") as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

async def get_model(model_id: str) -> Optional[Dict[str, Any]]:
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM models WHERE id = ?", (model_id,)) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None

async def set_model_loaded(model_id: str, loaded: bool):
    async with aiosqlite.connect(str(DB_PATH)) as db:
        if loaded:
            await db.execute("UPDATE models SET loaded = 0")
            await db.execute("UPDATE models SET loaded = 1, last_used_at = CURRENT_TIMESTAMP WHERE id = ?", (model_id,))
        else:
            await db.execute("UPDATE models SET loaded = 0 WHERE id = ?", (model_id,))
        await db.commit()

async def delete_model_record(model_id: str):
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute("DELETE FROM models WHERE id = ?", (model_id,))
        await db.commit()

# --- Download Job Operations ---

async def create_download_job(job_data: Dict[str, Any]):
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute("""
            INSERT INTO downloads (job_id, repo_id, filename, dest_path, status, bytes_downloaded, total_bytes, started_at)
            VALUES (:job_id, :repo_id, :filename, :dest_path, :status, :bytes_downloaded, :total_bytes, CURRENT_TIMESTAMP)
        """, job_data)
        await db.commit()

async def update_download_job(job_id: str, **fields):
    if not fields:
        return
    set_clauses = [f"{k} = :{k}" for k in fields.keys()]
    query = f"UPDATE downloads SET {', '.join(set_clauses)} WHERE job_id = :job_id"
    params = {**fields, "job_id": job_id}
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute(query, params)
        await db.commit()

async def get_download_job(job_id: str) -> Optional[Dict[str, Any]]:
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM downloads WHERE job_id = ?", (job_id,)) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None

async def list_download_jobs() -> List[Dict[str, Any]]:
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM downloads ORDER BY started_at DESC LIMIT 50") as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

async def delete_download_job_record(job_id: str):
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute("DELETE FROM downloads WHERE job_id = ?", (job_id,))
        await db.commit()

# --- Dataset Operations ---

async def create_dataset_record(dataset_data: Dict[str, Any]):
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute("""
            INSERT INTO datasets (id, name, filename, path, row_count, size_bytes, format, created_at)
            VALUES (:id, :name, :filename, :path, :row_count, :size_bytes, :format, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                row_count = excluded.row_count,
                size_bytes = excluded.size_bytes,
                format = excluded.format
        """, dataset_data)
        await db.commit()

async def list_dataset_records() -> List[Dict[str, Any]]:
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM datasets ORDER BY created_at DESC") as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

async def get_dataset_record(dataset_id: str) -> Optional[Dict[str, Any]]:
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,)) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None

async def delete_dataset_record(dataset_id: str):
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute("DELETE FROM datasets WHERE id = ?", (dataset_id,))
        await db.commit()

# --- Training Job Operations ---

async def create_training_job_record(job_data: Dict[str, Any]):
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute("""
            INSERT INTO training_jobs (
                job_id, base_model_id, dataset_id, adapter_name, status,
                lora_rank, lora_alpha, learning_rate, epochs, batch_size,
                target_modules, current_step, total_steps, current_loss,
                final_loss, output_dir, started_at
            ) VALUES (
                :job_id, :base_model_id, :dataset_id, :adapter_name, :status,
                :lora_rank, :lora_alpha, :learning_rate, :epochs, :batch_size,
                :target_modules, :current_step, :total_steps, :current_loss,
                :final_loss, :output_dir, CURRENT_TIMESTAMP
            )
        """, job_data)
        await db.commit()

async def update_training_job_record(job_id: str, **fields):
    if not fields:
        return
    set_clauses = [f"{k} = :{k}" for k in fields.keys()]
    query = f"UPDATE training_jobs SET {', '.join(set_clauses)} WHERE job_id = :job_id"
    params = {**fields, "job_id": job_id}
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute(query, params)
        await db.commit()

async def get_training_job_record(job_id: str) -> Optional[Dict[str, Any]]:
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM training_jobs WHERE job_id = ?", (job_id,)) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None

async def list_training_job_records() -> List[Dict[str, Any]]:
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM training_jobs ORDER BY started_at DESC LIMIT 50") as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

async def delete_training_job_record(job_id: str):
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute("DELETE FROM training_jobs WHERE job_id = ?", (job_id,))
        await db.commit()

# --- Adapter Operations ---

async def upsert_adapter_record(adapter_data: Dict[str, Any]):
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute("""
            INSERT INTO adapters (
                id, name, base_model_id, job_id, path, lora_rank,
                lora_alpha, final_loss, epochs, size_mb, created_at
            ) VALUES (
                :id, :name, :base_model_id, :job_id, :path, :lora_rank,
                :lora_alpha, :final_loss, :epochs, :size_mb, CURRENT_TIMESTAMP
            )
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                base_model_id = excluded.base_model_id,
                final_loss = excluded.final_loss,
                size_mb = excluded.size_mb
        """, adapter_data)
        await db.commit()

async def list_adapter_records() -> List[Dict[str, Any]]:
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM adapters ORDER BY created_at DESC") as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

async def get_adapter_record(adapter_id: str) -> Optional[Dict[str, Any]]:
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM adapters WHERE id = ?", (adapter_id,)) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None

async def delete_adapter_record(adapter_id: str):
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute("DELETE FROM adapters WHERE id = ?", (adapter_id,))
        await db.commit()

# --- Convert Job Operations (Phase 3) ---

async def create_convert_job(data: Dict[str, Any]):
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute("""
            INSERT INTO convert_jobs (job_id, model_id, adapter_id, quantization, status)
            VALUES (:job_id, :model_id, :adapter_id, :quantization, :status)
        """, data)
        await db.commit()

async def update_convert_job(job_id: str, **kwargs):
    if not kwargs:
        return
    cols = ", ".join(f"{k} = :{k}" for k in kwargs)
    kwargs["job_id"] = job_id
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute(f"UPDATE convert_jobs SET {cols} WHERE job_id = :job_id", kwargs)
        await db.commit()

async def get_convert_job(job_id: str) -> Optional[Dict[str, Any]]:
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM convert_jobs WHERE job_id = ?", (job_id,)) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None

async def list_convert_jobs() -> List[Dict[str, Any]]:
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM convert_jobs ORDER BY started_at DESC LIMIT 20") as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


