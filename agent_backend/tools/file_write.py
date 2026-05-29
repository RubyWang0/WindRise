from pydantic import BaseModel, Field
from typing import Dict, Any
from .base_tool import BaseSystemTool
from agent_backend.core.workspace import WorkspaceManager

class FileWriteArgs(BaseModel):
    file_path: str = Field(..., description="The relative path to the file in the workspace to write to.")
    content: str = Field(..., description="The content to write to the file.")

class FileWriteTool(BaseSystemTool):
    name = "write_file"
    description = "Write content to a file in the current session's workspace."
    args_schema = FileWriteArgs

    def execute(self, params: Dict[str, Any], session_id: str) -> Any:
        try:
            full_path = WorkspaceManager.write_file(session_id, params["file_path"], params["content"])
            return f"Successfully wrote to {params['file_path']}."
        except Exception as e:
            return str(e)
