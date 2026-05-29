"""
Workflow 加载器和执行器
负责动态加载 workflow 模块，并提供通用的前端回传机制
支持多 step 执行，不硬编码 step 编号
"""

import importlib
import json
from typing import Dict, Any, Generator, Optional, Callable


def load_workflow(biz_code: str) -> object:
    """
    根据业务编码加载 workflow
    
    Args:
        biz_code: 业务编码
    
    Returns:
        workflow 模块对象
    """
    from ..config.biz_config import SUPPORT_BIZ_LIST
    
    # 查找业务配置
    biz_config = None
    for biz in SUPPORT_BIZ_LIST:
        if biz["biz_code"] == biz_code:
            biz_config = biz
            break
    
    if not biz_config:
        raise ValueError(f"Unknown biz_code: {biz_code}")
    
    # 动态导入 workflow 模块
    workflow_path = biz_config["workflow_path"]
    module_name = f"agent_backend.{workflow_path.replace('/', '.').replace('.py', '')}"
    
    try:
        module = importlib.import_module(module_name)
        return module
    except ImportError as e:
        raise ImportError(f"Failed to load workflow {module_name}: {e}")


def create_callback(step: int = 0) -> Callable[[str, bool], None]:
    """
    创建通用的前端回传回调函数
    
    Args:
        step: 当前 workflow 执行的 step 编号
    
    Returns:
        回调函数，接收 (result_text, is_final) 参数
        - result_text: 要回传的结果文本
        - is_final: 是否为最终结果（False 表示中间步骤）
    """
    def callback(result_text: str, is_final: bool = False):
        """
        通用的前端回传函数
        根据当前 step 回传结果到前端
        
        Args:
            result_text: 要回传的结果文本
            is_final: 是否为最终结果
        """
        # 通过 yield 返回结果（由 execute_workflow_with_stream 捕获）
        # 这里返回一个字典，包含 step 信息 and 结果
        return {
            "step": step,
            "content": result_text,
            "is_final": is_final,
        }
    
    return callback


def execute_workflow(biz_code: str, user_input: str, session_id: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    执行 workflow（非流式，一次性返回结果）
    
    Args:
        biz_code: 业务编码
        user_input: 用户输入
        session_id: 会话 ID
        context: 上下文信息
    
    Returns:
        workflow 执行结果
    """
    module = load_workflow(biz_code)
    
    # 调用标准入口函数 run_workflow
    if hasattr(module, 'run_workflow'):
        return module.run_workflow(biz_code, user_input, session_id, context)
    else:
        raise AttributeError(f"Workflow module {module.__name__} does not have run_workflow function")


def execute_workflow_with_stream(
    biz_code: str,
    user_input: str,
    session_id: str,
    context: Dict[str, Any] = None,
) -> Generator[Dict[str, Any], None, None]:
    """
    执行 workflow（流式，支持分步回传前端）
    
    通用的流式执行器，自动处理 workflow 的分步执行和前端回传
    不硬编码 step 编号，而是根据 workflow 状态动态决定执行哪个 step
    
    Args:
        biz_code: 业务编码
        user_input: 用户输入
        session_id: 会话 ID
        context: 上下文信息
    
    Yields:
        workflow 执行的中间结果和最终结果
    """
    import traceback
    from .workflow_state import get_workflow_state, get_next_step, clear_workflow_state, update_workflow_state, is_stop_requested, clear_stop_signal
    
    module = load_workflow(biz_code)
    paused_state = get_workflow_state(session_id)
    
    # 清除当前执行前的残留停止信号（正常执行时不应受上次停止影响）
    clear_stop_signal(session_id)
    
    # 提取或合并上下文
    context = context or {}
    if paused_state and "context" in paused_state:
        merged_context = paused_state["context"].copy()
        # 智能合并：传入的非空值覆盖已有的，但传入的空值不应覆盖已解析好的非空值！
        for k, v in context.items():
            if v not in (None, "") or k not in merged_context:
                merged_context[k] = v
        context = merged_context
        
    # 动态解析用户输入的命令行/自然语言参数并合并回写至 context，以便所有子流程参数对齐
    if user_input and hasattr(module, "parse_user_input_params"):
        try:
            parse_func = getattr(module, "parse_user_input_params")
            params = parse_func(user_input)
            for k, v in params.items():
                context[k] = v
        except Exception as pe:
            print(f"[workflow_loader] Dynamic parameter parsing failed: {pe}", flush=True)

    # 确定是否是一键直出 (direct_run) 模式
    direct_run = context.get("direct_run", False)
    
    # 智能识别 "不配图/不生成图片" 的意图以自动设置 image_num = 0
    if context.get("image_num") is None:
        if user_input and any(k in user_input for k in ["不生成图片", "不配图", "无配图", "没有配图", "不需要图片", "不需要配图"]):
            context["image_num"] = 0

    # 确定要运行的起始 step 编号
    if paused_state and paused_state.get("status") == "paused":
        current_step = paused_state.get("step", 1)
        if paused_state.get("stopped") == True:
            # 之前是被手动停止的，重新运行当前被打断的步骤
            step = current_step
        else:
            # 正常完成暂停，运行下一步
            step = current_step + 1
    else:
        # 首次运行，从 step 1 开始
        step = 1

    # 清除 stopped 标记（如果存在）
    if paused_state and paused_state.get("stopped"):
        update_workflow_state(session_id, {"stopped": False})

    print(f"[workflow_loader] Starting workflow loop at step {step}. direct_run={direct_run}, context={context}", flush=True)

    # 执行循环：支持自动链接与顺序流转
    while True:
        step_func_name = f"run_workflow_step{step}"
        if not hasattr(module, step_func_name):
            # 没有更多的步骤，代表整个工作流已经全部执行完毕！
            print(f"[workflow_loader] Completed all steps. No {step_func_name} found.", flush=True)
            clear_workflow_state(session_id)
            break

        # 检查停止信号
        if is_stop_requested(session_id):
            clear_stop_signal(session_id)
            update_workflow_state(session_id, {"status": "paused", "step": step, "biz_code": biz_code, "stopped": True, "context": context})
            yield {
                "type": "workflow_stopped",
                "step": step,
                "biz_code": biz_code,
                "session_id": session_id,
            }
            return

        # 提取步骤可读名称
        step_name_str = ""
        if hasattr(module, "STEP_NAMES") and isinstance(module.STEP_NAMES, dict):
            name_val = module.STEP_NAMES.get(step)
            if name_val:
                step_name_str = f" ({name_val})"

        # 告知前端执行当前步骤的 thought
        yield {
            "type": "thought",
            "content": f"执行 Step {step}{step_name_str}: {biz_code}",
        }

        # 调用步骤的函数
        step_func = getattr(module, step_func_name)
        
        # 动态内省函数签名，根据参数名智能绑定参数
        import inspect
        sig = inspect.signature(step_func)
        available_args = {
            "biz_code": biz_code,
            "user_input": user_input,
            "session_id": session_id,
            "context": context
        }
        
        kwargs = {}
        has_kwargs = any(p.kind == p.VAR_KEYWORD for p in sig.parameters.values())
        for param_name, param in sig.parameters.items():
            if param.kind in (param.VAR_POSITIONAL, param.VAR_KEYWORD):
                continue
            if param_name in available_args:
                kwargs[param_name] = available_args[param_name]
        
        if has_kwargs:
            for k, v in available_args.items():
                if k not in kwargs:
                    kwargs[k] = v

        try:
            try:
                step_result = step_func(**kwargs)
            except TypeError:
                bound = sig.bind_partial()
                for k, v in kwargs.items():
                    if k in sig.parameters:
                        bound.arguments[k] = v
                step_result = step_func(*bound.args, **bound.kwargs)

            # 运行完后，再次检查停止信号（防止在运行中点击停止）
            if is_stop_requested(session_id):
                clear_stop_signal(session_id)
                update_workflow_state(session_id, {"status": "paused", "step": step, "biz_code": biz_code, "stopped": True, "context": context})
                yield {
                    "type": "workflow_stopped",
                    "step": step,
                    "biz_code": biz_code,
                    "session_id": session_id,
                }
                return

            # 如果返回值是生成器（流式），进行遍历处理
            if hasattr(step_result, '__iter__') and not isinstance(step_result, dict):
                is_paused = False
                template_img_cnt = None
                for chunk in step_result:
                    if is_stop_requested(session_id):
                        clear_stop_signal(session_id)
                        update_workflow_state(session_id, {"status": "paused", "step": step, "biz_code": biz_code, "stopped": True, "context": context})
                        yield {
                            "type": "workflow_stopped",
                            "step": step,
                            "biz_code": biz_code,
                            "session_id": session_id,
                        }
                        return

                    if chunk.get("type") == "stream":
                        yield {
                            "type": "stream",
                            "step": step,
                            "content": chunk.get("content", chunk.get("stream_chunk", "")),
                        }
                    elif chunk.get("type") == "result":
                        is_paused = chunk.get("paused", False)
                        template_img_cnt = chunk.get("template_image_count") if "template_image_count" in chunk else template_img_cnt
                        yield {
                            "type": "result",
                            "step": step,
                            "content": chunk.get("content", chunk.get("result", "")),
                            "message": chunk.get("message", ""),
                            "complete": not is_paused,
                            "paused": is_paused,
                            "template_image_count": template_img_cnt,
                        }
                    elif chunk.get("type") == "error":
                        yield {
                            "type": "error",
                            "error": chunk.get("error", "Unknown error"),
                            "message": chunk.get("message", ""),
                        }
                        return

                if is_paused:
                    if not direct_run:
                        # 正常暂停，保存状态并终止流
                        update_workflow_state(session_id, {"status": "paused", "step": step, "biz_code": biz_code, "context": context})
                        yield {
                            "type": "workflow_paused",
                            "biz_code": biz_code,
                            "session_id": session_id,
                        }
                        return
                    else:
                        print(f"[workflow_loader] direct_run=True. Automatically bypass planned pause in step {step}", flush=True)

            else:
                # 普通字典返回值
                success = step_result.get("success", True)
                if not success:
                    yield {
                        "type": "error",
                        "error": step_result.get("error", "Execution failed"),
                        "message": step_result.get("message", ""),
                    }
                    return

                is_paused = step_result.get("paused", False)
                template_img_cnt = step_result.get("template_image_count") if "template_image_count" in step_result else None
                
                # 从返回字典中提取状态变量并保存到 state 中
                new_state = {"step": step, "biz_code": biz_code, "context": context}
                for key in ["drafts_dir", "extracted_dir", "schemes_dir", "images_dir", "template_image_count"]:
                    if key in step_result:
                        new_state[key] = step_result[key]
                update_workflow_state(session_id, new_state)

                yield {
                    "type": "result",
                    "step": step,
                    "content": step_result.get("result", ""),
                    "message": step_result.get("message", ""),
                    "complete": not is_paused,
                    "paused": is_paused,
                    "template_image_count": template_img_cnt,
                }

                if is_paused:
                    if not direct_run:
                        update_workflow_state(session_id, {"status": "paused", "step": step, "biz_code": biz_code, "context": context})
                        yield {
                            "type": "workflow_paused",
                            "biz_code": biz_code,
                            "session_id": session_id,
                        }
                        return
                    else:
                        print(f"[workflow_loader] direct_run=True. Automatically bypass planned pause in step {step}", flush=True)

            # 决定下一步的 step
            saved_state = get_workflow_state(session_id)
            if saved_state and "step" in saved_state:
                step = saved_state["step"] + 1
            else:
                step += 1

        except Exception as e:
            traceback.print_exc()
            yield {
                "type": "error",
                "error": f"Step {step} execution failed: {str(e)}",
            }
            return
