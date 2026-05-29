# 🍃 WindRise Standalone Agent (风起 AI 智能体系统)

`windrise_agent` 是一个独立的、功能强大的 **AI Agent (智能体) 工作空间系统**。它基于 FastAPI + React + Vite + Tailwind CSS 构建，集成了大语言模型能力与一系列极其先进的多模态生成、文档排版工作流，为开发人员和创意创作者提供一站式的智能生产力工具。

---

## 🌟 核心特性

- **🤖 主智能体 (Main Agent)**:
  支持基于大语言模型（如 DeepSeek 等）的高级对话，自带工具库，可自主完成文件管理、Python 代码沙箱执行、学术/办公任务处理等。
- **🔌 插件化工作流 (Plug-and-Play Workflows)**:
  - **🗣️ 外语对话工作流 (Foreign Talk Workflow)**: 分步式双向语伴教学，实时记录状态，暂停恢复。
  - **🎬 视频处理工作流 (Video Generation Workflow)**: 从脚本撰写、插画分镜生成，到火山引擎 (Huoshan) / 即梦 AI 视频合成的一站式短视频创作流。
  - **📚 书籍创作工作流 (Book Writing Workflow)**: 包含大纲规划、分章节并行撰写、配图生成、微软 `MarkItDown` 文档转换、docx 样式克隆克化与自动插图等全流程出版级书籍排版引擎。
- **🧠 状态与思维可视化**: 
  前端配备独特的“思考中” (Thought Panel) 抽屉面板，实时展示 Agent 的链式思考过程 (Chain of Thought)、调用的工具及参数。
- **🔒 安全与沙箱设计**:
  所有文件写入、读取、脚本生成与 Python 运行均严格限制在独立的文件系统沙箱 `/workspace` 内，防止任何对系统环境的污染。

---

## 📂 技术架构

整个系统采用典型的**前后端分离架构**，前端与后端直接放置在项目根目录下：

```text
windrise_agent/
├── agent_backend/            # FastAPI 智能体后端引擎 (Port 8000)
│   ├── agent/                # 智能体核心大脑 (Prompt, 消息分配)
│   ├── api/                  # API 路由 (SSE 协议流式输出、文件上传等)
│   ├── core/                 # 系统基础配置, SSE 状态控制与内存管理器
│   ├── skills/               # 注册的各类业务级自定义 Skill
│   ├── tools/                # 智能体可用底层工具 (沙箱 Python, 文件读写)
│   ├── workflows/            # 高级复杂多步工作流实现 (视频、书籍、语伴)
│   └── package.json          # Node.js 技能/排版依赖描述 (支持 pnpm)
│
├── agent_frontend/           # React + Vite + Tailwind CSS 前端 (Port 5173)
│   ├── src/
│   │   ├── components/       # ChatMessage, ThoughtPanel, 侧边栏等 UI 组件
│   │   ├── hooks/            # useSSE (流式连接), useChat (聊天状态逻辑)
│   │   ├── store/            # Zustand 全局状态管理中心 (API Config, 持久化等)
│   │   └── types/            # TypeScript 类型声明
│   └── vite.config.ts        # 前端构建配置
│
├── workspace/                # [运行时目录] Agent 的本地文件处理沙箱
├── requirements.txt          # Python 依赖项
└── README.md                 # 说明文档
```

---

## 🚀 启动与运行指南

### 前期准备

确保您的本地系统已安装 **Python 3.10+** 以及 **Node.js 18+**。

---

### 1. 启动后端引擎 (FastAPI)

1. 打开终端或 Anaconda Prompt，导航至 `windrise_agent` 目录。
2. 创建并激活您的虚拟环境（推荐使用 Conda）：
   ```bash
   conda create -n windrise python=3.10 -y
   conda activate windrise
   ```
3. 安装依赖包：
   ```bash
   pip install -r requirements.txt
   ```
4. 运行后端服务：
   ```bash
   python agent_backend/main.py
   ```
   - 后端将在 **`http://localhost:8000`** 启动。
   - 系统将自动在根目录下创建 `workspace/` 作为智能体的本地操作沙箱。

---

### 2. 启动前端界面 (React + Vite)

1. 新开一个终端窗口，从项目根目录导航至前端目录：
   ```bash
   cd windrise_agent/agent_frontend
   ```
2. 推荐使用 **`pnpm`** 安装依赖以保持环境统一（也兼容 `npm`）：
   ```bash
   pnpm install
   ```
3. 启动开发服务器：
   ```bash
   pnpm run dev
   ```
4. 在浏览器中打开提示的本地地址（通常为 **`http://localhost:5173`**）。

---

## ⚙️ 配置与使用说明

1. **设置 API Key**:
   - 首次进入页面，点击右上角的 **设置齿轮图标**。
   - 输入您的大模型 API 密钥 (`API Key`)、接口基址 (`API Base`, 默认支持 OpenAI 兼容格式如 DeepSeek) 与模型名称 (`Model Name`)。
   - 前端采用安全的设计模式，所有 API 配置均仅持久化存储在**您本地浏览器的 LocalStorage 中**，不会上传或泄露给任何第三方服务器。
2. **多模态与排版工作流**:
   - 在设置中，您可以分别为“视频工作流”与“书籍工作流”细粒度配置专属的生成参数（如火山引擎视频模型、通义万相图文模型等配置），提供极高的灵活性。

---

## ⚠️ 注意事项

- **沙箱文件访问**: Agent 运行时生成或写入的任何文件均保存在 `windrise_agent/workspace` 目录中。您可以在该目录下找到生成的短视频、Markdown 电子书及 Word 文档等。
- **Python 工具安全性**: 主 Agent 具备调用 `python_executor` 工具在本地执行 Python 脚本的能力。为了系统安全，请勿让 Agent 执行带有破坏性的危险代码。
- **接口跨域问题**: 后端已默认配置 CORS 跨域访问。如在启动时遇到连接失败，请确认后端运行在 `8000` 端口上，且没有其他程序占用该端口。
