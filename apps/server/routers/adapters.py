from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from services.adapter_service import adapter_service

router = APIRouter(prefix="/adapters", tags=["adapters"])

class ChatMessageModel(BaseModel):
    role: str
    content: str

class TestAdapterRequest(BaseModel):
    messages: List[ChatMessageModel]
    max_tokens: int = Field(default=128, ge=1, le=1024)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)

@router.get("", response_model=List[Dict[str, Any]])
async def list_adapters():
    """List all trained LoRA adapters"""
    return await adapter_service.list_adapters()

@router.get("/{adapter_id}")
async def get_adapter(adapter_id: str):
    """Get metadata for a specific LoRA adapter"""
    adapter = await adapter_service.get_adapter(adapter_id)
    if not adapter:
        raise HTTPException(status_code=404, detail="Adapter not found")
    return adapter

@router.post("/{adapter_id}/test-chat")
async def test_adapter_chat(adapter_id: str, payload: TestAdapterRequest):
    """Run an interactive test chat against the base model + LoRA adapter"""
    try:
        messages = [{"role": m.role, "content": m.content} for m in payload.messages]
        result = await adapter_service.test_adapter_chat(
            adapter_id=adapter_id,
            messages=messages,
            max_tokens=payload.max_tokens,
            temperature=payload.temperature
        )
        return {"status": "ok", "adapter_id": adapter_id, **result}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error with adapter: {str(e)}")

@router.delete("/{adapter_id}")
async def delete_adapter(adapter_id: str):
    """Delete a trained LoRA adapter and its files"""
    res = await adapter_service.delete_adapter(adapter_id)
    if not res.get("deleted"):
        raise HTTPException(status_code=404, detail="Adapter not found")
    return res
