import json
import asyncio
from typing import AsyncGenerator, List, Dict, Any
from .base_agent import BaseAgent
from .registry import agent_registry
from agent_backend.tools.registry import tool_registry
from agent_backend.core.tracer import trace
from agent_backend.core.memory.memory_middleware import with_memory
from agent_backend.core.memory.memory_store import memory_store
from agent_backend.core.intent_recognizer import intent_recognize
from agent_backend.core.workflow_loader import execute_workflow, execute_workflow_with_stream
from agent_backend.core.tool_executor import execute_tool
from agent_backend.core.settings import settings

# LangChain imports
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage
from langchain_core.tools import StructuredTool


#为主 agent 的 api key 的 temperature 赋值


class MainAgent(BaseAgent):
    name = "main"
    
    def _format_workflow_event(self, event: Dict[str, Any], session_id: str = None) -> str:
        """将 workflow 事件格式化为 SSE 格式（复用逻辑）"""
        event_type = event.get("type", "")
        
        if event_type == "stream":
            chunk_content = event.get("content", "")
            if chunk_content:
                return f"event: stream\ndata: {json.dumps({'content': chunk_content})}\n\n"
            return ""
        
        elif event_type == "result":
            result_text = event.get("content", "")
            message = event.get("message", "")
            content_text = f"{result_text}\n\n✅ {message}"
            return f"event: result\ndata: {json.dumps({'content': content_text})}\n\n"
        
        elif event_type == "error":
            error_msg = event.get("error", "Unknown error")
            return f"event: error\ndata: {json.dumps({'error': error_msg})}\n\n"
        
        return ""

    async def _run_workflow_threaded(
        self, biz_code: str, session_id: str, context: Dict[str, Any], user_input: str
    ) -> AsyncGenerator[str, None]:
        """在独立的后台线程中执行阻塞式工作流，避免阻塞 FastAPI 异步事件循环"""
        import queue
        import asyncio
        from concurrent.futures import ThreadPoolExecutor

        q = queue.Queue()

        def producer():
            try:
                for event in execute_workflow_with_stream(biz_code, user_input, session_id, context):
                    q.put(("event", event))
                q.put(("done", None))
            except Exception as e:
                q.put(("error", e))

        # 在后台线程中执行阻塞式的同步工作流
        loop = asyncio.get_running_loop()
        executor = ThreadPoolExecutor(max_workers=1)
        future = loop.run_in_executor(executor, producer)

        try:
            while True:
                try:
                    # 使用 asyncio.to_thread 避免在读取队列时阻塞异步事件循环
                    item_type, val = await asyncio.to_thread(q.get, timeout=0.1)
                    if item_type == "done":
                        break
                    elif item_type == "error":
                        raise val
                    elif item_type == "event":
                        yield self._format_workflow_event(val, session_id)
                except queue.Empty:
                    # 队列为空时释放 CPU 给 asyncio 事件循环以处理其他请求（如停止 API）
                    await asyncio.sleep(0.05)
        except Exception as e:
            print(f"[main_agent] Session={session_id} | ERROR inside threaded runner: {str(e)}")
            yield f"event: error\ndata: {json.dumps({'error': f'Workflow execution failed: {str(e)}'})}\n\n"

    @with_memory
    async def stream_run(self, session_id: str, user_input: str, model_name: str = "gpt-4-turbo", api_key: str = None, api_base: str = None, temperature: float = None, video_configs: str = None, book_configs: str = None) -> AsyncGenerator[str, None]:
        # 清除可能残留的停止信号
        from agent_backend.core.workflow_state import clear_stop_signal
        if session_id:
            clear_stop_signal(session_id)

        trace("agent_start", session_id, {"input": user_input, "model": model_name})

        # 1. Setup LLM via create_llm (supports temperature_adjusted)
        from agent_backend.config.create_llm import create_llm

        # Determine is_first_turn BEFORE create_llm so we can pass correct flags
        history = memory_store.get_messages(session_id)
        is_first_turn = len(history) <= 1

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
                print(f"[main_agent] Failed to parse video_configs: {e}")
        if book_configs:
            try:
                context["book_configs"] = json.loads(book_configs)
            except Exception as e:
                print(f"[main_agent] Failed to parse book_configs: {e}")

        main_agent_temp_start = settings.Temperature

        llm, final_temperature = create_llm(
            context=context,
            temperature_start=main_agent_temp_start,
            is_click_new_session=is_first_turn,
            is_enter_node=False
        )
        llm.streaming = True

        if is_first_turn:
            yield f"event: temperature_reset\ndata: {json.dumps({'temperature': final_temperature})}\n\n"

        # ========== MainAgent 外层核心：语义意图识别 + 指令注入 ==========
        from agent_backend.core.workflow_loader import execute_workflow_with_stream
        from agent_backend.core.workflow_state import (
            get_workflow_state,
            update_workflow_state,
            clear_workflow_state,
            should_continue_workflow,
            should_stop_workflow,
            is_stop_requested,
            clear_stop_signal,
        )
        
        # 检查是否有暂停的 workflow 等待继续
        paused_state = get_workflow_state(session_id)
        if paused_state and paused_state.get("status") == "paused":
            # 使用统一的意图识别函数
            if should_stop_workflow(session_id, user_input):
                clear_workflow_state(session_id)
                yield f"event: result\ndata: {json.dumps({'content': '已停止当前操作流程'})}\n\n"
                trace("agent_end", session_id, {"status": "stopped_by_user"})
                return
            
            if should_continue_workflow(session_id, user_input):
                biz_code = paused_state.get("biz_code", "")
                update_workflow_state(session_id, {"status": "running", "user_command": "continue"})
                
                yield f"event: thought\ndata: {json.dumps({'step': 0, 'content': f'继续执行业务流程：{biz_code}', 'status': 'done'})}\n\n"

                # 执行 workflow 下一节点
                async for chunk in self._run_workflow_threaded(biz_code, session_id, context, ""):
                    yield chunk

                trace("agent_end", session_id, {"status": "completed"})
                return

        # ========== 第一轮对话：意图识别 + Workflow 启动 ==========
        # 核心规则：仅处理用户首次输入的意图识别，识别完成后立即路由，不生成额外回复
        if is_first_turn:
            yield f"event: thought\ndata: {json.dumps({'step': 0, 'content': '识别用户意图...', 'status': 'thinking'})}\n\n"

            intent_result = intent_recognize(user_input)

            # 检查是否为停止指令(可能是多余的考虑删除)
            # if intent_result["intent_type"] == "stop":
            #     yield f"event: result\ndata: {json.dumps({'content': '已停止当前操作'})}\n\n"
            #     trace("agent_end", session_id, {"status": "stopped"})
            #     return

            # 如果匹配 workflow，输出路由指令，前端捕获后自动跳转
            # 一旦输出路由指令，立即结束本次回复，不追加任何内容
            if intent_result["intent_type"] == "workflow":
                route_command = intent_result["route_command"]
                workflow_id = intent_result["workflow_id"]
                biz_code = intent_result["biz_code"]
                
                # 输出路由指令（前端直接捕获跳转）
                yield f"event: result\ndata: {json.dumps({'content': route_command})}\n\n"
                
                trace("agent_end", session_id, {"status": "routed", "workflow_id": workflow_id})
                return

        # 3. 普通对话模式 - 准备消息
        messages = [SystemMessage(content="You are a helpful assistant with access to tools. If you use a tool, always provide a concise thought about why you are using it.")]
        for m in history[:-1]:
            if m['role'] == 'user':
                messages.append(HumanMessage(content=m['content']))
            else:
                messages.append(AIMessage(content=m['content']))
        messages.append(HumanMessage(content=user_input))

        # 4. 加载 System Tools 和 Domain Skills
        all_tools = tool_registry.get_all_tools()
        tools = []

        # 添加 System Tools（绑定 session_id 的沙箱工具）
        for name, tool in all_tools.items():
            tools.append(StructuredTool.from_function(
                func=lambda *args, **kwargs: tool.execute(kwargs, session_id),
                name=tool.name,
                description=tool.description,
                args_schema=tool.args_schema
            ))

        # 添加 Domain Skills（从 skills 目录中动态加载的技能）
        from agent_backend.core.tool_executor import _loaded_skills, set_tool_context, load_and_register_skills
        load_and_register_skills()
        for skill_name, skill_obj in _loaded_skills.items():
            tools.append(skill_obj)

        # 将当前请求的 context 注入 tool 执行器，供 tool 运行时获取
        set_tool_context(context)

        llm_with_tools = llm.bind_tools(tools)

        # 5. Multi-step ReAct Loop
        max_iterations = 5
        iteration = 0

        while iteration < max_iterations:
            # 检查是否请求了停止
            if session_id and is_stop_requested(session_id):
                print(f"[main_agent] Detect stop requested for session {session_id}")
                stop_data = {'biz_code': self.name, 'session_id': session_id, 'stopped': True}
                yield f"event: workflow_paused\ndata: {json.dumps(stop_data)}\n\n"
                trace("agent_end", session_id, {"status": "stopped_by_user"})
                return

            iteration += 1
            yield f"event: thought\ndata: {json.dumps({'step': iteration, 'content': 'Analyzing next steps...', 'status': 'thinking'})}\n\n"

            try:
                response = await llm_with_tools.ainvoke(messages)
                messages.append(response)

                if not response.tool_calls:
                    # Final answer reached
                    yield f"event: result\ndata: {json.dumps({'content': response.content})}\n\n"
                    break

                # Handle Tool Calls
                for tool_call in response.tool_calls:
                    # 检查是否请求了停止
                    if session_id and is_stop_requested(session_id):
                        print(f"[main_agent] Detect stop requested for session {session_id} before tool {tool_call['name']}")
                        stop_data = {'biz_code': self.name, 'session_id': session_id, 'stopped': True}
                        yield f"event: workflow_paused\ndata: {json.dumps(stop_data)}\n\n"
                        trace("agent_end", session_id, {"status": "stopped_by_user"})
                        return

                    t_name = tool_call['name']
                    t_args = tool_call['args']
                    t_id = tool_call['id']

                    yield f"event: thought\ndata: {json.dumps({'step': iteration, 'content': f'Invoking tool: {t_name}', 'status': 'done'})}\n\n"

                    action_data = {"toolName": t_name, "params": t_args, "status": "running"}
                    yield f"event: action\ndata: {json.dumps(action_data)}\n\n"

                    # Execute Skill or Tool using unified executor in thread pool to avoid blocking the event loop
                    result = await asyncio.to_thread(execute_tool, t_name, t_args, session_id)

                    action_data["status"] = "success"
                    action_data["result"] = result
                    yield f"event: action\ndata: {json.dumps(action_data)}\n\n"

                    # Feed observation back to LLM
                    messages.append(ToolMessage(content=str(result), tool_call_id=t_id))

            except Exception as e:
                print(f"Error in agent loop: {str(e)}")
                yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
                break

        trace("agent_end", session_id, {"status": "completed"})
        return


# Pre-register System Tools
from agent_backend.tools.file_read import FileReadTool
from agent_backend.tools.file_write import FileWriteTool
from agent_backend.tools.file_list import FileListTool
from agent_backend.tools.python_executor import PythonExecutorTool

tool_registry.register(FileReadTool())
tool_registry.register(FileWriteTool())
tool_registry.register(FileListTool())
tool_registry.register(PythonExecutorTool())

# Register agent
main_agent = MainAgent()
agent_registry.register(main_agent)
