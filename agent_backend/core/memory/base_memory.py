from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseMemoryStore(ABC):
    @abstractmethod
    def add_message(self, session_id: str, role: str, content: str):
        pass

    @abstractmethod
    def get_messages(self, session_id: str) -> List[Dict[str, str]]:
        pass
        
    @abstractmethod
    def clear_session(self, session_id: str):
        pass
        
    @abstractmethod
    def set_user_memory(self, user_id: str, key: str, value: Any):
        pass
        
    @abstractmethod
    def get_user_memory(self, user_id: str, key: str) -> Any:
        pass
        
    @abstractmethod
    def set_task_state(self, session_id: str, task_id: str, state: Any):
        pass
        
    @abstractmethod
    def get_task_state(self, session_id: str, task_id: str) -> Any:
        pass
