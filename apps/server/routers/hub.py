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
