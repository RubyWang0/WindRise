from abc import ABC, abstractmethod
from typing import AsyncGenerator

class BaseAgent(ABC):
    name: str = ""
    
    @abstractmethod
    async def stream_run(self, session_id: str, user_input: str) -> AsyncGenerator[str, None]:
        """
        Stream the execution process (thoughts, actions, observations, results).
        Yields SSE-compatible string payloads.
        """
        pass
