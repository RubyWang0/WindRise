import { useCallback } from 'react';
import { useAppStore } from '../store';
import { useSSE } from './useSSE';
import { ChatMessage, Thought, ToolCall, FileItem } from '../types';

const API_BASE = 'http://localhost:8000';

export function useChat(serviceId: string, initialSessionId?: string) {
  const { addMessage, updateLastMessage, apiKey } = useAppStore();
  const { connect, disconnect } = useSSE();

  const sendMessage = useCallback(async (content: string, customSessionId?: string, files: FileItem[] = [], isSystemCommand?: boolean) => {
    const sessionId = customSessionId || initialSessionId || useAppStore.getState().activeSessionId[serviceId];
    if (!content.trim() || !sessionId) return;

    // Check if API key is configured
    if (!apiKey) {
      const errorMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '⚠️ **API Key not configured.** Please click the settings icon in the top right to set your OpenAI API key.',
        images: [],
        files: [],
        createTime: new Date().toISOString()
      };
      addMessage(sessionId, errorMsg);
      return;
    }

    // 1. Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      images: [],
      files,
      createTime: new Date().toISOString(),
      isSystemCommand
    };
    addMessage(sessionId, userMsg);

    // 2. Add placeholder assistant message
    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      images: [],
      files: [],
      createTime: new Date().toISOString(),
      thoughts: [],
      toolCalls: []
    };
    addMessage(sessionId, assistantMsg);

    // 3. Construct SSE URL
    const state = useAppStore.getState();
    const videoConfigs = {
      script: {
        api_key: state.videoScriptKey,
        api_base: state.videoScriptBase,
        model_name: state.videoScriptModel,
        temperature: state.videoScriptTemp
      },
      image: {
        api_key: state.videoImageKey,
        api_base: state.videoImageBase,
        model_name: state.videoImageModel,
        steps: state.videoImageSteps
      },
      video: {
        provider: state.videoVideoProvider,
        api_key: state.videoVideoKey,
        api_base: state.videoVideoBase,
        model_name: state.videoVideoModel
      }
    };
    
    const bookConfigs = {
      directory: state.bookDirectory,
      template: state.bookTemplate,
      llm: {
        api_key: state.bookLlmKey,
        api_base: state.bookLlmBase,
        model_name: state.bookLlmModel,
        temperature: state.bookLlmTemp
      },
      image: {
        api_key: state.bookImageKey,
        api_base: state.bookImageBase,
        model_name: state.bookImageModel,
        size: state.bookImageSize
      }
    };
     const url = `${API_BASE}/api/v1/agent/stream?session_id=${sessionId}&service_id=${serviceId}&user_input=${encodeURIComponent(content)}&model_name=${encodeURIComponent(state.modelName)}&api_key=${encodeURIComponent(state.apiKey)}&api_base=${encodeURIComponent(state.apiBase)}&temperature=${state.temperature}&video_configs=${encodeURIComponent(JSON.stringify(videoConfigs))}&book_configs=${encodeURIComponent(JSON.stringify(bookConfigs))}`;
 
    // Set workflow as running
    useAppStore.getState().setWorkflowRunning(sessionId, true);

    // 4. Connect SSE and handle events
    connect(url, {
      onThought: (data: Thought) => {
        updateLastMessage(sessionId, (msg) => ({
          ...msg,
          thoughts: [...(msg.thoughts || []), data]
        }));
      },
      onAction: (data: ToolCall) => {
        updateLastMessage(sessionId, (msg) => {
          const calls = msg.toolCalls || [];
          const existingIdx = calls.findIndex(c => c.toolName === data.toolName && c.status === 'running');
          if (existingIdx >= 0) {
            const newCalls = [...calls];
            newCalls[existingIdx] = data;
            return { ...msg, toolCalls: newCalls };
          }
          return { ...msg, toolCalls: [...calls, data] };
        });
      },
      // 流式内容：逐步追加到消息内容
      onStream: (data: any) => {
        updateLastMessage(sessionId, (msg) => ({
          ...msg,
          content: msg.content + (data.content || '')
        }));
      },
      onResult: (data: any) => {
        const content = data.content || '';
        
        // 检查是否包含路由指令 [WORKFLOW_ROUTE]:{workflow_id}
        const routeMatch = content.match(/\[WORKFLOW_ROUTE\]:(\S+)/);
        if (routeMatch) {
          const workflowId = routeMatch[1];
          // 触发路由跳转
          window.dispatchEvent(new CustomEvent('workflow-route', { detail: { workflowId, sessionId } }));
          // 更新消息内容为路由提示
          updateLastMessage(sessionId, (msg) => ({
            ...msg,
            content: ` 正在跳转到工作流：**${workflowId}**...`
          }));
          useAppStore.getState().setWorkflowRunning(sessionId, false);
          return;
        }
        
        updateLastMessage(sessionId, (msg) => ({
          ...msg,
          content: msg.content + content
        }));
        useAppStore.getState().setWorkflowRunning(sessionId, false);
      },
      // workflow 暂停：标记消息为暂停状态
      onWorkflowPaused: (data?: any) => {
        updateLastMessage(sessionId, (msg) => ({
          ...msg,
          workflowPaused: true,
          templateImageCount: data?.template_image_count
        }));
        useAppStore.getState().setWorkflowRunning(sessionId, false);
      },
      onError: (err) => {
        console.error('SSE Error:', err);
        // 安全地提取错误信息
        let errorMessage = 'Error connecting to server';
        if (typeof err === 'string') {
          errorMessage = err;
        } else if (err?.error) {
          errorMessage = typeof err.error === 'string' ? err.error : JSON.stringify(err.error);
        } else if (err?.message) {
          errorMessage = err.message;
        } else if (err?.toString) {
          errorMessage = err.toString();
        }
        updateLastMessage(sessionId, (msg) => ({
          ...msg,
          content: msg.content + `\n\n **Error:** ${errorMessage}`
        }));
        useAppStore.getState().setWorkflowRunning(sessionId, false);
      },
      onDone: () => {
        useAppStore.getState().setWorkflowRunning(sessionId, false);
      },
      onTemperatureReset: (data) => {
        // 后端通知温度已重置（新会话 / workflow），同步更新全局 store
        if (data.temperature !== undefined) {
          useAppStore.setState({ temperature: data.temperature });
        }
      }
    });

  }, [serviceId, initialSessionId, addMessage, updateLastMessage, connect, apiKey]);

  const stopWorkflow = useCallback(async (customSessionId?: string) => {
    const sessionId = customSessionId || initialSessionId || useAppStore.getState().activeSessionId[serviceId];
    if (!sessionId) return;
    try {
      await fetch(`${API_BASE}/api/v1/agent/stop?session_id=${sessionId}`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to stop workflow:', e);
    }
    // 即刻解除 running 状态，让按钮可用
    useAppStore.getState().setWorkflowRunning(sessionId, false);
  }, [serviceId, initialSessionId]);

  return { sendMessage, disconnect, stopWorkflow };
}
