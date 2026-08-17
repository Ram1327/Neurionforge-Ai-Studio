import time
import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from services.model_service import model_service

router = APIRouter(tags=["inference"])

class ChatMessageModel(BaseModel):
    role: str
    content: str

class InferenceRequestModel(BaseModel):
    model_id: Optional[str] = None
    messages: List[ChatMessageModel]
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    top_p: float = Field(default=0.9, ge=0.0, le=1.0)
    max_tokens: int = Field(default=512, ge=1, le=4096)
    system_prompt: Optional[str] = None

@router.websocket("/ws/inference")
async def websocket_inference(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            # Wait for client request message
            data_raw = await websocket.receive_text()
            try:
                data = json.loads(data_raw)
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "token": "",
                    "finished": true,
                    "error": "Invalid JSON format."
                }))
                continue

            model_id = data.get("model_id")
            messages_in = data.get("messages", [])
            temperature = float(data.get("temperature", 0.7))
            top_p = float(data.get("top_p", 0.9))
            max_tokens = int(data.get("max_tokens", 512))
            system_prompt = data.get("system_prompt")

            # Check if model is loaded or needs to be loaded
            if model_service.loaded_model is None:
                if model_id:
                    try:
                        await websocket.send_text(json.dumps({
                            "token": f"Loading model {model_id} into memory...\n\n",
                            "finished": False
                        }))
                        await model_service.load_model(model_id)
                    except Exception as e:
                        await websocket.send_text(json.dumps({
                            "token": "",
                            "finished": True,
                            "error": f"Failed to load model: {str(e)}"
                        }))
                        continue
                else:
                    await websocket.send_text(json.dumps({
                        "token": "",
                        "finished": True,
                        "error": "No model is currently loaded. Please select and load a model first."
                    }))
                    continue
            elif model_id and model_id != model_service.active_model_id:
                # Switch model if a different one was requested
                try:
                    await websocket.send_text(json.dumps({
                        "token": f"Switching to model {model_id}...\n\n",
                        "finished": False
                    }))
                    await model_service.load_model(model_id)
                except Exception as e:
                    await websocket.send_text(json.dumps({
                        "token": "",
                        "finished": True,
                        "error": f"Failed to load model: {str(e)}"
                    }))
                    continue

            # Build messages payload with optional system prompt injection
            formatted_messages = []
            has_system = False

            for m in messages_in:
                if m.get("role") == "system":
                    has_system = True
                    content = system_prompt if system_prompt else m.get("content", "")
                    formatted_messages.append({"role": "system", "content": content})
                else:
                    formatted_messages.append({"role": m.get("role"), "content": m.get("content", "")})

            if not has_system and system_prompt:
                formatted_messages.insert(0, {"role": "system", "content": system_prompt})
            elif not has_system:
                formatted_messages.insert(0, {
                    "role": "system",
                    "content": "You are NeurionForge AI, an intelligent, concise, and helpful local AI assistant."
                })

            llm = model_service.loaded_model
            model_service.last_activity_time = time.time()

            start_time = time.perf_counter()
            first_token_time = None
            token_count = 0

            # Queue for streaming from sync generator in thread executor
            token_queue = asyncio.Queue()
            loop = asyncio.get_running_loop()

            def run_sync_stream():
                try:
                    stream = llm.create_chat_completion(
                        messages=formatted_messages,
                        temperature=temperature,
                        top_p=top_p,
                        max_tokens=max_tokens,
                        stream=True
                    )
                    for chunk in stream:
                        choices = chunk.get("choices", [])
                        if choices:
                            delta = choices[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                loop.call_soon_threadsafe(token_queue.put_nowait, ("token", content))
                    loop.call_soon_threadsafe(token_queue.put_nowait, ("done", None))
                except Exception as ex:
                    loop.call_soon_threadsafe(token_queue.put_nowait, ("error", str(ex)))

            # Start streaming worker thread
            stream_future = loop.run_in_executor(None, run_sync_stream)

            # Consume from queue and send over WebSocket
            while True:
                msg_type, payload = await token_queue.get()
                if msg_type == "token":
                    if first_token_time is None:
                        first_token_time = time.perf_counter()
                    token_count += 1
                    await websocket.send_text(json.dumps({
                        "token": payload,
                        "finished": False
                    }))
                elif msg_type == "error":
                    await websocket.send_text(json.dumps({
                        "token": "",
                        "finished": True,
                        "error": payload
                    }))
                    break
                elif msg_type == "done":
                    end_time = time.perf_counter()
                    total_dur = end_time - start_time
                    ttft_ms = ((first_token_time - start_time) * 1000) if first_token_time else 0.0
                    gen_time = (end_time - first_token_time) if first_token_time else total_dur
                    tps = (token_count / gen_time) if gen_time > 0 else 0.0

                    stats = {
                        "tokens_per_sec": round(tps, 2),
                        "ttft_ms": round(ttft_ms, 1),
                        "total_tokens": token_count,
                        "total_duration_sec": round(total_dur, 2)
                    }

                    await websocket.send_text(json.dumps({
                        "token": "",
                        "finished": True,
                        "stats": stats
                    }))
                    break

            await stream_future

    except WebSocketDisconnect:
        # Client disconnected cleanly
        pass
    except Exception as e:
        try:
            await websocket.send_text(json.dumps({
                "token": "",
                "finished": True,
                "error": f"Inference session exception: {str(e)}"
            }))
        except:
            pass

@router.post("/inference/chat")
async def sync_chat_completion(request: InferenceRequestModel):
    """Synchronous REST endpoint for testing chat completion"""
    if model_service.loaded_model is None:
        if request.model_id:
            await model_service.load_model(request.model_id)
        else:
            raise HTTPException(status_code=400, detail="No model loaded. Please load a model first.")

    llm = model_service.loaded_model
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    if request.system_prompt and not any(m.role == "system" for m in request.messages):
        messages.insert(0, {"role": "system", "content": request.system_prompt})

    start = time.perf_counter()
    resp = llm.create_chat_completion(
        messages=messages,
        temperature=request.temperature,
        top_p=request.top_p,
        max_tokens=request.max_tokens,
        stream=False
    )
    duration = time.perf_counter() - start

    choices = resp.get("choices", [])
    content = choices[0].get("message", {}).get("content", "") if choices else ""
    usage = resp.get("usage", {})
    total_tokens = usage.get("completion_tokens", 0)
    tps = round(total_tokens / duration, 2) if duration > 0 else 0.0

    return {
        "content": content,
        "stats": {
            "tokens_per_sec": tps,
            "ttft_ms": round(duration * 1000, 1),
            "total_tokens": total_tokens,
            "total_duration_sec": round(duration, 2)
        }
    }
