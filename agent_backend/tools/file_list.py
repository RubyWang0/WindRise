from pydantic import BaseModel, Field
from typing import Dict, Any, List
from .base_tool import BaseSystemTool
from agent_backend.core.workspace import WorkspaceManager

class FileListArgs(BaseModel):
    pass  # 不需要参数，直接列出当前会话的所有文件

class FileListTool(BaseSystemTool):
    name = "list_files"
    description = "List all files in the current session's workspace. Returns a list of relative file paths."
    args_schema = FileListArgs

    def execute(self, params: Dict[str, Any], session_id: str) -> Any:
        try:
            files = WorkspaceManager.list_files(session_id)
            if not files:
                return "No files found in the current workspace. Please upload files first."
            return files
        except Exception as e:
            return str(e)