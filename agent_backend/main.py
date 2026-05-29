import sys
from pathlib import Path

# Add the parent directory to sys.path to allow absolute imports of agent_backend
current_dir = Path(__file__).resolve().parent.parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from agent_backend.core.settings import settings

from agent_backend.api.v1 import session, agent, task, file
# Import agents to trigger registration
from agent_backend.agent import main_agent

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Agent Workspace Backend MVP"
)

# CORS Middleware (Crucial for frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(session.router, prefix=f"{settings.API_V1_STR}/session", tags=["Session"])
app.include_router(agent.router, prefix=f"{settings.API_V1_STR}/agent", tags=["Agent"])
app.include_router(task.router, prefix=f"{settings.API_V1_STR}/task", tags=["Task"])
app.include_router(file.router, prefix=f"{settings.API_V1_STR}/file", tags=["File"])

# Mount workspace static directory
app.mount("/workspace", StaticFiles(directory=settings.WORKSPACE_BASE_DIR), name="workspace")

@app.get("/")
def read_root():
    return {"message": "Welcome to Agent API"}

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "agent_backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[str(Path(__file__).resolve().parent)]
    )
