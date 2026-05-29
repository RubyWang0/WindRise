from agent_backend.core.settings import settings
from langchain_openai import ChatOpenAI


def get_config(context: dict | None = None) -> dict:
    """
    从上下文获取配置，兜底使用默认 settings，生成标准配置字典
    包含：api_key、api_base、model_name、temperature
    """
    context = context or {}
    
    configurable = {
        "api_key": context.get("api_key"),
        "api_base": context.get("api_base"),
        "model_name": context.get("model_name"),
        # 直接从上下文获取前端传来的调节温度
        "temperature": context.get("temperature")
    }
    
    # 校验必填配置
    if not all([configurable["api_key"], configurable["api_base"], configurable["model_name"]]):
        raise ValueError("API 配置不完整，请检查 api_key、api_base、model_name")
    
    return {"configurable": configurable}


def create_llm(
    context: dict | None,
    temperature_start: float,
    is_click_new_session: bool = False,
    is_enter_node: bool = False
):
    """
    创建 LLM 实例，返回 (llm, final_temperature)。
    - is_click_new_session / is_enter_node → 强制使用 temperature_start
    - 普通对话 → 使用前端传来的 temperature_adjusted
    """
    # 1. 获取完整配置（包含 temperature_adjusted）
    cfg = get_config(context)
    temperature_adjusted = cfg["configurable"].get("temperature")

    # 2. 核心规则：点击新窗口 / 进入 node → 重置为初始温度
    if is_click_new_session or is_enter_node:  #若为了获取temperature_start则选择True
        temperature_adjusted = temperature_start

    # 3. 普通会话：有修改值用修改值，没有用初始值
    final_temperature = temperature_adjusted

    # 4. 兜底：若 final_temperature 仍为 None，使用 temperature_start
    if final_temperature is None:
        final_temperature = temperature_start

    # 5. 创建 LLM
    llm = ChatOpenAI(
        model=cfg["configurable"]["model_name"],
        api_key=cfg["configurable"]["api_key"],
        base_url=cfg["configurable"]["api_base"],
        temperature=final_temperature,
    )

    return llm, final_temperature