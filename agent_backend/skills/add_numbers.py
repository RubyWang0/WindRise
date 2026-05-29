from langchain_core.tools import tool

@tool
def add_numbers(a: int, b: int) -> int:
    """
    用于计算两个整数的和的工具函数
    
    Args:
        a: 第一个整数
        b: 第二个整数
    
    Returns:
        两个数的和
    """
    result = a + b
    return result
