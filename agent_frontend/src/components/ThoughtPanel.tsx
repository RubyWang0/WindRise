import React from 'react';
import { Thought, ToolCall } from '../types';
import { cn } from '../utils';

interface Props {
  thoughts?: Thought[];
  toolCalls?: ToolCall[];
}

export const ThoughtPanel: React.FC<Props> = ({ thoughts = [], toolCalls = [] }) => {
  if (thoughts.length === 0 && toolCalls.length === 0) return null;

  return (
    <div className="w-80 bg-[#EDF0F2] border-l border-zinc-300 dark:bg-[#030303] dark:border-zinc-800 flex flex-col h-full overflow-y-auto p-4">
      <h3 className="text-sm font-semibold text-zinc-550 dark:text-zinc-400 mb-4 uppercase tracking-wider">Process Log</h3>
      
      {/* Thoughts Section */}
      {thoughts.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-medium text-zinc-500 mb-2">Thoughts</h4>
          <div className="space-y-3">
            {thoughts.map((t, idx) => (
              <div key={idx} className="flex items-start space-x-2">
                <div className={cn("w-2 h-2 mt-1.5 rounded-full flex-shrink-0", t.status === 'thinking' ? "bg-zinc-900 dark:bg-white animate-pulse" : "bg-zinc-400 dark:bg-zinc-700")} />
                <p className="text-sm text-zinc-700 dark:text-zinc-400 leading-relaxed break-words">{t.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tool Calls Section */}
      {toolCalls.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-zinc-500 mb-2">Tool Calls</h4>
          <div className="space-y-3">
            {toolCalls.map((call, idx) => (
              <div key={idx} className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-300 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-300 dark:text-white dark:bg-zinc-950 dark:border-zinc-800 truncate max-w-[130px]" title={call.toolName}>
                    {call.toolName}
                  </span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full flex-shrink-0",
                    call.status === 'running' ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200" :
                    call.status === 'success' ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400" : "bg-red-50 text-red-650 dark:bg-red-950/30 dark:text-red-400"
                  )}>
                    {call.status}
                  </span>
                </div>
                <div className="text-xs text-zinc-500 font-mono break-all line-clamp-2">
                  {JSON.stringify(call.params)}
                </div>
                {call.result && (
                  <div className="mt-2 text-xs text-zinc-700 dark:text-zinc-400 font-mono bg-zinc-50 dark:bg-zinc-950 p-2 rounded border border-zinc-300 dark:border-zinc-850 break-all line-clamp-3">
                    {typeof call.result === 'string' ? call.result : JSON.stringify(call.result)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
