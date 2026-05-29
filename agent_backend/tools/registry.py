from typing import Dict, Type, Any
from .base_tool import BaseSystemTool
import logging

logger = logging.getLogger("tool_registry")

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, BaseSystemTool] = {}

    def register(self, tool: BaseSystemTool):
        if tool.name in self._tools:
            logger.warning(f"Tool {tool.name} is already registered. Overwriting.")
        self._tools[tool.name] = tool
        logger.info(f"Registered system tool: {tool.name}")

    def get_tool(self, name: str) -> BaseSystemTool:
        return self._tools.get(name)

    def get_all_tools(self) -> Dict[str, BaseSystemTool]:
        return self._tools

    def invoke(self, name: str, params: Dict[str, Any], session_id: str) -> Any:
        tool = self.get_tool(name)
        if not tool:
            raise ValueError(f"System tool {name} not found")
        
        # Parameter validation
        validated_params = tool.args_schema(**params).dict()
        
        # Execute
        try:
            return tool.execute(validated_params, session_id)
        except Exception as e:
            logger.error(f"Error executing system tool {name}: {str(e)}")
            return f"Error executing system tool {name}: {str(e)}"

tool_registry = ToolRegistry()
