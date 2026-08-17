from fastapi import APIRouter, HTTPException, Path
from typing import List, Dict, Any
from services.model_service import model_service

router = APIRouter(prefix="/models", tags=["models"])

@router.get("", response_model=List[Dict[str, Any]])
async def get_models():
    """List all available models in the models directory"""
    return await model_service.scan_models()

@router.post("/scan", response_model=List[Dict[str, Any]])
async def scan_models():
    """Force re-scan of the models directory"""
    return await model_service.scan_models()

@router.post("/{model_id}/load")
async def load_model(model_id: str):
    """Load a specific model into memory"""
    try:
        res = await model_service.load_model(model_id)
        return res
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")

@router.post("/{model_id}/unload")
async def unload_model(model_id: str):
    """Unload the specified model from memory"""
    try:
        return await model_service.unload_model(model_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unload model: {str(e)}")

@router.post("/unload")
async def unload_active_model():
    """Unload currently active model"""
    try:
        return await model_service.unload_model()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unload model: {str(e)}")
