"""
Model Downloader for NeurionForge AI Studio
Downloads Qwen2.5-1.5B-Instruct-Q4_K_M.gguf to MODELS_DIR (D:/models)
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from huggingface_hub import hf_hub_download

# Load environment variables
dotenv_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path)

MODELS_DIR = os.getenv("MODELS_DIR", "D:/models")
REPO_ID = "Qwen/Qwen2.5-1.5B-Instruct-GGUF"
FILENAME = "qwen2.5-1.5b-instruct-q4_k_m.gguf"

def ensure_model_downloaded() -> Path:
    models_path = Path(MODELS_DIR)
    models_path.mkdir(parents=True, exist_ok=True)
    target_file = models_path / FILENAME

    if target_file.exists():
        size_mb = target_file.stat().st_size / (1024 * 1024)
        print(f"[OK] Model already exists at {target_file} ({size_mb:.2f} MB)")
        return target_file

    print(f"Downloading {FILENAME} from {REPO_ID} to {models_path}...")
    downloaded_path = hf_hub_download(
        repo_id=REPO_ID,
        filename=FILENAME,
        local_dir=str(models_path),
        local_dir_use_symlinks=False
    )
    print(f"[OK] Download completed: {downloaded_path}")
    return Path(downloaded_path)

if __name__ == "__main__":
    try:
        ensure_model_downloaded()
    except Exception as e:
        print(f"[ERROR] Failed to download model: {e}", file=sys.stderr)
        sys.exit(1)
