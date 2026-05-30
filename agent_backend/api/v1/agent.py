from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
from agent_backend.agent.registry import agent_registry
from agent_backend.core.settings import settings
from agent_backend.core.workflow_state import request_stop, kill_active_subprocess

router = APIRouter()


@router.get("/temperature-start")
async def get_temperature_start():
    """Return the backend's default temperature_start value for frontend initialization."""
    return {"temperature_start": settings.Temperature}


@router.post("/stop")
async def agent_stop(
    session_id: str = Query(..., description="The session ID to stop")
):
    """
    Request a graceful stop of the currently running workflow for the given session.
    The workflow state is preserved (status=paused) so the user can resume later.
    It recursively kills all active child/grandchild processes.
    """
    killed = kill_active_subprocess(session_id)
    return {"success": True, "message": f"Stop requested. Processes killed: {killed}"}


@router.get("/stream")
async def agent_stream(
    session_id: str = Query(..., description="The session ID"),
    service_id: str = Query("main", description="The Agent ID to use"),
    user_input: str = Query(..., description="The user's query or instruction"),
    model_name: str = Query(None, description="The model name to use"),
    api_key: str = Query(None, description="The API key"),
    api_base: str = Query(None, description="The API base URL"),
    temperature: float = Query(None, description="LLM temperature (0.0 - 2.0)"),
    video_configs: str = Query(None, description="Video workflow API configurations as a JSON string"),
    book_configs: str = Query(None, description="Book writing workflow configurations as a JSON string")
):
    """
    Core Streaming API. Pushes Thoughts, Actions, Observations, and Results via SSE.
    """
    agent = agent_registry.get_agent(service_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent/Service {service_id} not found")

    async def event_generator():
        try:
            # Pass AI config to agent
            async for chunk in agent.stream_run(
                session_id=session_id,
                user_input=user_input,
                model_name=model_name,
                api_key=api_key,
                api_base=api_base,
                temperature=temperature,
                video_configs=video_configs,
                book_configs=book_configs
            ):
                yield chunk
        except Exception as e:
            import traceback
            traceback.print_exc()
            yield f"event: error\ndata: {{\"error\": \"{str(e)}\"}}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
