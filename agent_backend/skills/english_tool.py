from agent_backend.workflows.foreign_talk_workflow.english_chain import english_chain
from langchain_core.tools import tool
from pydantic import BaseModel, Field


class EnglishToolInput(BaseModel):
    """english_tool 的入参 schema —— 仅包含 LLM 需要提供的字段"""
    query: str = Field(description="用户输入的原始问题")


@tool(args_schema=EnglishToolInput)
def english_tool(query: str) -> str:
    """
    用于将用户问题转换为英文回答的工具
    """
    from agent_backend.core.tool_executor import get_tool_context
    context = get_tool_context()
    return english_chain(context).invoke({"query": query}).content
