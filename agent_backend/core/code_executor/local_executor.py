import subprocess
import tempfile
import os
from typing import Dict, Any
from .base_executor import BaseCodeExecutor
from .security import check_code_safety
from agent_backend.core.workspace import WorkspaceManager

class LocalCodeExecutor(BaseCodeExecutor):
    def run(self, code: str, language: str = "python", session_id: str = None) -> Dict[str, Any]:
        if language.lower() != "python":
            return {"status": "failed", "output": "", "error": f"Unsupported language: {language}"}
            
        # Basic security check
        is_safe, reason = check_code_safety(code)
        if not is_safe:
            return {"status": "failed", "output": "", "error": f"Security check failed: {reason}"}
            
        # Determine working directory
        cwd = WorkspaceManager.get_session_dir(session_id) if session_id else os.getcwd()
        os.makedirs(cwd, exist_ok=True)
            
        # Write code to a temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, dir=cwd, encoding='utf-8') as tmp_file:
            tmp_file.write(code)
            tmp_path = tmp_file.name
            
        try:
            # Execute in the session's workspace directory
            result = subprocess.run(
                ['python', tmp_path],
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=10 # 10 seconds timeout
            )
            status = "success" if result.returncode == 0 else "failed"
            return {
                "status": status,
                "output": result.stdout,
                "error": result.stderr
            }
        except subprocess.TimeoutExpired:
            return {"status": "failed", "output": "", "error": "Execution timed out (10s limit)"}
        except Exception as e:
            return {"status": "failed", "output": "", "error": str(e)}
        finally:
            # Clean up the temp file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
