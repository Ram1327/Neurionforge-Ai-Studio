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
        # Reset any stale loaded state from previous runtime crashes
        await db.execute("UPDATE models SET loaded = 0")
        await db.commit()

async def get_db_connection() -> aiosqlite.Connection:
    db = await aiosqlite.connect(str(DB_PATH))
    db.row_factory = aiosqlite.Row
    return db

async def upsert_model(model_data: Dict[str, Any]):
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute("""
            INSERT INTO models (id, name, filename, path, size_gb, quantization, context_length, loaded, gpu_layers)
            VALUES (:id, :name, :filename, :path, :size_gb, :quantization, :context_length, :loaded, :gpu_layers)
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                path=excluded.path,
                size_gb=excluded.size_gb,
                quantization=excluded.quantization,
                context_length=excluded.context_length
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
            # Only one model can be active at a time
            await db.execute("UPDATE models SET loaded = 0")
            await db.execute("UPDATE models SET loaded = 1, last_used_at = CURRENT_TIMESTAMP WHERE id = ?", (model_id,))
        else:
            await db.execute("UPDATE models SET loaded = 0 WHERE id = ?", (model_id,))
        await db.commit()
