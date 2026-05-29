import React from 'react';
import { useAppStore } from '../store';
import { cn } from '../utils';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import UserAvatar from '../assets/userAvatar.png';

export const Sidebar: React.FC = () => {
  const { 
    activeServiceId, 
    sessions, 
    activeSessionId, 
    messages, 
    createSession, 
    switchSession,
    deleteSession 
  } = useAppStore();

  const currentSessions = sessions[activeServiceId] || [];
  const currentActiveId = activeSessionId[activeServiceId];

  return (
    <div className="w-64 border-r border-zinc-300 dark:border-zinc-800 bg-[#EDF0F2] dark:bg-[#030303] flex flex-col h-full text-zinc-800 dark:text-zinc-100 transition-colors duration-200">
      <div className="p-4">
        <button 
          onClick={() => createSession(activeServiceId)}
          className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100/50 dark:hover:bg-zinc-850 transition-colors shadow-xs hover:shadow-sm cursor-pointer"
        >
          <Plus size={16} />
          <span>开启新对话</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {currentSessions.map((id) => {
          const firstMsg = messages[id]?.[0]?.content || 'New Session';
          const isActive = id === currentActiveId;

          return (
            <div
              key={id}
              onClick={() => switchSession(activeServiceId, id)}
              className={cn(
                "group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all",
                isActive 
                  ? "bg-[#F8F9FA] dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 shadow-xs text-zinc-900 dark:text-white" 
                  : "hover:bg-white/40 dark:hover:bg-zinc-900/40 text-zinc-500 dark:text-zinc-450 hover:text-zinc-800 dark:hover:text-zinc-200"
              )}
            >
              <div className="flex items-center space-x-3 overflow-hidden flex-1">
                <MessageSquare size={16} className={cn(isActive ? "text-zinc-850 dark:text-zinc-200" : "text-zinc-400 dark:text-zinc-650")} />
                <span className={cn(
                  "text-sm truncate",
                  isActive ? "text-zinc-900 dark:text-white font-medium" : "text-zinc-500 dark:text-zinc-450 group-hover:text-zinc-800 dark:group-hover:text-zinc-200"
                )}>
                  {firstMsg}
                </span>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(activeServiceId, id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-all text-zinc-450 dark:text-zinc-500 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-zinc-300 dark:border-zinc-800 bg-[#EDF0F2] dark:bg-[#030303] transition-colors duration-200">
        <div className="flex items-center space-x-3 px-2 py-2 rounded-lg hover:bg-white/80 dark:hover:bg-zinc-900 transition-colors cursor-pointer text-zinc-700 dark:text-zinc-300">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 transition-colors">
            <img src={UserAvatar} alt="User Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-semibold truncate">Dear Friend</p>
            <p className="text-[10px] text-zinc-450 dark:text-zinc-500 truncate">Free Plan</p>
          </div>
        </div>
      </div>
    </div>
  );
};
