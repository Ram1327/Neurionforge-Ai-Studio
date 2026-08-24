from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from services.dataset_service import dataset_service

router = APIRouter(prefix="/datasets", tags=["datasets"])

class UploadDatasetJsonRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    content: str

class ValidateDatasetRequest(BaseModel):
    content: str

@router.get("", response_model=List[Dict[str, Any]])
async def list_datasets():
    """List all available datasets"""
    return await dataset_service.list_datasets()

@router.get("/{dataset_id}")
async def get_dataset(dataset_id: str):
    """Retrieve details for a single dataset"""
    dataset = await dataset_service.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset

@router.post("/upload")
async def upload_dataset_json(payload: UploadDatasetJsonRequest):
    """Upload dataset via JSON payload with name and JSONL string content"""
    try:
        data = await dataset_service.save_dataset(payload.name, payload.content)
        return {"status": "ok", "dataset": data}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save dataset: {str(e)}")

@router.post("/upload-file")
async def upload_dataset_file(
    name: str = Form(...),
    file: UploadFile = File(...)
):
    """Upload dataset via multipart file upload (.jsonl or .json)"""
    try:
        content_bytes = await file.read()
        content_str = content_bytes.decode("utf-8")
        data = await dataset_service.save_dataset(name or file.filename or "uploaded_dataset", content_str)
        return {"status": "ok", "dataset": data}
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded text.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save dataset file: {str(e)}")

@router.post("/validate")
async def validate_dataset(payload: ValidateDatasetRequest):
    """Validate JSONL format without saving"""
    is_valid, error, row_count, fmt = dataset_service.validate_jsonl_content(payload.content)
    return {
        "valid": is_valid,
        "error": error,
        "row_count": row_count,
        "format": fmt
    }

@router.delete("/{dataset_id}")
async def delete_dataset(dataset_id: str):
    """Delete a dataset and its local file"""
    res = await dataset_service.delete_dataset(dataset_id)
    if not res.get("deleted"):
        raise HTTPException(status_code=404, detail="Dataset not found")
    return res
