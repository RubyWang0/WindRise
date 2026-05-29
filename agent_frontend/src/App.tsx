import { useState, useEffect } from 'react';
import { ChatPage } from './pages/ChatPage';
import { Sidebar } from './components/Sidebar';
import { SettingsModal } from './components/SettingsModal';
import { Settings as SettingsIcon, Sun, Moon, Home as HomeIcon } from 'lucide-react';
import { useAppStore } from './store';

export interface AgentAppProps {
  showHomeButton?: boolean;
  onBackToHome?: () => void;
}

function App({ showHomeButton = false, onBackToHome }: AgentAppProps = {}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { 
    theme, toggleTheme, activeServiceId, setActiveService, fetchTemperatureStart,
    sessions, messages, createSession, deleteSession, switchSession
  } = useAppStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    // Fetch default temperature_start from backend on startup
    fetchTemperatureStart();

    const initializeSessions = async () => {
      const services = ['main', 'foreign_talk_workflow', 'video_workflow', 'book_writing_workflow'];
      
      // 1. Clean up empty sessions from previous loads to prevent clutter
      services.forEach(serviceId => {
        const serviceSessions = sessions[serviceId] || [];
        const emptySessions = serviceSessions.filter(id => !messages[id] || messages[id].length === 0);
        emptySessions.forEach(id => {
          deleteSession(serviceId, id);
        });
      });

      // 2. Create a fresh empty local session for each service on startup
      // (This ensures a selected 'New Session' box in the sidebar on startup, showing the welcome page)
      for (const serviceId of services) {
        const remainingSessions = useAppStore.getState().sessions[serviceId] || [];
        const activeId = useAppStore.getState().activeSessionId[serviceId];
        
        const needsNewSession = remainingSessions.length === 0 || 
          (activeId && messages[activeId] && messages[activeId].length > 0);
        
        if (needsNewSession) {
          await createSession(serviceId);
        } else if (remainingSessions.length > 0) {
          const emptySessionId = remainingSessions.find(id => !messages[id] || messages[id].length === 0);
          if (emptySessionId && activeId !== emptySessionId) {
            switchSession(serviceId, emptySessionId);
          }
        }
      }
    };

    initializeSessions();
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#EDF0F2] dark:bg-black text-zinc-800 dark:text-zinc-100 font-sans transition-colors duration-200">
      <header className="flex-shrink-0 bg-[#EDF0F2] dark:bg-[#030303] border-b border-zinc-300 dark:border-zinc-800 shadow-sm z-10 transition-colors duration-200">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {showHomeButton && onBackToHome && (
              <>
                <button 
                  onClick={onBackToHome}
                  className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-zinc-650 dark:text-zinc-400 hover:bg-white/80 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-all border border-zinc-300 dark:border-transparent bg-white/40 dark:bg-transparent cursor-pointer"
                  title="返回首页"
                >
                  <HomeIcon size={18} />
                  <span>返回首页</span>
                </button>
                <div className="h-4 w-[1px] bg-zinc-300 dark:bg-zinc-800" />
              </>
            )}
            {activeServiceId === 'main' ? (
              <h1 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">WindRise</h1>
            ) : (
              <button 
                onClick={() => setActiveService('main')}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-[#F8F9FA] dark:hover:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg transition-all bg-white dark:bg-transparent cursor-pointer"
              >
                <span>←</span>
                <span>返回主Agent</span>
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={toggleTheme}
              className="p-2 hover:bg-white/80 dark:hover:bg-zinc-900 rounded-full transition-colors text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-300 dark:border-transparent bg-white/40 dark:bg-transparent cursor-pointer"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 hover:bg-white/80 dark:hover:bg-zinc-900 rounded-full transition-colors text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-300 dark:border-transparent bg-white/40 dark:bg-transparent cursor-pointer"
            >
              <SettingsIcon size={20} />
            </button>
          </div>
        </div>
      </header>
      
      <main className="flex-1 flex overflow-hidden">
        <Sidebar />
        <ChatPage />
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

export default App;
