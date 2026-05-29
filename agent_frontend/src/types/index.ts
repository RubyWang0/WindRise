export interface AgentService {
  id: string;
  name: string;
  icon: string;
  apiUrl: string;
  isActive: boolean;
}

export interface FileItem {
  name: string;
  type: string;
  size: number;
  url: string;
  previewUrl?: string;
}

export interface ToolCall {
  toolName: string;
  params: any;
  result: any;
  status: 'running' | 'success' | 'failed';
}

export interface Thought {
  step: number;
  content: string;
  status: 'thinking' | 'done';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images: string[];
  files: FileItem[];
  createTime: string;
  thoughts?: Thought[];
  toolCalls?: ToolCall[];
  workflowPaused?: boolean;
  templateImageCount?: number;
  isSystemCommand?: boolean;
}

