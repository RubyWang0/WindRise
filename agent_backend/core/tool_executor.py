"""
统一 Tool 与 Skill 执行器
支持 System Tools 和 Domain Skills 的统一调用
"""

from typing import Any, Dict
from contextvars import ContextVar
from agent_backend.tools.registry import tool_registry
from langchain_core.tools import BaseTool

# 全局存储加载的特化领域技能 (Domain Skills)
_loaded_skills: Dict[str, BaseTool] = {}

# 线程安全的请求上下文（用于向 tool/skill 注入 session 配置）
_current_context: ContextVar[Dict[str, Any]] = ContextVar("tool_context", default={})

def set_tool_context(context: Dict[str, Any]) -> None:
    """在每次请求开始时调用，将 api_key / api_base / model_name 等写入上下文"""
    _current_context.set(context)

def get_tool_context() -> Dict[str, Any]:
    """tool 内部调用，获取当前请求的 context"""
    return _current_context.get()

def load_and_register_skills():
    """
    加载并注册所有 skills 目录下的特化领域技能 (Domain Skills)
    """
    from .skill_loader import load_all_skills
    
    global _loaded_skills
    skills = load_all_skills()
    
    for skill in skills:
        if hasattr(skill, 'name'):
            _loaded_skills[skill.name] = skill

def execute_tool(tool_name: str, params: Dict[str, Any], session_id: str) -> Any:
    """
    统一执行入口 (支持 System Tools 和 Domain Skills)
    
    Args:
        tool_name: 工具/技能名称
        params: 参数
        session_id: 会话ID
    
    Returns:
        执行结果
    """
    # 1. 首先尝试从 System Tools (有状态/沙箱系统工具) 中查找并执行
    tool = tool_registry.get_tool(tool_name)
    if tool:
        return tool_registry.invoke(tool_name, params, session_id)
    
    # 2. 然后尝试从 Domain Skills (特化领域技能) 中查找并执行
    if tool_name in _loaded_skills:
        skill = _loaded_skills[tool_name]
        try:
            # LangChain 形式的 Skill 直接调用
            result = skill.invoke(params)
            return result
        except Exception as e:
            return f"Error executing skill {tool_name}: {str(e)}"
    
    raise ValueError(f"Tool or Skill {tool_name} not found")

# 初始化时加载所有领域技能
load_and_register_skills()
