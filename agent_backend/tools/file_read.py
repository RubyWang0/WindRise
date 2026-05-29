from pydantic import BaseModel, Field
from typing import Dict, Any
from .base_tool import BaseSystemTool
from agent_backend.core.workspace import WorkspaceManager

class FileReadArgs(BaseModel):
    file_path: str = Field(..., description="The relative path to the file in the workspace to read.")

class FileReadTool(BaseSystemTool):
    name = "read_file"
    description = "Read the contents of a file in the current session's workspace."
    args_schema = FileReadArgs

    def execute(self, params: Dict[str, Any], session_id: str) -> Any:
        try:
            content = WorkspaceManager.read_file(session_id, params["file_path"])
            return content
        except Exception as e:
            return str(e)
