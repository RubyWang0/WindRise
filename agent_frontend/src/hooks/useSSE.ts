import { useRef, useCallback } from 'react';

interface SSEOptions {
  onThought?: (data: any) => void;
  onAction?: (data: any) => void;
  onObservation?: (data: any) => void;
  onResult?: (data: any) => void;
  onStream?: (data: any) => void;
  onWorkflowPaused?: (data: any) => void;
  onError?: (err: any) => void;
  onDone?: () => void;
  onTemperatureReset?: (data: any) => void;
}

export function useSSE() {
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback((url: string, options: SSEOptions) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('thought', (e) => {
      try { const data = JSON.parse(e.data); options.onThought?.(data); } catch (err) {}
    });

    es.addEventListener('action', (e) => {
      try { const data = JSON.parse(e.data); options.onAction?.(data); } catch (err) {}
    });

    es.addEventListener('observation', (e) => {
      try { const data = JSON.parse(e.data); options.onObservation?.(data); } catch (err) {}
    });

    // 新增：流式内容事件（不关闭连接，持续追加内容）
    es.addEventListener('stream', (e) => {
      try { const data = JSON.parse(e.data); options.onStream?.(data); } catch (err) {}
    });

    // 新增：workflow 暂停事件（关闭连接，前端显示继续按钮）
    es.addEventListener('workflow_paused', (e) => {
      try {
        const data = JSON.parse(e.data);
        options.onWorkflowPaused?.(data);
        es.close();
      } catch (err) {}
    });

    es.addEventListener('error', (e: any) => {
      try {
        // 尝试解析错误数据
        let errorData: any;
        if (typeof e.data === 'string') {
          errorData = JSON.parse(e.data);
        } else {
          errorData = e.data || { error: 'Unknown error occurred' };
        }
        console.error('SSE error event:', errorData);
        options.onError?.(errorData);
      } catch (err) {
        console.error('Failed to parse error:', err);
        options.onError?.({ error: 'Connection error', message: 'Failed to connect to server' });
      }
      es.close();
    });

    es.addEventListener('temperature_reset', (e) => {
      try { const data = JSON.parse(e.data); options.onTemperatureReset?.(data); } catch (err) {}
    });

    es.addEventListener('result', (e) => {
      try {
        const data = JSON.parse(e.data);
        options.onResult?.(data);
        es.close();
        options.onDone?.();
      } catch (err) {}
    });

    es.onerror = (err: any) => {
      // 只在连接真正出错时通知前端（而不是正常关闭）
      if (es.readyState === EventSource.CLOSED) {
        // 正常关闭，不报错
        return;
      }
      
      // 提取错误信息
      let errorMessage = 'Connection error';
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.toString) {
        errorMessage = err.toString();
      }
      
      console.error('SSE connection error:', errorMessage);
      options.onError?.({ error: errorMessage });
      es.close();
    };
  }, []);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  return { connect, disconnect };
}
