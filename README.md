# 🍃 WindRise Standalone Agent (开源版)

`windrise_agent_opensource` 是一个独立的 **AI Agent (智能体) 运行系统**。它基于 FastAPI + React + Vite + Tailwind CSS 构建，提供了一套基础的、支持沙箱文件操作和链式思维展示的 AI 助手框架。

> **⚠️ 注意**：本开源版本**未内置**具体的多模态生成或书籍创作等高级工作流（这些由于包含私有业务逻辑已在 `.gitignore` 中排除）。但本系统保留了**快速接入自定义工作流的能力**。您可以根据下文的说明自行开发并接入您自己的工作流代码。

---

## 📂 技术架构与目录说明

整个系统采用前后端分离结构：

```text
windrise_agent/
├── agent_backend/            # FastAPI 智能体后端引擎 (Port 8000)
│   ├── agent/                # 智能体核心大脑 (Prompt, 消息分配)
│   ├── api/                  # API 路由 (SSE 协议流式输出、文件管理等)
│   ├── core/                 # 基础配置与状态管理器
│   ├── skills/               # 自定义 Skill（基础工具函数描述）
│   ├── tools/                # 底层工具库（沙箱 Python 执行器、文件读写等）
│   └── workflows/            # [需自行创建] 存放您的自定义多步工作流代码
│
├── agent_frontend/           # React + Vite 前端界面 (Port 5173)
│   ├── src/
│   │   ├── components/       # ThoughtPanel 思考面板、聊天对话框等 UI
│   │   ├── hooks/            # useSSE (流式连接), useChat (聊天状态逻辑)
│   │   └── store/            # Zustand 状态管理中心
│   └── vite.config.ts        # 前端构建配置
│
├── workspace/                # [自动创建] Agent 的本地文件处理沙箱文件夹
├── requirements.txt          # Python 依赖项
└── README.md                 # 说明文档
```

---

## 🛠️ 如何开发与接入您的自定义工作流 (Workflows)

本系统提供了插件式工作流的扩展接口，您可以按照以下步骤轻松接入自己编写的复杂任务工作流：

### 第一步：创建 `workflows` 文件夹
在后端根目录 `agent_backend/` 下，手动创建一个名为 **`workflows`** 的文件夹。

### 第二步：编写您的工作流逻辑
您可以在该文件夹下编写符合您业务需求的 Python 脚本。例如，创建一个多步骤的自动化任务：
```python
# agent_backend/workflows/my_custom_workflow.py
class MyCustomWorkflow:
    def __init__(self, session_id: str):
        self.session_id = session_id

    async def run(self, user_input: str):
        # 编写您的分步执行逻辑
        yield "正在执行步骤 1..."
        # ... 业务处理
        yield "工作流执行完毕！"
```

### 第三步：在后端路由中注册与分发
在 `agent_backend/agent/intent_recognizer.py`（意图识别）或消息处理路由中，根据用户输入的意图，分发调用您在 `workflows/` 下编写的工作流实例。

---

## 🚀 启动与运行指南

### 前期准备
- **Python 3.10+**
- **Node.js 18+**

### 1. 启动后端引擎 (FastAPI)
1. 安装 Python 依赖包：
   ```bash
   pip install -r requirements.txt
   ```
2. 运行后端服务：
   ```bash
   python agent_backend/main.py
   ```
   - 后端将在 **`http://localhost:8000`** 启动。
   - 系统将自动在根目录下创建 `workspace/` 文件夹作为智能体的本地操作沙箱。

### 2. 启动前端界面 (React + Vite)
1. 导航至前端目录：
   ```bash
   cd agent_frontend
   ```
2. 使用 `pnpm` 或 `npm` 安装依赖：
   ```bash
   pnpm install
   ```
3. 启动开发服务：
   ```bash
   pnpm run dev
   ```
   - 默认访问地址：**`http://localhost:5173`**。

---

## ⚙️ 配置说明
- 首次进入页面，点击右上角的 **设置齿轮图标**，输入您的 API Key、API Base 地址与模型名称即可开始使用。
- 前端所有 API 配置均仅保存在您**本地浏览器的 LocalStorage 中**，不会上传到任何第三方中转服务，确保安全。
