from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseCodeExecutor(ABC):
    @abstractmethod
    def run(self, code: str, language: str = "python", session_id: str = None) -> Dict[str, Any]:
        """
        Execute code securely.
        Returns a dictionary containing 'status' (success/failed), 'output', and 'error'.
        """
        pass
