from typing import Dict, Type
from .base_agent import BaseAgent
import logging
from agent_backend.config.biz_config import SUPPORT_BIZ_LIST

logger = logging.getLogger("agent_registry")

class AgentRegistry:
    def __init__(self):
        self._agents: Dict[str, BaseAgent] = {}

    def register(self, agent: BaseAgent):
        if agent.name in self._agents:
            logger.warning(f"Agent {agent.name} is already registered. Overwriting.")
        self._agents[agent.name] = agent
        logger.info(f"Registered agent: {agent.name}")

    def get_agent(self, name: str) -> BaseAgent:
        return self._agents.get(name)
    
    def register_workflow_agents(self):
        """注册所有工作流 Agent"""
        from agent_backend.agent.workflow_agent import create_workflow_agent
        
        for biz in SUPPORT_BIZ_LIST:
            workflow_id = biz.get("workflow_id")
            biz_code = biz["biz_code"]
            if workflow_id and workflow_id not in self._agents:
                agent = create_workflow_agent(workflow_id, biz_code)
                self.register(agent)
        
        logger.info(f"Registered {len(SUPPORT_BIZ_LIST)} workflow agents")

agent_registry = AgentRegistry()

# 注册工作流 agents
agent_registry.register_workflow_agents()
