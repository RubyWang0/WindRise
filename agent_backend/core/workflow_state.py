"""
Workflow 中间状态存储和内容提取
用于支持 workflow 暂停/恢复（如分步执行时缓存中间结果）
使用 memory_store 的 task_state 来持久化状态，避免 reload 模式导致状态丢失
"""

from typing import Any, Optional
from agent_backend.core.memory.memory_store import memory_store


WORKFLOW_STATE_KEY = "workflow_state"

# 默认的继续/停止关键词
DEFAULT_CONTINUE_KEYWORDS = ["继续", "下一步", "continue", "next"]
DEFAULT_STOP_KEYWORDS = ["停止", "取消", "结束", "退出", "中断", "stop", "cancel"]

# ── 停止信号（内存级别，进程内有效） ──────────────────────────────────
# 键: session_id  值: True 表示用户已请求停止当前工作流
_stop_signals: dict[str, bool] = {}


def request_stop(session_id: str):
    """由 API 端点调用，通知工作流执行循环尽快停止。"""
    _stop_signals[session_id] = True
    print(f"[workflow_state] Stop requested for session {session_id}")


def clear_stop_signal(session_id: str):
    """清除停止信号（工作流启动时调用，确保不受上次残留信号影响）。"""
    _stop_signals.pop(session_id, None)


def is_stop_requested(session_id: str) -> bool:
    """返回 True 如果该 session 有待处理的停止请求。"""
    return _stop_signals.get(session_id, False)


def save_workflow_state(session_id: str, state: dict):
    """保存 workflow 中间状态（使用 memory_store 持久化）"""
    memory_store.set_task_state(session_id, WORKFLOW_STATE_KEY, state)
    print(f"[workflow_state] Saved state for {session_id}: {state}")


def get_workflow_state(session_id: str) -> dict | None:
    """获取 workflow 中间状态，不存在则返回 None"""
    state = memory_store.get_task_state(session_id, WORKFLOW_STATE_KEY)
    return state


def clear_workflow_state(session_id: str):
    """清除 workflow 中间状态"""
    memory_store.set_task_state(session_id, WORKFLOW_STATE_KEY, None)
    print(f"[workflow_state] Cleared state for {session_id}")


def update_workflow_state(session_id: str, updates: dict):
    """更新 workflow 中间状态（合并现有状态）"""
    existing_state = get_workflow_state(session_id)
    if existing_state:
        existing_state.update(updates)
        save_workflow_state(session_id, existing_state)
    else:
        save_workflow_state(session_id, updates)


def _extract_content(result: Any) -> str:
    """从 LangChain 结果中提取文本内容"""
    return getattr(result, "content", str(result))


def check_user_intent(user_input: str, continue_keywords: list = None, stop_keywords: list = None) -> str:
    """
    检查用户意图（继续/停止/无特殊意图）
    
    Args:
        user_input: 用户输入
        continue_keywords: 继续关键词列表（可选，使用默认值）
        stop_keywords: 停止关键词列表（可选，使用默认值）
    
    Returns:
        "continue" | "stop" | "none"
    """
    if continue_keywords is None:
        continue_keywords = DEFAULT_CONTINUE_KEYWORDS
    if stop_keywords is None:
        stop_keywords = DEFAULT_STOP_KEYWORDS
    
    user_input_lower = user_input.lower()
    
    if any(kw in user_input_lower for kw in stop_keywords):
        return "stop"
    if any(kw in user_input_lower for kw in continue_keywords):
        return "continue"
    return "none"


def get_next_step(session_id: str, current_step: Optional[int] = None) -> int:
    """
    获取下一个应该执行的 step 编号
    
    Args:
        session_id: 会话 ID
        current_step: 当前 step 编号（可选，如果提供则直接返回 current_step + 1）
    
    Returns:
        下一个 step 编号
    """
    if current_step is not None:
        return current_step + 1
    
    state = get_workflow_state(session_id)
    if state and "step" in state:
        return state["step"] + 1
    return 1  # 默认从 step 1 开始


def should_continue_workflow(session_id: str, user_input: str) -> bool:
    """
    检查是否应该继续执行 workflow
    
    Args:
        session_id: 会话 ID
        user_input: 用户输入
    
    Returns:
        True 表示应该继续，False 表示应该停止或无特殊意图
    """
    state = get_workflow_state(session_id)
    if not state or state.get("status") != "paused":
        return False
    
    intent = check_user_intent(user_input)
    return intent == "continue"


def should_stop_workflow(session_id: str, user_input: str) -> bool:
    """
    检查是否应该停止 workflow
    
    Args:
        session_id: 会话 ID
        user_input: 用户输入
    
    Returns:
        True 表示应该停止
    """
    state = get_workflow_state(session_id)
    if not state or state.get("status") != "paused":
        return False
    
    intent = check_user_intent(user_input)
    return intent == "stop"
