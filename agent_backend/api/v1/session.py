from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid
from agent_backend.core.workspace import WorkspaceManager
from agent_backend.core.memory.memory_store import memory_store

router = APIRouter()

class SessionCreateResponse(BaseModel):
    session_id: str
    message: str

@router.post("/create", response_model=SessionCreateResponse)
async def create_session():
    """
    Create an independent Session (allocates workspace and memory).
    """
    session_id = str(uuid.uuid4())
    # Create workspace
    WorkspaceManager.create_workspace(session_id)
    # Clear any stale memory just in case
    memory_store.clear_session(session_id)
    
    return SessionCreateResponse(session_id=session_id, message="Session created successfully")
