import { create } from 'zustand';
import { AgentService, ChatMessage } from '../types';

interface AppState {
  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // AI Config
  apiKey: string;
  apiBase: string;
  modelName: string;
  temperature: number;
  setApiConfig: (key: string, base: string, model: string, temp: number) => void;
  fetchTemperatureStart: () => Promise<void>;

  // Video Workflow Config
  videoScriptKey: string;
  videoScriptBase: string;
  videoScriptModel: string;
  videoScriptTemp: number;
  
  videoImageKey: string;
  videoImageBase: string;
  videoImageModel: string;
  videoImageSteps: number;
  
  videoVideoProvider: 'huoshan' | 'jimeng';
  videoVideoKey: string;
  videoVideoBase: string;
  videoVideoModel: string;
  
  setVideoConfig: (config: {
    videoScriptKey?: string;
    videoScriptBase?: string;
    videoScriptModel?: string;
    videoScriptTemp?: number;
    videoImageKey?: string;
    videoImageBase?: string;
    videoImageModel?: string;
    videoImageSteps?: number;
    videoVideoProvider?: 'huoshan' | 'jimeng';
    videoVideoKey?: string;
    videoVideoBase?: string;
    videoVideoModel?: string;
  }) => void;

  // Book Writing Workflow Config
  bookLlmKey: string;
  bookLlmBase: string;
  bookLlmModel: string;
  bookLlmTemp: number;
  
  bookImageKey: string;
  bookImageBase: string;
  bookImageModel: string;
  bookImageSize: string;
  
  bookDirectory: string;  // 目录文件路径
  bookTemplate: string;   // 模板文件路径
  
  setBookConfig: (config: {
    bookLlmKey?: string;
    bookLlmBase?: string;
    bookLlmModel?: string;
    bookLlmTemp?: number;
    bookImageKey?: string;
    bookImageBase?: string;
    bookImageModel?: string;
    bookImageSize?: string;
    bookDirectory?: string;
    bookTemplate?: string;
  }) => void;

  // Service & Session
  services: AgentService[];
  activeServiceId: string;
  sessions: Record<string, string[]>; // serviceId -> sessionId[]
  activeSessionId: Record<string, string>; // serviceId -> current sessionId
  messages: Record<string, ChatMessage[]>; // sessionId -> messages
  isWorkflowRunning: Record<string, boolean>; // sessionId -> isRunning
  
  setActiveService: (id: string) => void;
  createSession: (serviceId: string) => Promise<string>;
  switchSession: (serviceId: string, sessionId: string) => void;
  deleteSession: (serviceId: string, sessionId: string) => void;
  addMessage: (sessionId: string, message: ChatMessage) => void;
  updateLastMessage: (sessionId: string, updateFn: (msg: ChatMessage) => ChatMessage) => void;
  setWorkflowRunning: (sessionId: string, running: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  theme: (localStorage.getItem('agent_theme') as 'light' | 'dark') || 'light',
  toggleTheme: () => {
    const nextTheme = get().theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('agent_theme', nextTheme);
    set({ theme: nextTheme });
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  apiKey: localStorage.getItem('agent_api_key') || '',
  apiBase: localStorage.getItem('agent_api_base') || 'https://api.openai.com/v1',
  modelName: localStorage.getItem('agent_model_name') || 'gpt-4-turbo',
  temperature: 0.1, // default; will be overwritten by fetchTemperatureStart()
  setApiConfig: (key, base, model, temp) => {
    localStorage.setItem('agent_api_key', key);
    localStorage.setItem('agent_api_base', base);
    localStorage.setItem('agent_model_name', model);
    // temperature is NOT persisted to localStorage
    set({ apiKey: key, apiBase: base, modelName: model, temperature: temp });
  },
  fetchTemperatureStart: async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('http://localhost:8000/api/v1/agent/temperature-start', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        set({ temperature: data.temperature_start });
      }
    } catch {
      // fallback: keep default 0.2
    }
  },

  videoScriptKey: localStorage.getItem('video_script_key') || '',
  videoScriptBase: localStorage.getItem('video_script_base') || 'https://api-inference.modelscope.cn/v1/',
  videoScriptModel: localStorage.getItem('video_script_model') || 'deepseek-ai/DeepSeek-V4-Flash',
  videoScriptTemp: parseFloat(localStorage.getItem('video_script_temp') || '0.7'),

  videoImageKey: localStorage.getItem('video_image_key') || '',
  videoImageBase: localStorage.getItem('video_image_base') || 'https://api-inference.modelscope.cn/v1/',
  videoImageModel: localStorage.getItem('video_image_model') || 'Tongyi-MAI/Z-Image-Turbo',
  videoImageSteps: parseInt(localStorage.getItem('video_image_steps') || '30'),

  videoVideoProvider: (localStorage.getItem('video_video_provider') || 'huoshan') as 'huoshan' | 'jimeng',
  videoVideoKey: localStorage.getItem('video_video_key') || '',
  videoVideoBase: localStorage.getItem('video_video_base') || 'https://ark.cn-beijing.volces.com/api/v3',
  videoVideoModel: localStorage.getItem('video_video_model') || 'doubao-seedance-1-0-pro-fast-251015',

  bookLlmKey: localStorage.getItem('book_llm_key') || '',
  bookLlmBase: localStorage.getItem('book_llm_base') || 'https://api-inference.modelscope.cn/v1/',
  bookLlmModel: localStorage.getItem('book_llm_model') || 'deepseek-ai/DeepSeek-V4-Flash',
  bookLlmTemp: parseFloat(localStorage.getItem('book_llm_temp') || '0.7'),

  bookImageKey: localStorage.getItem('book_image_key') || '',
  bookImageBase: localStorage.getItem('book_image_base') || 'https://api-inference.modelscope.cn/v1/',
  bookImageModel: localStorage.getItem('book_image_model') || 'Tongyi-MAI/Z-Image-Turbo',
  bookImageSize: localStorage.getItem('book_image_size') || '1024x1024',

  bookDirectory: localStorage.getItem('book_directory') || '',
  bookTemplate: localStorage.getItem('book_template') || '',

  setVideoConfig: (config) => {
    if (config.videoScriptKey !== undefined) localStorage.setItem('video_script_key', config.videoScriptKey);
    if (config.videoScriptBase !== undefined) localStorage.setItem('video_script_base', config.videoScriptBase);
    if (config.videoScriptModel !== undefined) localStorage.setItem('video_script_model', config.videoScriptModel);
    if (config.videoScriptTemp !== undefined) localStorage.setItem('video_script_temp', config.videoScriptTemp.toString());
    
    if (config.videoImageKey !== undefined) localStorage.setItem('video_image_key', config.videoImageKey);
    if (config.videoImageBase !== undefined) localStorage.setItem('video_image_base', config.videoImageBase);
    if (config.videoImageModel !== undefined) localStorage.setItem('video_image_model', config.videoImageModel);
    if (config.videoImageSteps !== undefined) localStorage.setItem('video_image_steps', config.videoImageSteps.toString());
    
    if (config.videoVideoProvider !== undefined) localStorage.setItem('video_video_provider', config.videoVideoProvider);
    if (config.videoVideoKey !== undefined) localStorage.setItem('video_video_key', config.videoVideoKey);
    if (config.videoVideoBase !== undefined) localStorage.setItem('video_video_base', config.videoVideoBase);
    if (config.videoVideoModel !== undefined) localStorage.setItem('video_video_model', config.videoVideoModel);
    
    set((state) => ({ ...state, ...config }));
  },

  setBookConfig: (config) => {
    if (config.bookLlmKey !== undefined) localStorage.setItem('book_llm_key', config.bookLlmKey);
    if (config.bookLlmBase !== undefined) localStorage.setItem('book_llm_base', config.bookLlmBase);
    if (config.bookLlmModel !== undefined) localStorage.setItem('book_llm_model', config.bookLlmModel);
    if (config.bookLlmTemp !== undefined) localStorage.setItem('book_llm_temp', config.bookLlmTemp.toString());
    
    if (config.bookImageKey !== undefined) localStorage.setItem('book_image_key', config.bookImageKey);
    if (config.bookImageBase !== undefined) localStorage.setItem('book_image_base', config.bookImageBase);
    if (config.bookImageModel !== undefined) localStorage.setItem('book_image_model', config.bookImageModel);
    if (config.bookImageSize !== undefined) localStorage.setItem('book_image_size', config.bookImageSize);
    
    if (config.bookDirectory !== undefined) localStorage.setItem('book_directory', config.bookDirectory);
    if (config.bookTemplate !== undefined) localStorage.setItem('book_template', config.bookTemplate);
    
    set((state) => ({ ...state, ...config }));
  },

  services: [
    { id: 'main', name: '主 Agent', icon: '🏠', apiUrl: '/api/v1/agent/stream', isActive: true },
    { id: 'foreign_talk_workflow', name: '外语对话工作流', icon: '', apiUrl: '/api/v1/agent/stream', isActive: false },
    { id: 'video_workflow', name: '视频处理工作流', icon: '🎬', apiUrl: '/api/v1/agent/stream', isActive: false },
    { id: 'book_writing_workflow', name: '书籍创作工作流', icon: '📚', apiUrl: '/api/v1/agent/stream', isActive: false },
  ],
  activeServiceId: 'main',
  
  // Persistent Sessions & Messages
  sessions: JSON.parse(localStorage.getItem('agent_sessions') || '{}'),
  activeSessionId: {}, // Always start with the clean welcome homepage on load, instead of displaying historical dialogue pages
  messages: JSON.parse(localStorage.getItem('agent_messages') || '{}'),
  isWorkflowRunning: {},

  setActiveService: (id) => set((state) => ({
    activeServiceId: id,
    services: state.services.map(s => ({ ...s, isActive: s.id === id }))
  })),

  createSession: async (serviceId) => {
    // Generate a clean local session ID instantly in memory (0ms)
    const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    set((state) => {
      const newSessions = { 
        ...state.sessions, 
        [serviceId]: [newId, ...(state.sessions[serviceId] || [])] 
      };
      const newActive = { ...state.activeSessionId, [serviceId]: newId };
      const newMsgs = { ...state.messages, [newId]: [] };
      
      // Defer localStorage writes to keep UI response instantaneous
      setTimeout(() => {
        localStorage.setItem('agent_sessions', JSON.stringify(newSessions));
        localStorage.setItem('agent_active_sessions', JSON.stringify(newActive));
        localStorage.setItem('agent_messages', JSON.stringify(newMsgs));
      }, 0);

      return {
        sessions: newSessions,
        activeSessionId: newActive,
        messages: newMsgs
      };
    });

    return newId;
  },

  switchSession: (serviceId, sessionId) => set((state) => {
    const newActive = { ...state.activeSessionId, [serviceId]: sessionId };
    setTimeout(() => {
      localStorage.setItem('agent_active_sessions', JSON.stringify(newActive));
    }, 0);
    return { activeSessionId: newActive };
  }),

  deleteSession: (serviceId, sessionId) => set((state) => {
    const newSessions = { ...state.sessions };
    newSessions[serviceId] = (newSessions[serviceId] || []).filter(id => id !== sessionId);
    
    const newActive = { ...state.activeSessionId };
    if (newActive[serviceId] === sessionId) {
      newActive[serviceId] = newSessions[serviceId][0] || '';
    }
    
    const newMsgs = { ...state.messages };
    delete newMsgs[sessionId];
    
    // Defer localStorage writes to keep UI response instantaneous
    setTimeout(() => {
      localStorage.setItem('agent_sessions', JSON.stringify(newSessions));
      localStorage.setItem('agent_active_sessions', JSON.stringify(newActive));
      localStorage.setItem('agent_messages', JSON.stringify(newMsgs));
    }, 0);
    
    return {
      sessions: newSessions,
      activeSessionId: newActive,
      messages: newMsgs
    };
  }),

  addMessage: (sessionId, message) => set((state) => {
    const currentMessages = state.messages[sessionId] || [];
    const newMsgs = { ...state.messages, [sessionId]: [...currentMessages, message] };
    setTimeout(() => {
      localStorage.setItem('agent_messages', JSON.stringify(newMsgs));
    }, 0);
    return { messages: newMsgs };
  }),

  updateLastMessage: (sessionId, updateFn) => set((state) => {
    const currentMessages = state.messages[sessionId] || [];
    if (currentMessages.length === 0) return state;
    const newMessagesList = [...currentMessages];
    const lastIdx = newMessagesList.length - 1;
    newMessagesList[lastIdx] = updateFn(newMessagesList[lastIdx]);
    
    const newMsgs = { ...state.messages, [sessionId]: newMessagesList };
    setTimeout(() => {
      localStorage.setItem('agent_messages', JSON.stringify(newMsgs));
    }, 0);
    return { messages: newMsgs };
  }),

  setWorkflowRunning: (sessionId, running) => set((state) => ({
    isWorkflowRunning: { ...state.isWorkflowRunning, [sessionId]: running }
  }))
}));
