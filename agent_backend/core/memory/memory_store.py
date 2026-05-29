from typing import List, Dict, Any
from .base_memory import BaseMemoryStore

class InMemoryStore(BaseMemoryStore):
    def __init__(self):
        self._sessions: Dict[str, List[Dict[str, str]]] = {}
        self._user_memory: Dict[str, Dict[str, Any]] = {}
        self._task_state: Dict[str, Dict[str, Any]] = {}

    def add_message(self, session_id: str, role: str, content: str):
        if session_id not in self._sessions:
            self._sessions[session_id] = []
        self._sessions[session_id].append({"role": role, "content": content})

    def get_messages(self, session_id: str) -> List[Dict[str, str]]:
        return self._sessions.get(session_id, [])

    def clear_session(self, session_id: str):
        if session_id in self._sessions:
            del self._sessions[session_id]

    def set_user_memory(self, user_id: str, key: str, value: Any):
        if user_id not in self._user_memory:
            self._user_memory[user_id] = {}
        self._user_memory[user_id][key] = value

    def get_user_memory(self, user_id: str, key: str) -> Any:
        return self._user_memory.get(user_id, {}).get(key)

    def set_task_state(self, session_id: str, task_id: str, state: Any):
        if session_id not in self._task_state:
            self._task_state[session_id] = {}
        self._task_state[session_id][task_id] = state

    def get_task_state(self, session_id: str, task_id: str) -> Any:
        return self._task_state.get(session_id, {}).get(task_id)

# Singleton instance
memory_store = InMemoryStore()
