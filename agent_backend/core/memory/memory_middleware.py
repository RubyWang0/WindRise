from functools import wraps
from typing import Callable, Any
import json
from .memory_store import memory_store

import inspect

def with_memory(func: Callable):
    """
    Decorator to inject memory capabilities.
    Supports both standard async functions and async generators.
    """
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        session_id = kwargs.get('session_id')
        user_input = kwargs.get('user_input')
        if not session_id or not user_input:
            raise ValueError("session_id and user_input must be provided as keyword arguments")
        memory_store.add_message(session_id, "user", user_input)
        
        result = await func(*args, **kwargs)
        memory_store.add_message(session_id, "assistant", str(result))
        return result

    @wraps(func)
    async def generator_wrapper(*args, **kwargs):
        session_id = kwargs.get('session_id')
        user_input = kwargs.get('user_input')
        if not session_id or not user_input:
            raise ValueError("session_id and user_input must be provided as keyword arguments")
        memory_store.add_message(session_id, "user", user_input)
        
        final_answer = ""
        async for chunk in func(*args, **kwargs):
            # For SSE chunks, we might want to extract the final result part
            # But for MVP, we just yield the chunk
            yield chunk
            # If the chunk is a result event, we capture it
            if "event: result" in chunk:
                try:
                    # Simple extraction for MVP
                    data_str = chunk.split("data: ")[1].split("\n\n")[0]
                    data = json.loads(data_str)
                    final_answer = data.get("content", "")
                except:
                    pass
        
        if final_answer:
            memory_store.add_message(session_id, "assistant", final_answer)

    @wraps(func)
    def wrapper(*args, **kwargs):
        if inspect.isasyncgenfunction(func):
            return generator_wrapper(*args, **kwargs)
        return async_wrapper(*args, **kwargs)
        
    return wrapper

