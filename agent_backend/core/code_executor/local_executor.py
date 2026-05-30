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
            # Execute in the session's workspace directory using subprocess.Popen to allow registration and cancellation
            from agent_backend.core.workflow_state import register_active_subprocess, unregister_active_subprocess, is_stop_requested
            
            proc = subprocess.Popen(
                ['python', '-u', tmp_path],
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            if session_id:
                register_active_subprocess(session_id, proc)
                
            try:
                # Poll process status and user stop flags in a sleep loop
                stdout, stderr = "", ""
                import time
                start_time = time.time()
                timeout = 10.0
                
                while proc.poll() is None:
                    if session_id and is_stop_requested(session_id):
                        proc.terminate()
                        proc.wait()
                        return {"status": "failed", "output": stdout, "error": "Execution stopped by user."}
                    
                    if time.time() - start_time > timeout:
                        proc.terminate()
                        proc.wait()
                        return {"status": "failed", "output": stdout, "error": "Execution timed out (10s limit)"}
                    
                    time.sleep(0.1)
                
                # Retrieve remaining output
                out, err = proc.communicate()
                stdout += out
                stderr += err
                
                status = "success" if proc.returncode == 0 else "failed"
                return {
                    "status": status,
                    "output": stdout,
                    "error": stderr
                }
            finally:
                if session_id:
                    unregister_active_subprocess(session_id, proc)
                    
        except Exception as e:
            return {"status": "failed", "output": "", "error": str(e)}
        finally:
            # Clean up the temp file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
