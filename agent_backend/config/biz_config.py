"""
业务配置 - SUPPORT_BIZ_LIST
定义支持的业务列表，用于意图识别和路由
"""

SUPPORT_BIZ_LIST = [
    {
        "biz_code": "foreign_talk",
        "biz_name": "外语对话工作流",
        "description": "英语对话练习工作流",
        "workflow_path": "workflows/foreign_talk_workflow/foreign_talk_chain.py",
        "workflow_id": "foreign_talk_workflow",
        "keywords": ["英语对话", "英文聊天", "口语练习", "foreign talk", "english chat"]
    },
    {
        "biz_code": "video",
        "biz_name": "视频处理工作流",
        "description": "视频处理和生成工作流",
        "workflow_path": "workflows/video_workflow/video_chain.py",
        "workflow_id": "video_workflow",
        "keywords": ["视频处理", "视频生成", "视频制作", "视频任务", "video", "制作视频", "生成视频", "处理视频", "做个视频", "创建视频", "做视频", "弄视频", "搞视频", "视频工作流", "AI 视频生成", "视频制作工作流", "视频"]
    },
    {
        "biz_code": "book_writing",
        "biz_name": "书籍创作工作流",
        "description": "全自动书籍创作与高插图排版一体化流水线",
        "workflow_path": "workflows/book_writing_workflow/book_writing_chain.py",
        "workflow_id": "book_writing_workflow",
        "keywords": ["书籍创作", "写书", "自动写书", "书籍排版", "book writing", "创作书籍", "写稿", "排版", "插图", "生成书籍"]
    },
]

def get_biz_by_keyword(user_input: str) -> dict:
    """
    根据用户输入匹配业务
    
    Args:
        user_input: 用户输入文本
    
    Returns:
        匹配的业务配置，未匹配返回 None
    """
    user_input_lower = user_input.lower()
    
    for biz in SUPPORT_BIZ_LIST:
        for keyword in biz["keywords"]:
            if keyword.lower() in user_input_lower:
                return biz
    
    return None


def get_biz_by_workflow_id(workflow_id: str) -> dict:
    """
    根据工作流标识查找业务配置
    
    Args:
        workflow_id: 工作流标识（如 foreign_talk_workflow, video_workflow）
    
    Returns:
        匹配的业务配置，未匹配返回 None
    """
    for biz in SUPPORT_BIZ_LIST:
        if biz.get("workflow_id") == workflow_id:
            return biz
    
    return None
