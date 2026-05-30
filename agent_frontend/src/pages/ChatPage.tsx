import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { useChat } from '../hooks/useChat';
import { ChatMessage } from '../components/ChatMessage';
import { cn } from '../utils';
import AgentIcon from '../assets/icon.png';
import { Send, FileUp, FolderPlus, Sparkles, AlertCircle, Plus, X, FileText, FileSpreadsheet, File, Square } from 'lucide-react';
import { FileItem } from '../types';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const ChatPage: React.FC = () => {
  const { activeServiceId, activeSessionId, createSession, messages, setActiveService } = useAppStore();
  const [input, setInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const currentSessionId = activeSessionId[activeServiceId];
  const isWorkflowRunning = useAppStore((state) => state.isWorkflowRunning[currentSessionId] || false);

  // Draft file upload states
  const [pendingFiles, setPendingFiles] = useState<FileItem[]>([]);
  const [showUploadMenu, setShowUploadMenu] = useState(false);

  // Configurator states for book_writing_workflow
  const [routeType, setRouteType] = useState<'with_image' | 'no_image' | ''>('');
  const [refMode, setRefMode] = useState<'template' | 'custom' | ''>('');
  const [useTemplate, setUseTemplate] = useState(true);
  const [imageNum, setImageNum] = useState<number>(3);
  const [num, setNum] = useState<number>(1500);
  const [bookStyle, setBookStyle] = useState('专业教学风');
  const [target, setTarget] = useState('项目案例');
  const [markers, setMarkers] = useState('学习结果评价');
  const [imgStyle, setImgStyle] = useState('专业教学风');



  // 监听工作流路由事件（通过意图识别进入工作流）
  useEffect(() => {
    const handleWorkflowRoute = (event: CustomEvent) => {
      const { workflowId } = event.detail;
      console.log('Routing to workflow:', workflowId);

      // 仅切换到对应的工作流服务，不主动创建空会话，等待用户进行实际操作（发送消息或上传文件）时懒加载创建
      if (workflowId) {
        setActiveService(workflowId);
      }
    };

    window.addEventListener('workflow-route', handleWorkflowRoute as unknown as EventListener);
    return () => {
      window.removeEventListener('workflow-route', handleWorkflowRoute as unknown as EventListener);
    };
  }, [setActiveService]);

  const { sendMessage, stopWorkflow } = useChat(activeServiceId, currentSessionId);
  const currentMessages = messages[currentSessionId] || [];

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  const handleSend = async () => {
    const isConfigured = routeType === 'no_image' || (routeType === 'with_image' && refMode !== '');
    const isWritingWorkflow = activeServiceId === 'book_writing_workflow';

    if (input.trim() || pendingFiles.length > 0 || (isWritingWorkflow && isConfigured && !isWorkflowRunning)) {
      let targetSessionId = currentSessionId;
      if (!targetSessionId) {
        try {
          targetSessionId = await createSession(activeServiceId);
          console.log('Session lazily created on user input:', targetSessionId);
        } catch (err) {
          console.error('Failed to create session lazily:', err);
          return;
        }
      }

      let messageText = input.trim();
      
      if (isWritingWorkflow && isConfigured && !isWorkflowRunning) {
        if (routeType === 'no_image') {
          messageText = `开始工作流：--book-style "${bookStyle}" --num ${num} --image-num 0 --direct-run`;
        } else {
          messageText = `开始工作流：--book-style "${bookStyle}" --num ${num} --target "${target}" --markers "${markers}" --img-style "${imgStyle}" --image-num ${imageNum} ${useTemplate ? '参考模板' : '不参考'} --direct-run`;
        }
      } else if (!messageText) {
        messageText = `📁 上传了 ${pendingFiles.length} 个文件`;
      }

      sendMessage(messageText, targetSessionId, pendingFiles);
      setInput('');
      setPendingFiles([]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let targetSessionId = currentSessionId;
    if (!targetSessionId) {
      try {
        targetSessionId = await createSession(activeServiceId);
        console.log('Session lazily created on file upload:', targetSessionId);
      } catch (err) {
        console.error('Failed to create session lazily for upload:', err);
        return;
      }
    }

    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;
    const uploadedFilesList: FileItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);

      // For folder upload, webkitRelativePath contains the path
      const relPath = (file as any).webkitRelativePath || file.name;

      try {
        const response = await fetch(`http://localhost:8000/api/v1/file/upload?session_id=${targetSessionId}&relative_path=${encodeURIComponent(relPath)}`, {
          method: 'POST',
          body: formData,
        });
        if (response.ok) {
          successCount++;
          uploadedFilesList.push({
            name: relPath,
            type: file.type || file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase(),
            size: file.size,
            url: `http://localhost:8000/api/v1/file/upload?session_id=${targetSessionId}&relative_path=${encodeURIComponent(relPath)}`
          });
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

    setIsUploading(false);

    if (failCount > 0) {
      alert(`⚠️ 有 ${failCount} 个文件上传失败`);
    }

    // Append newly uploaded files to the pending files draft state!
    setPendingFiles(prev => [...prev, ...uploadedFilesList]);

  };



  return (
    <div className="flex flex-1 overflow-hidden bg-[#EDF0F2] dark:bg-black text-zinc-800 dark:text-zinc-100 transition-colors duration-200">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-[#EDF0F2] dark:bg-black transition-colors duration-200">
        <div className="flex-1 overflow-y-auto p-4 bg-[#EDF0F2] dark:bg-black transition-colors duration-200">
          <div className={`mx-auto px-4 transition-all duration-300 ${activeServiceId === 'video_workflow' ? "max-w-6xl" : "max-w-4xl"}`}>
            {activeServiceId === 'book_writing_workflow' ? (
              <div className="flex flex-col space-y-4">
                {/* Configuration Panel */}
                <div className="flex w-full my-4 px-4 justify-start">
                  <div className="w-full max-w-[85%] flex flex-col min-w-0 items-start">
                    <div className="w-full p-4 rounded-2xl border border-zinc-300 dark:border-zinc-800 bg-white/60 dark:bg-[#030303] shadow-md space-y-4 animate-fadeIn transition-colors duration-200">
                      {/* Header */}
                      <div className="flex items-center space-x-2.5 pb-2.5 border-b border-zinc-200 dark:border-zinc-855">
                        <div className="p-2 bg-white/80 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 rounded-xl border border-zinc-300 dark:border-zinc-800">
                          <Sparkles size={18} className="animate-pulse" />
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight">书籍创作一键直出工作流</h2>
                        </div>
                      </div>

                      {/* Route Selection */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">
                          是否配图 <span className="text-red-500 text-xs font-bold ml-0.5">*</span>
                        </label>
                        <select
                          value={routeType}
                          disabled={isWorkflowRunning}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setRouteType(val);
                            setRefMode(''); // reset reference mode when route type changes
                          }}
                          className={cn(
                            "w-full text-xs px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 dark:focus:ring-zinc-700 dark:focus:border-zinc-700 text-zinc-900 dark:text-zinc-100 transition-all cursor-pointer",
                            isWorkflowRunning
                              ? "bg-zinc-50 dark:bg-zinc-955 border-zinc-200 dark:border-zinc-900 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                              : "bg-zinc-100/80 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800"
                          )}
                        >
                          <option value=""></option>
                          <option value="with_image">配图</option>
                          <option value="no_image">不配图</option>
                        </select>
                      </div>

                      {/* Conditional Illustrated Reference Mode Dropdown */}
                      {routeType === 'with_image' && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">
                            配图参考方式 <span className="text-red-500 text-xs font-bold ml-0.5">*</span>
                          </label>
                          <select
                            value={refMode}
                            disabled={isWorkflowRunning}
                            onChange={(e) => {
                              const val = e.target.value as any;
                              setRefMode(val);
                              if (val === 'template') {
                                setUseTemplate(true);
                              } else if (val === 'custom') {
                                setUseTemplate(false);
                              }
                            }}
                            className={cn(
                              "w-full text-xs px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 dark:focus:ring-zinc-700 dark:focus:border-zinc-700 text-zinc-900 dark:text-zinc-100 transition-all cursor-pointer",
                              isWorkflowRunning
                                ? "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                                : "bg-zinc-100/80 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800"
                            )}
                          >
                            <option value=""></option>
                            <option value="template">参考模板配图</option>
                            <option value="custom">自定义图片数</option>
                          </select>
                        </div>
                      )}

                      {/* Form Container */}
                      <div className="space-y-4">
                        {routeType === 'no_image' && (
                          /* Text-Only Route Parameters */
                          <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                            <div className="space-y-1.5 col-span-1">
                              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">书籍写作风格</label>
                              <input
                                type="text"
                                value={bookStyle}
                                disabled={isWorkflowRunning}
                                onChange={(e) => setBookStyle(e.target.value)}
                                placeholder="专业教学风"
                                className={cn(
                                  "w-full text-xs px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 dark:focus:ring-zinc-700 dark:focus:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 transition-all",
                                  isWorkflowRunning
                                    ? "bg-zinc-50 dark:bg-zinc-955 border-zinc-200 dark:border-zinc-900 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                                    : "bg-zinc-100/80 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800"
                                )}
                              />
                            </div>
                            <div className="space-y-1.5 col-span-1">
                              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">每小节目标字数</label>
                              <input
                                type="number"
                                min={100}
                                max={10000}
                                value={num}
                                disabled={isWorkflowRunning}
                                onChange={(e) => setNum(parseInt(e.target.value) || 1500)}
                                className={cn(
                                  "w-full text-xs px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 dark:focus:ring-zinc-700 dark:focus:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-650 transition-all",
                                  isWorkflowRunning
                                    ? "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                                    : "bg-zinc-100/80 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800"
                                )}
                              />
                            </div>
                          </div>
                        )}

                        {routeType === 'with_image' && refMode !== '' && (
                          /* Illustrated Route Parameters */
                          <div className="space-y-4 animate-fadeIn">
                            {/* Parameter Inputs Grid */}
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-1.5 col-span-1">
                                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">每小节目标字数</label>
                                <input
                                  type="number"
                                  min={100}
                                  max={10000}
                                  value={num}
                                  disabled={isWorkflowRunning}
                                  onChange={(e) => setNum(parseInt(e.target.value) || 1500)}
                                  className={cn(
                                    "w-full text-xs px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 dark:focus:ring-zinc-700 dark:focus:border-zinc-700 text-zinc-900 dark:text-zinc-100 transition-all",
                                    isWorkflowRunning
                                      ? "bg-zinc-50 dark:bg-zinc-955 border-zinc-200 dark:border-zinc-900 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                                      : "bg-zinc-100/80 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800"
                                  )}
                                />
                              </div>

                              <div className="space-y-1.5 col-span-1">
                                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">书籍写作风格</label>
                                <input
                                  type="text"
                                  value={bookStyle}
                                  disabled={isWorkflowRunning}
                                  onChange={(e) => setBookStyle(e.target.value)}
                                  placeholder="专业教学风"
                                  className={cn(
                                    "w-full text-xs px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 dark:focus:ring-zinc-700 dark:focus:border-zinc-700 text-zinc-900 dark:text-zinc-100 transition-all",
                                    isWorkflowRunning
                                      ? "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                                      : "bg-zinc-100/80 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800"
                                  )}
                                />
                              </div>

                              <div className="space-y-1.5 col-span-1">
                                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">待提取章节标题</label>
                                <input
                                  type="text"
                                  value={target}
                                  disabled={isWorkflowRunning}
                                  onChange={(e) => setTarget(e.target.value)}
                                  placeholder="无"
                                  className={cn(
                                    "w-full text-xs px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 dark:focus:ring-zinc-700 dark:focus:border-zinc-700 text-zinc-900 dark:text-zinc-100 transition-all",
                                    isWorkflowRunning
                                      ? "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                                      : "bg-zinc-100/80 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800"
                                  )}
                                />
                              </div>

                              <div className="space-y-1.5 col-span-1">
                                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">终止提取标记词</label>
                                <input
                                  type="text"
                                  value={markers}
                                  disabled={isWorkflowRunning}
                                  onChange={(e) => setMarkers(e.target.value)}
                                  placeholder="无"
                                  className={cn(
                                    "w-full text-xs px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 dark:focus:ring-zinc-700 dark:focus:border-zinc-700 text-zinc-900 dark:text-zinc-100 transition-all",
                                    isWorkflowRunning
                                      ? "bg-zinc-50 dark:bg-zinc-955 border-zinc-200 dark:border-zinc-900 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                                      : "bg-zinc-100/80 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800"
                                  )}
                                />
                              </div>

                              <div className="space-y-1.5 col-span-1">
                                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">配图数量</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={50}
                                  value={useTemplate ? '' : imageNum}
                                  disabled={useTemplate || isWorkflowRunning}
                                  onChange={(e) => setImageNum(parseInt(e.target.value) || 3)}
                                  className={cn(
                                    "w-full text-xs px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 dark:focus:ring-zinc-700 dark:focus:border-zinc-700 text-zinc-900 dark:text-zinc-100 transition-all",
                                    useTemplate || isWorkflowRunning
                                      ? "bg-zinc-100/80 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                                      : "bg-zinc-100/80 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800"
                                  )}
                                />
                              </div>

                              <div className="space-y-1.5 col-span-1">
                                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">自定义绘图风格</label>
                                <input
                                  type="text"
                                  value={imgStyle}
                                  disabled={isWorkflowRunning}
                                  onChange={(e) => setImgStyle(e.target.value)}
                                  placeholder="专业教学风"
                                  className={cn(
                                    "w-full text-xs px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 dark:focus:ring-zinc-700 dark:focus:border-zinc-700 text-zinc-900 dark:text-zinc-100 transition-all",
                                    isWorkflowRunning
                                      ? "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                                      : "bg-zinc-100/80 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800"
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Reminder Badge (Only show when route is fully configured) */}
                      {(routeType === 'no_image' || (routeType === 'with_image' && refMode !== '')) && (
                        <div className="space-y-4 pt-2 animate-fadeIn">
                          {/* Reminder Badge */}
                          <div className="flex items-center space-x-2 p-3 bg-[#F8F9FA]/80 border border-zinc-300 text-zinc-755 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 text-xs rounded-2xl transition-colors">
                            <AlertCircle size={14} className="flex-shrink-0 text-zinc-550 dark:text-zinc-455" />
                            <span>💡 提示：确认参数无误后，请确认已通过输入框左下角的 加号图标 上传了 书籍目录 和 Word 样式模板。</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Render any system/upload messages below the configurator panel so they can see upload progress! */}
                {currentMessages.map(msg => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    onContinueWorkflow={msg.workflowPaused ? (customInput?: string) => sendMessage(customInput || '继续', undefined, [], true) : undefined}
                  />
                ))}
              </div>
            ) : currentMessages.length === 0 ? (
              /* Default Welcome Area */
              <div className="flex flex-col items-center justify-center h-full text-zinc-550 dark:text-zinc-400 mt-32">
                {activeServiceId === 'main' && (
                  <>
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 overflow-hidden border border-zinc-300 dark:border-zinc-800 flex-shrink-0 transition-colors duration-200 bg-white/80 dark:bg-zinc-900">
                      <img src={AgentIcon} alt="Agent Icon" className="w-full h-full object-cover" />
                    </div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                      一念风起，万事从容
                    </h2>
                  </>
                )}
              </div>
            ) : (
              /* Standard chat messages for started workflows / other services */
              currentMessages.map(msg => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onContinueWorkflow={msg.workflowPaused ? (customInput?: string) => sendMessage(customInput || '继续', undefined, [], true) : undefined}
                />
              ))
            )}
            {isUploading && (
              <div className="flex items-center space-x-2 text-zinc-850 dark:text-white text-sm animate-pulse py-4 justify-center">
                <FileUp size={16} />
                <span>Uploading files to workspace...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-zinc-300 bg-[#EDF0F2] p-6 dark:border-zinc-900 dark:bg-black transition-colors duration-200">
          <div className={`mx-auto transition-all duration-300 ${activeServiceId === 'video_workflow' ? "max-w-6xl" : "max-w-4xl"}`}>
            {/* Workflow Quick Access Buttons - 仅在 main 服务时显示 */}
            {activeServiceId === 'main' && (
              <div className="mb-3 flex flex-wrap gap-2 justify-end">
                <button
                  onClick={() => setActiveService('foreign_talk_workflow')}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-zinc-650 hover:bg-white hover:text-zinc-900 rounded-lg transition-all border border-zinc-300 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white dark:border-zinc-800 bg-white/60 dark:bg-transparent shadow-xs hover:shadow-sm"
                >
                  <span>📊</span>
                  <span>外语对话工作流</span>
                </button>
                <button
                  onClick={() => setActiveService('video_workflow')}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-zinc-655 hover:bg-white hover:text-zinc-900 rounded-lg transition-all border border-zinc-300 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white dark:border-zinc-800 bg-white/60 dark:bg-transparent shadow-xs hover:shadow-sm"
                >
                  <span>🎬</span>
                  <span>视频处理工作流</span>
                </button>
                <button
                  onClick={() => setActiveService('book_writing_workflow')}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-zinc-655 hover:bg-white hover:text-zinc-900 rounded-lg transition-all border border-zinc-300 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white dark:border-zinc-800 bg-white/60 dark:bg-transparent shadow-xs hover:shadow-sm"
                >
                  <span>📚</span>
                  <span>书籍创作工作流</span>
                </button>
              </div>
            )}

            {/* Pending Files List (Replacing the deleted upload action bar) */}
            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-2.5 mb-3 px-1">
                {pendingFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-zinc-300 rounded-xl dark:bg-[#090909] dark:border-zinc-800 relative group animate-fadeIn shadow-xs"
                  >
                    <div className={cn(
                      "p-1.5 rounded-lg flex-shrink-0 text-xs bg-zinc-100 text-zinc-650 dark:bg-zinc-850 dark:text-zinc-200"
                    )}>
                      {file.name.endsWith('.docx') || file.name.endsWith('.doc') ? (
                        <FileText size={13} />
                      ) : file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv') ? (
                        <FileSpreadsheet size={13} />
                      ) : file.name.endsWith('.pdf') ? (
                        <FileText size={13} />
                      ) : (
                        <File size={13} />
                      )}
                    </div>
                    <div className="min-w-0 max-w-[150px] pr-1">
                      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-300 truncate" title={file.name}>
                        {file.name.split('/').pop() || file.name}
                      </p>
                      <p className="text-[9px] text-zinc-500 mt-0.5">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => {
                        setPendingFiles(prev => prev.filter((_, i) => i !== idx));
                      }}
                      className="p-1 rounded-full bg-zinc-100 hover:bg-red-500 hover:text-white dark:bg-zinc-850 dark:hover:bg-red-600 text-zinc-500 dark:text-zinc-400 transition-all cursor-pointer opacity-70 hover:opacity-100 active:scale-90"
                      title="删除"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Hidden native file inputs */}
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            {/* @ts-ignore */}
            <input type="file" ref={folderInputRef} className="hidden" webkitdirectory="" directory="" onChange={handleFileUpload} />

            <div className="flex items-end space-x-2 bg-zinc-100/80 border border-zinc-300 rounded-2xl p-3 shadow-xs focus-within:ring-2 focus-within:ring-zinc-300 focus-within:border-zinc-400 dark:bg-[#090909] dark:border-zinc-800 dark:focus-within:ring-zinc-850 dark:focus-within:border-zinc-700 transition-all relative">
              {/* Plus Menu Button */}
              <div className="relative mb-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadMenu(!showUploadMenu);
                  }}
                  className="p-2 rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                  title="添加附件或下载文件"
                >
                  <Plus size={20} />
                </button>

                {/* Upload Menu Dropdown */}
                {showUploadMenu && (
                  <div className="absolute bottom-12 left-0 w-48 bg-white dark:bg-[#090909] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl py-2 z-50 animate-fadeIn backdrop-blur-md">
                    <button
                      type="button"
                      onClick={() => {
                        fileInputRef.current?.click();
                        setShowUploadMenu(false);
                      }}
                      className="w-full flex items-center space-x-2.5 px-4 py-2.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-855 transition-all text-left"
                    >
                      <FileUp size={14} className="text-zinc-500 dark:text-zinc-400" />
                      <span>上传文件</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        folderInputRef.current?.click();
                        setShowUploadMenu(false);
                      }}
                      className="w-full flex items-center space-x-2.5 px-4 py-2.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-855 transition-all text-left"
                    >
                      <FolderPlus size={14} className="text-zinc-500 dark:text-zinc-400" />
                      <span>上传文件夹</span>
                    </button>
                  </div>
                )}
              </div>

              <textarea
                className="flex-1 min-h-[44px] bg-transparent resize-y outline-none py-2 px-3 text-sm text-zinc-850 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-650"
                placeholder=""
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              {isWorkflowRunning ? (
                <button
                  onClick={() => stopWorkflow(currentSessionId)}
                  className="p-2.5 rounded-xl bg-red-500 text-white hover:bg-red-650 transition-all shadow-md mb-1 cursor-pointer active:scale-95"
                  title="停止当前工作流"
                >
                  <Square size={20} fill="white" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim() && pendingFiles.length === 0 && !(activeServiceId === 'book_writing_workflow' && (routeType === 'no_image' || (routeType === 'with_image' && refMode !== '')) && !isWorkflowRunning)}
                  className="p-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600 disabled:cursor-not-allowed hover:bg-zinc-800 dark:hover:bg-zinc-250 transition-all shadow-md mb-1"
                >
                  <Send size={20} />
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
