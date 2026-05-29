from fastapi import APIRouter, Query
from agent_backend.core.memory.memory_store import memory_store

router = APIRouter()

@router.get("/status")
async def task_status(session_id: str = Query(...), task_id: str = Query(...)):
    """
    Query task execution status.
    """
    state = memory_store.get_task_state(session_id, task_id)
    return {"status": "success", "data": state}

@router.post("/terminate")
async def task_terminate(session_id: str, task_id: str):
    """
    Terminate a running task.
    """
    # MVP: Mock termination
    memory_store.set_task_state(session_id, task_id, {"status": "terminated"})
    return {"status": "success", "message": "Task terminated"}
