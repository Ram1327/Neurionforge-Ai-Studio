import os
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
from huggingface_hub import HfApi, hf_hub_url
from services.model_service import parse_quantization, MODELS_DIR

api = HfApi()

# Curated top verified local LLMs for the Home view
FEATURED_REPOS = [
    "Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF",
    "Qwen/Qwen2.5-Coder-7B-Instruct-GGUF",
    "bartowski/Llama-3.2-3B-Instruct-GGUF",
    "unsloth/DeepSeek-R1-Distill-Qwen-1.5B-GGUF",
    "bartowski/DeepSeek-R1-Distill-Qwen-7B-GGUF",
    "bartowski/Mistral-7B-Instruct-v0.3-GGUF",
    "bartowski/gemma-2-2b-it-GGUF",
    "bartowski/Phi-3.5-mini-instruct-GGUF",
    "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
    "bartowski/Llama-3.2-1B-Instruct-GGUF",
]

# Curated featured PyTorch model repos for the PyTorch home view
FEATURED_PYTORCH_REPOS = [
    "Qwen/Qwen2.5-0.5B-Instruct",
    "Qwen/Qwen2.5-1.5B-Instruct",
    "Qwen/Qwen2.5-3B-Instruct",
    "Qwen/Qwen2.5-7B-Instruct",
    "Qwen/Qwen2.5-Coder-1.5B-Instruct",
    "Qwen/Qwen2.5-Coder-7B-Instruct",
    "meta-llama/Llama-3.2-1B-Instruct",
    "meta-llama/Llama-3.2-3B-Instruct",
    "google/gemma-2-2b-it",
    "microsoft/Phi-3.5-mini-instruct",
    "mistralai/Mistral-7B-Instruct-v0.3",
    "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B",
]

class HubService:
    def search_models(self, query: str = "", limit: int = 24) -> List[Dict[str, Any]]:
        """Search HuggingFace Hub for GGUF models, prioritizing featured models when query is empty"""
        search_query = query.strip() if query else ""
        results = []
        seen_repos = set()

        # If query is empty, first fetch metadata for curated featured models
        if not search_query:
            for repo_id in FEATURED_REPOS:
                try:
                    info = api.model_info(repo_id)
                    parts = repo_id.split("/")
                    author = parts[0] if len(parts) > 1 else "community"
                    model_name = parts[1] if len(parts) > 1 else parts[0]
                    seen_repos.add(repo_id.lower())
                    results.append({
                        "repo_id": repo_id,
                        "author": author,
                        "model_name": model_name,
                        "downloads": getattr(info, "downloads", 0) or 0,
                        "likes": getattr(info, "likes", 0) or 0,
                        "last_modified": str(getattr(info, "last_modified", "") or ""),
                        "tags": getattr(info, "tags", []) or [],
                        "pipeline_tag": getattr(info, "pipeline_tag", "text-generation") or "text-generation",
                        "featured": True
                    })
                except Exception:
                    pass

        # Live HuggingFace Hub search
        try:
            hf_search = search_query if search_query else None
            models = api.list_models(
                search=hf_search,
                filter="gguf",
                limit=limit,
                sort="downloads",
                full=False
            )
            
            for m in models:
                repo_id = m.id
                if repo_id.lower() in seen_repos:
                    continue
                seen_repos.add(repo_id.lower())

                parts = repo_id.split("/")
                author = parts[0] if len(parts) > 1 else "community"
                model_name = parts[1] if len(parts) > 1 else parts[0]

                results.append({
                    "repo_id": repo_id,
                    "author": author,
                    "model_name": model_name,
                    "downloads": getattr(m, "downloads", 0) or 0,
                    "likes": getattr(m, "likes", 0) or 0,
                    "last_modified": str(getattr(m, "last_modified", "") or ""),
                    "tags": getattr(m, "tags", []) or [],
                    "pipeline_tag": getattr(m, "pipeline_tag", "text-generation") or "text-generation",
                    "featured": False
                })
        except Exception as e:
            print(f"[ERROR] Hub search failed: {e}")

        return results[:limit] if search_query else results

    def search_pytorch_models(self, query: str = "", limit: int = 20) -> List[Dict[str, Any]]:
        """Search HuggingFace Hub for full PyTorch/transformers model repos (non-GGUF).
        Returns repos suitable for fine-tuning and later GGUF conversion."""
        search_query = query.strip() if query else ""
        results = []
        seen_repos = set()

        pytorch_dir = Path(MODELS_DIR) / "pytorch"

        def _already_downloaded(repo_id: str) -> bool:
            folder = repo_id.split("/")[-1]
            dest = pytorch_dir / folder
            return dest.exists() and (dest / "config.json").exists()

        def _build_result(repo_id: str, info_obj, featured: bool) -> Dict[str, Any]:
            parts = repo_id.split("/")
            author = parts[0] if len(parts) > 1 else "community"
            model_name = parts[1] if len(parts) > 1 else parts[0]

            # Best-effort size estimate from siblings
            size_bytes = 0
            try:
                for s in (getattr(info_obj, "siblings", None) or []):
                    fname = getattr(s, "rfilename", "") or ""
                    if fname.endswith((".safetensors", ".bin")):
                        size_bytes += getattr(s, "size", 0) or 0
            except Exception:
                pass
            size_gb = round(size_bytes / (1024 ** 3), 2) if size_bytes else None

            tags = getattr(info_obj, "tags", []) or []
            pipeline_tag = getattr(info_obj, "pipeline_tag", None) or "text-generation"

            return {
                "repo_id": repo_id,
                "author": author,
                "model_name": model_name,
                "downloads": getattr(info_obj, "downloads", 0) or 0,
                "likes": getattr(info_obj, "likes", 0) or 0,
                "last_modified": str(getattr(info_obj, "last_modified", "") or ""),
                "tags": tags,
                "pipeline_tag": pipeline_tag,
                "size_gb": size_gb,
                "featured": featured,
                "already_downloaded": _already_downloaded(repo_id),
            }

        # If no query, show curated featured PyTorch repos first
        if not search_query:
            for repo_id in FEATURED_PYTORCH_REPOS:
                try:
                    info = api.model_info(repo_id, files_metadata=True)
                    seen_repos.add(repo_id.lower())
                    results.append(_build_result(repo_id, info, featured=True))
                except Exception:
                    pass

        # Live HF Hub search for transformers/safetensors models
        try:
            hf_search = search_query if search_query else None
            models = api.list_models(
                search=hf_search,
                library="transformers",
                limit=limit,
                sort="downloads",
                full=False,
            )
            for m in models:
                repo_id = m.id
                if repo_id.lower() in seen_repos:
                    continue
                # Skip pure GGUF repos in the PyTorch results
                repo_tags = getattr(m, "tags", []) or []
                if "gguf" in [t.lower() for t in repo_tags]:
                    continue
                seen_repos.add(repo_id.lower())
                results.append(_build_result(repo_id, m, featured=False))
        except Exception as e:
            print(f"[ERROR] PyTorch hub search failed: {e}")

        return results[:limit]

    def get_pytorch_repo_info(self, repo_id: str) -> Dict[str, Any]:
        """Get detailed info about a specific PyTorch repo including file list."""
        try:
            info = api.model_info(repo_id, files_metadata=True)
            pytorch_dir = Path(MODELS_DIR) / "pytorch"
            folder = repo_id.split("/")[-1]
            dest = pytorch_dir / folder
            already_downloaded = dest.exists() and (dest / "config.json").exists()

            # Collect relevant files
            files = []
            size_bytes = 0
            for s in (getattr(info, "siblings", None) or []):
                fname = getattr(s, "rfilename", "") or ""
                sz = getattr(s, "size", 0) or 0
                ext = fname.rsplit(".", 1)[-1].lower() if "." in fname else ""
                if ext in ("safetensors", "bin", "json", "model", "txt", "tokenizer"):
                    if ext in ("safetensors", "bin"):
                        size_bytes += sz
                    files.append({"filename": fname, "size_bytes": sz})

            size_gb = round(size_bytes / (1024 ** 3), 2) if size_bytes else None
            parts = repo_id.split("/")
            return {
                "repo_id": repo_id,
                "model_name": parts[-1],
                "author": parts[0] if len(parts) > 1 else "community",
                "size_gb": size_gb,
                "already_downloaded": already_downloaded,
                "dest_path": str(dest),
                "pipeline_tag": getattr(info, "pipeline_tag", None) or "text-generation",
                "tags": getattr(info, "tags", []) or [],
                "files": files[:30],  # cap at 30 for display
            }
        except Exception as e:
            raise RuntimeError(f"Could not retrieve repo info for '{repo_id}': {e}")

    def list_gguf_files(self, repo_id: str) -> List[Dict[str, Any]]:
        """List all .gguf files in a HuggingFace repository with sizes and local presence check"""
        try:
            model_info = api.model_info(repo_id, files_metadata=True)
            files = []
            models_path = Path(MODELS_DIR)

            for sibling in getattr(model_info, "siblings", []):
                rfilename = sibling.rfilename
                if not rfilename.lower().endswith(".gguf"):
                    continue

                size_bytes = getattr(sibling, "size", 0) or 0
                size_gb = round(size_bytes / (1024 ** 3), 2) if size_bytes else 0.0
                quant = parse_quantization(rfilename)
                
                base_filename = Path(rfilename).name
                is_mmproj = "mmproj" in base_filename.lower()

                # Check if file already exists in D:/models
                local_file = models_path / base_filename
                already_downloaded = local_file.exists() and local_file.stat().st_size > 0

                try:
                    download_url = hf_hub_url(repo_id, rfilename)
                except Exception:
                    download_url = f"https://huggingface.co/{repo_id}/resolve/main/{rfilename}"

                files.append({
                    "filename": base_filename,
                    "rfilename": rfilename,
                    "repo_id": repo_id,
                    "size_gb": size_gb,
                    "size_bytes": size_bytes,
                    "quantization": quant,
                    "already_downloaded": already_downloaded,
                    "is_mmproj": is_mmproj,
                    "url": download_url
                })

            # Sort files by size ascending (e.g. Q4 before Q8)
            files.sort(key=lambda f: f["size_gb"])
            return files
        except Exception as e:
            print(f"[ERROR] Failed to list GGUF files for repo {repo_id}: {e}")
            raise RuntimeError(f"Could not retrieve files for '{repo_id}': {str(e)}")

hub_service = HubService()
