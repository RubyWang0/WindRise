import importlib
import pkgutil
from typing import List
from langchain_core.tools import BaseTool

def load_all_skills() -> List[BaseTool]:
    """
    加载 skills 目录下的所有特化领域技能
    
    Returns:
        技能列表
    """
    import agent_backend.skills as skills_package
    
    all_skills = []
    
    # 遍历 skills 包中的所有模块
    for importer, modname, ispkg in pkgutil.iter_modules(skills_package.__path__, skills_package.__name__ + "."):
        # 排除内部库或可能遗留的文件
        if modname.endswith(".registry") or modname.endswith(".base_skill"):
            continue
        try:
            module = importlib.import_module(modname)
            
            # 查找模块中所有用 @tool 装饰器注册的 Domain Skills
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if hasattr(attr, 'name') and hasattr(attr, 'args_schema'):
                    # 这是一个 LangChain BaseTool 类型的 Domain Skill
                    all_skills.append(attr)
        except Exception as e:
            print(f"Warning: Failed to load skill from {modname}: {e}")
            
    return all_skills
