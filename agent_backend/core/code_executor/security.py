import ast
from typing import Tuple

def check_code_safety(code: str) -> Tuple[bool, str]:
    """
    Very basic MVP security check via AST analysis.
    In a real production environment, use a proper sandbox (e.g. Docker, gVisor).
    """
    forbidden_modules = {'os', 'subprocess', 'shutil'}
    
    try:
        tree = ast.parse(code)
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name.split('.')[0] in forbidden_modules:
                        return False, f"Import of forbidden module '{alias.name}' detected"
            elif isinstance(node, ast.ImportFrom):
                if node.module and node.module.split('.')[0] in forbidden_modules:
                    return False, f"Import from forbidden module '{node.module}' detected"
        return True, ""
    except SyntaxError as e:
        return False, f"Syntax Error: {str(e)}"
    except Exception as e:
         return False, f"Security check error: {str(e)}"
