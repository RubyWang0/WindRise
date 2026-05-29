from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import Type, Any, Dict

class BaseSystemTool(ABC):
    name: str = ""
    description: str = ""
    args_schema: Type[BaseModel] = BaseModel

    @abstractmethod
    def execute(self, params: Dict[str, Any], session_id: str) -> Any:
        """
        Execute the system tool with validated parameters.
        """
        pass
