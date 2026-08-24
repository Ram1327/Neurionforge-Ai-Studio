from fastapi import APIRouter, Query, HTTPException
from typing import List, Dict, Any
from services.hub_service import hub_service

router = APIRouter(prefix="/hub", tags=["hub"])

@router.get("/search", response_model=List[Dict[str, Any]])
async def search_hub_models(
    q: str = Query(default="", description="Search query string for HuggingFace models"),
    limit: int = Query(default=20, ge=1, le=50, description="Max results to return")
):
    """Search HuggingFace Hub for GGUF models sorted by downloads"""
    return hub_service.search_models(query=q, limit=limit)

@router.get("/files", response_model=List[Dict[str, Any]])
async def list_repo_files(
    repo_id: str = Query(..., description="HuggingFace model repository ID (e.g. Qwen/Qwen2.5-1.5B-Instruct-GGUF)")
):
    """List all available .gguf files with quantization levels and download statuses in a repo"""
    try:
        return hub_service.list_gguf_files(repo_id=repo_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/pytorch-search", response_model=List[Dict[str, Any]])
async def search_pytorch_models(
    q: str = Query(default="", description="Search query for PyTorch/safetensors models"),
    limit: int = Query(default=20, ge=1, le=50, description="Max results to return")
):
    """Search HuggingFace Hub for full PyTorch/transformers model repos (non-GGUF).
    Returns repos suitable for fine-tuning and GGUF conversion."""
    return hub_service.search_pytorch_models(query=q, limit=limit)

@router.get("/pytorch-info", response_model=Dict[str, Any])
async def get_pytorch_repo_info(
    repo_id: str = Query(..., description="HuggingFace repo ID e.g. Qwen/Qwen2.5-0.5B-Instruct")
):
    """Get detailed info (size, files, download status) for a specific PyTorch model repo."""
    try:
        return hub_service.get_pytorch_repo_info(repo_id=repo_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

