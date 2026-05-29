"""
意图识别模块
用于识别用户输入是否匹配已注册的业务
"""

from ..config.biz_config import get_biz_by_keyword

def intent_recognize(user_input: str) -> dict:
    """
    意图识别节点（主 Agent 首次输入专用）
    
    核心规则：
    1. 仅处理用户首次输入的意图识别，识别完成后立即路由，不生成额外回复
    2. 支持识别的业务工作流：
       - 英语对话 → foreign_talk_workflow
       - 视频处理 → video_workflow
    3. 识别逻辑：
       - 用户输入包含「英语对话、英文聊天、口语练习、foreign talk」等 → foreign_talk_workflow
       - 用户输入包含「视频处理、视频生成、视频制作、视频任务」等 → video_workflow
       - 其他通用意图 → 正常对话交互
    4. 路由指令格式（必须严格输出，前端直接捕获跳转）：
       [WORKFLOW_ROUTE]:{工作流标识}
       示例：[WORKFLOW_ROUTE]:foreign_talk_workflow
       示例：[WORKFLOW_ROUTE]:video_workflow
    5. 一旦输出路由指令，立即结束本次回复，不追加任何内容
    
    Args:
        user_input: 用户输入文本
    
    Returns:
        识别结果字典，包含：
        - intent_type: 'workflow' | 'chat' | 'stop'
        - workflow_id: 工作流标识（如 foreign_talk_workflow, video_workflow）
        - route_command: 路由指令字符串（仅当 intent_type 为 workflow 时）
        - confidence: 置信度
    """
    # 检查停止指令
    stop_keywords = ["停止", "取消", "结束", "退出", "中断", "stop", "cancel"]
    if any(kw in user_input.lower() for kw in stop_keywords):
        return {
            "intent_type": "stop",
            "workflow_id": None,
            "route_command": None,
            "confidence": 1.0
        }
    
    # 检查是否匹配业务
    biz = get_biz_by_keyword(user_input)
    if biz:
        workflow_id = biz.get("workflow_id", biz["biz_code"] + "_workflow")
        route_command = f"[WORKFLOW_ROUTE]:{workflow_id}"
        return {
            "intent_type": "workflow",
            "workflow_id": workflow_id,
            "route_command": route_command,
            "biz_code": biz["biz_code"],
            "confidence": 0.8
        }
    
    # 默认普通对话
    return {
        "intent_type": "chat",
        "workflow_id": None,
        "route_command": None,
        "confidence": 0.5
    }
