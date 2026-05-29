"""
Workflow Agent - 处理所有工作流服务的请求
支持 foreign_talk_workflow, video_workflow 等
"""

import json
from typing import AsyncGenerator, Dict, Any
from agent_backend.agent.base_agent import BaseAgent
from agent_backend.core.tracer import trace
from agent_backend.core.memory.memory_middleware import with_memory
from agent_backend.core.memory.memory_store import memory_store
from agent_backend.core.workflow_loader import execute_workflow_with_stream
from agent_backend.core.workflow_state import (
    get_workflow_state,
    update_workflow_state,
    clear_workflow_state,
    should_continue_workflow,
    should_stop_workflow,
)
from agent_backend.config.biz_config import get_biz_by_workflow_id


class WorkflowAgent(BaseAgent):
    """工作流 Agent，处理特定工作流的请求"""
    
    def __init__(self, workflow_id: str, biz_code: str):
        self.workflow_id = workflow_id
        self.biz_code = biz_code
        self.name = workflow_id
    
    @with_memory
    async def stream_run(
        self, 
        session_id: str, 
        user_input: str, 
        model_name: str = "gpt-4-turbo", 
        api_key: str = None, 
        api_base: str = None,
        temperature: float = None,
        video_configs: str = None,
        book_configs: str = None
    ) -> AsyncGenerator[str, None]:
        """
        流式执行工作流
        
        Args:
            session_id: 会话 ID
            user_input: 用户输入
            model_name: 模型名称
            api_key: API Key
            api_base: API Base URL
            temperature: Temperature
            video_configs: JSON string of video API configs
        
        Yields:
            SSE 事件流
        """
        trace("workflow_start", session_id, {
            "workflow_id": self.workflow_id,
            "biz_code": self.biz_code,
            "input": user_input
        })
        
        context = {
            "api_key": api_key,
            "api_base": api_base,
            "model_name": model_name,
        }
        if temperature is not None:
            context["temperature"] = temperature
            
        if video_configs:
            try:
                context["video_configs"] = json.loads(video_configs)
            except Exception as e:
                print(f"[workflow_agent] Failed to parse video_configs: {e}")
        
        if book_configs:
            try:
                book_cfg = json.loads(book_configs)
                context["book_configs"] = book_cfg
                # Extract directory and template for workflow
                context["input"] = book_cfg.get("directory", "")
                context["layout_template"] = book_cfg.get("template", "")
            except Exception as e:
                print(f"[workflow_agent] Failed to parse book_configs: {e}")
        
        # 检查是否有暂停的 workflow 等待继续
        paused_state = get_workflow_state(session_id)
        if paused_state and paused_state.get("status") == "paused":
            # 使用统一的意图识别函数
            if should_stop_workflow(session_id, user_input):
                clear_workflow_state(session_id)
                yield f"event: result\ndata: {json.dumps({'content': '已停止当前操作流程'})}\n\n"
                trace("workflow_end", session_id, {"status": "stopped_by_user"})
                return
            
            if should_continue_workflow(session_id, user_input):
                # 不要提前更新状态为 running，让 execute_workflow_with_stream 自己处理
                # 只设置 user_command 标志
                update_workflow_state(session_id, {"user_command": "continue"})
                
                yield f"event: thought\ndata: {json.dumps({'step': 0, 'content': f'继续执行业务流程：{self.biz_code}', 'status': 'done'})}\n\n"
                try:
                    for event in execute_workflow_with_stream(self.biz_code, user_input, session_id, context):
                        yield self._format_event(event, session_id)
                except Exception as e:
                    print(f"[workflow_agent] Session={session_id} | ERROR: {str(e)}")
                    yield f"event: error\ndata: {json.dumps({'error': f'Workflow execution failed: {str(e)}'})}\n\n"
                
                trace("workflow_end", session_id, {"status": "completed"})
                return
        
        # 首次执行 workflow
        yield f"event: thought\ndata: {json.dumps({'step': 0, 'content': f'启动工作流：{self.workflow_id}', 'status': 'thinking'})}\n\n"
        
        # 重置温度（新会话）
        from agent_backend.config.create_llm import create_llm
        history = memory_store.get_messages(session_id)
        is_first_turn = len(history) <= 1
        
        if is_first_turn:
            _, final_temperature = create_llm(
                context=context,
                temperature_start=0.1,
                is_click_new_session=is_first_turn,
                is_enter_node=False
            )
            yield f"event: temperature_reset\ndata: {json.dumps({'temperature': final_temperature})}\n\n"
        
        # 执行工作流
        try:
            for event in execute_workflow_with_stream(self.biz_code, user_input, session_id, context):
                yield self._format_event(event, session_id)
        except Exception as e:
            import traceback
            traceback.print_exc()
            yield f"event: error\ndata: {json.dumps({'error': f'Workflow execution failed: {str(e)}'})}\n\n"
        
        trace("workflow_end", session_id, {"status": "completed"})
    
    def _format_event(self, event: Dict[str, Any], session_id: str) -> str:
        """将 workflow 事件格式化为 SSE 格式"""
        event_type = event.get("type", "")
        
        if event_type == "thought":
            return f"event: thought\ndata: {json.dumps(event)}\n\n"
        
        elif event_type == "stream":
            chunk_content = event.get("content", "")
            if chunk_content:
                return f"event: stream\ndata: {json.dumps({'content': chunk_content})}\n\n"
            return ""
        
        elif event_type == "result":
            result_text = event.get("content", "")
            message = event.get("message", "")
            paused = event.get("paused", False)
            
            if paused:
                content_text = f"{result_text}\n\n {message or '等待确认'}"
                pause_data = {'biz_code': self.biz_code, 'session_id': session_id}
                if "template_image_count" in event:
                    pause_data["template_image_count"] = event["template_image_count"]
                pause_event = f"event: result\ndata: {json.dumps({'content': content_text})}\n\n"
                pause_event += f"event: workflow_paused\ndata: {json.dumps(pause_data)}\n\n"
                return pause_event
            else:
                end_message = "\n\n✅ 工作流执行完成，当前会话已结束。"
                content_text = f"{result_text}\n\n✅ {message}{end_message}"
                return f"event: result\ndata: {json.dumps({'content': content_text})}\n\n"
        
        elif event_type == "workflow_paused":
            return f"event: workflow_paused\ndata: {json.dumps(event)}\n\n"
        
        elif event_type == "workflow_stopped":
            # 工作流被停止：保存了当前节点状态，可继续
            stop_data = {'biz_code': self.biz_code, 'session_id': session_id}
            stop_event = f"event: result\ndata: {json.dumps({'content': '\u2016 已暂停当前工作流，状态已保存。\n\n您可以补充信息后选择**继续**恢复工作流。'})}\n\n"
            stop_event += f"event: workflow_paused\ndata: {json.dumps(stop_data)}\n\n"
            return stop_event
        
        elif event_type == "error":
            error_msg = event.get("error", "Unknown error")
            return f"event: error\ndata: {json.dumps({'error': error_msg})}\n\n"
        
        return ""


def create_workflow_agent(workflow_id: str, biz_code: str) -> WorkflowAgent:
    """创建工作流 Agent 实例"""
    return WorkflowAgent(workflow_id=workflow_id, biz_code=biz_code)
