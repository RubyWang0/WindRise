from pydantic import BaseModel, Field
from typing import Dict, Any
from .base_tool import BaseSystemTool
from agent_backend.core.code_executor.local_executor import LocalCodeExecutor

class PythonExecutorArgs(BaseModel):
    code: str = Field(..., description="The Python code to execute.")

class PythonExecutorTool(BaseSystemTool):
    name = "execute_python"
    description = "Execute Python code in the current session workspace and get the output. Use this to run scripts or perform calculations."
    args_schema = PythonExecutorArgs

    def __init__(self):
        self.executor = LocalCodeExecutor()

    def execute(self, params: Dict[str, Any], session_id: str) -> Any:
        try:
            result = self.executor.run(params["code"], language="python", session_id=session_id)
            if result["status"] == "success":
                return f"Output:\n{result['output']}"
            else:
                return f"Error:\n{result['error']}"
        except Exception as e:
            return str(e)
