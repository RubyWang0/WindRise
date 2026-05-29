from fastapi import APIRouter, Query, HTTPException, UploadFile, File
from agent_backend.core.workspace import WorkspaceManager
import os

router = APIRouter()

@router.get("/list")
async def list_files(session_id: str = Query(...)):
    """
    List files in the current Session workspace.
    """
    files = WorkspaceManager.list_files(session_id)
    return {"status": "success", "data": files}

@router.post("/upload")
async def upload_file(
    session_id: str = Query(...), 
    relative_path: str = Query(None),
    file: UploadFile = File(...)
):
    try:
        content = await file.read()
        # If relative_path is provided (from folder upload), use it, otherwise use filename
        save_path = relative_path if relative_path else file.filename
        WorkspaceManager.write_file_binary(session_id, save_path, content)
        return {"status": "success", "message": f"File {save_path} uploaded."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
