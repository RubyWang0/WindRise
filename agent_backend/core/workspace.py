import os
import shutil
from typing import List
from agent_backend.core.settings import settings

class WorkspaceManager:
    @staticmethod
    def get_session_dir(session_id: str) -> str:
        return os.path.join(settings.WORKSPACE_BASE_DIR, session_id)
        
    @staticmethod
    def create_workspace(session_id: str) -> str:
        session_dir = WorkspaceManager.get_session_dir(session_id)
        os.makedirs(session_dir, exist_ok=True)
        return session_dir
        
    @staticmethod
    def delete_workspace(session_id: str) -> bool:
        session_dir = WorkspaceManager.get_session_dir(session_id)
        if os.path.exists(session_dir):
            shutil.rmtree(session_dir)
            return True
        return False
        
    @staticmethod
    def list_files(session_id: str) -> List[str]:
        session_dir = WorkspaceManager.get_session_dir(session_id)
        if not os.path.exists(session_dir):
            return []
        
        files = []
        for root, _, filenames in os.walk(session_dir):
            for filename in filenames:
                rel_path = os.path.relpath(os.path.join(root, filename), session_dir)
                files.append(rel_path)
        return files
        
    @staticmethod
    def read_file(session_id: str, file_path: str) -> str:
        full_path = os.path.join(WorkspaceManager.get_session_dir(session_id), file_path)
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"File {file_path} not found in workspace.")
        with open(full_path, 'r', encoding='utf-8') as f:
            return f.read()
            
    @staticmethod
    def write_file(session_id: str, file_path: str, content: str) -> str:
        full_path = os.path.join(WorkspaceManager.get_session_dir(session_id), file_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return full_path

    @staticmethod
    def write_file_binary(session_id: str, file_path: str, content: bytes) -> str:
        full_path = os.path.join(WorkspaceManager.get_session_dir(session_id), file_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, 'wb') as f:
            f.write(content)
        return full_path
