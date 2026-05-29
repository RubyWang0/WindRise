import React, { useState } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import { cn } from '../utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ChevronDown, ChevronUp, Terminal, Lightbulb, Play, Settings, BookOpen, Sparkles, FileText, FileSpreadsheet, File } from 'lucide-react';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface Props {
  message: ChatMessageType;
  onContinueWorkflow?: (userInput?: string) => void;
}

const rewriteLocalUrl = (url?: string): string => {
  if (!url) return '';
  if (url.startsWith('file:///')) {
    const workspaceIndex = url.indexOf('/workspace/');
    if (workspaceIndex !== -1) {
      const relativePath = url.substring(workspaceIndex + '/workspace/'.length);
      return `http://localhost:8000/workspace/${relativePath}`;
    }
  }
  return url;
};

const getChildrenText = (children: React.ReactNode): string => {
  if (!children) return '';
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) {
    return children.map(getChildrenText).join('');
  }
  if (React.isValidElement(children)) {
    return getChildrenText(children.props.children);
  }
  return '';
};

const cleanWorkflowContent = (content?: string): string => {
  if (!content) return '';
  let cleaned = content;
  cleaned = cleaned.replace(/📁 \*\*本地工作区(主)?目录：\*\* \[打开工作区文件夹\]\(file:\/\/.*?\)/g, '');
  cleaned = cleaned.replace(/💡 \*\*本地工作区目录：\*\*\n`.*?`(\n)?/g, '');
  cleaned = cleaned.replace(/(<br>)?\s*\[🖼️ 查看大图\]\(file:\/\/.*?\)/g, '');
  cleaned = cleaned.replace(/(<br>)?\s*\[▶️ 外部播放\]\(file:\/\/.*?\)/g, '');
  return cleaned;
};

export const ChatMessage: React.FC<Props> = ({ message, onContinueWorkflow }) => {
  const isUser = message.role === 'user';

  if (isUser && message.isSystemCommand) {
    return null;
  }

  const [showLog, setShowLog] = useState(true);

  // Form states for Book Writing Workflow Step 1 Pause
  const isBookWorkflowStep1Pause = !isUser && message.templateImageCount !== undefined;
  const isFormActive = !!onContinueWorkflow && !!message.workflowPaused;
  const [useTemplate, setUseTemplate] = useState(message.templateImageCount !== 0);
  const [imageNum, setImageNum] = useState<number>(message.templateImageCount || 3);
  const [target, setTarget] = useState('项目案例');
  const [markers, setMarkers] = useState('学习结果评价');
  const [imgStyle, setImgStyle] = useState('专业教学风');

  const hasProcessLog = !isUser && !!(message.thoughts?.length || message.toolCalls?.length);
  const isTable = !isUser && !!message.content && message.content.includes('|');

  return (
    <div className={cn("flex w-full my-6 px-4", isUser ? "justify-end" : "justify-start")}>
      <div className={cn(isTable ? "w-full max-w-[96%] flex flex-col min-w-0" : "max-w-[85%] flex flex-col min-w-0", isUser ? "items-end" : "items-start")}>
        <div 
          className={cn(
            "px-4 py-3 rounded-2xl shadow-sm break-words overflow-x-hidden w-full",
            isUser 
              ? "bg-white border border-zinc-300 text-zinc-900 rounded-br-none dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800" 
              : "bg-[#EDF0F2] border border-zinc-300 text-zinc-900 rounded-bl-none dark:bg-[#030303] dark:text-zinc-100 dark:border-zinc-800"
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap text-sm break-words">{message.content}</div>
          ) : (
            <div className="flex flex-col space-y-3 min-w-0">
              {/* Process Log Toggle */}
              {hasProcessLog ? (
                <div className="bg-white dark:bg-zinc-950 rounded-lg border border-zinc-300 dark:border-zinc-850 overflow-hidden w-full">
                  <button 
                    onClick={() => setShowLog(!showLog)}
                    className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <Terminal size={12} className="text-zinc-500 dark:text-zinc-400" />
                      <span>Process Log</span>
                    </div>
                    {showLog ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  
                  {showLog && (
                    <div className="p-3 border-t border-zinc-300 dark:border-zinc-850 space-y-4 max-h-[300px] overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/60">
                      {/* Thoughts */}
                      {!!message.thoughts?.length && (
                        <div className="space-y-2">
                          {message.thoughts.map((t, i) => (
                            <div key={i} className="flex items-start space-x-2">
                              <Lightbulb size={12} className={cn("mt-1 flex-shrink-0", t.status === 'thinking' ? "text-zinc-900 dark:text-white animate-pulse" : "text-zinc-500")} />
                              <span className="text-xs text-zinc-650 dark:text-zinc-400 break-words">{t.content}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Tool Calls */}
                      {!!message.toolCalls?.length && (
                        <div className="space-y-2">
                          {message.toolCalls.map((call, i) => (
                            <div key={i} className="bg-zinc-100 dark:bg-zinc-900 p-2 rounded border border-zinc-300 dark:border-zinc-850 shadow-xs min-w-0 overflow-hidden">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-mono font-bold text-zinc-900 dark:text-white truncate">{call.toolName}</span>
                                <span className={cn(
                                  "text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0",
                                  call.status === 'running' ? "bg-zinc-300 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200" : "bg-zinc-200/50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-450 border border-zinc-300 dark:border-zinc-800"
                                )}>{call.status}</span>
                              </div>
                              <div className="text-[10px] text-zinc-500 font-mono break-all">{JSON.stringify(call.params)}</div>
                              {call.result && (
                                <div className="mt-1.5 pt-1.5 border-t border-zinc-300 dark:border-zinc-850 text-[10px] text-zinc-650 dark:text-zinc-400 font-mono break-all italic">
                                  {typeof call.result === 'string' ? call.result : JSON.stringify(call.result)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Main Content */}
              {(message.content || !message.files || message.files.length === 0) && (
                <div className="prose prose-sm max-w-none text-gray-800 dark:text-gray-200 dark:prose-invert overflow-x-hidden break-words">
                  {message.content ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        pre: ({node, ...props}) => <div className="overflow-x-auto my-2 rounded-lg bg-gray-900 p-2 dark:bg-black/50"><pre {...props} /></div>,
                        code: ({node, inline, ...props}) => inline
                          ? <code className="bg-gray-100 px-1 rounded text-pink-500 font-mono dark:bg-gray-800 dark:text-pink-400" {...props} />
                          : <code className="!text-slate-200 font-mono" {...props} />,
                        table: ({node, ...props}) => (
                          <div className="overflow-x-auto my-4 w-full border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm bg-white dark:bg-gray-950">
                            <table className="min-w-full divide-y divide-gray-150 dark:divide-gray-800 text-sm" {...props} />
                          </div>
                        ),
                        thead: ({node, ...props}) => (
                          <thead className="bg-gray-50/70 dark:bg-gray-900/50" {...props} />
                        ),
                        tr: ({node, ...props}) => (
                          <tr className="divide-x divide-gray-100 dark:divide-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-50/20 dark:hover:bg-gray-800/10 transition-colors" {...props} />
                        ),
                        th: ({node, ...props}) => {
                          const childrenText = getChildrenText(props.children);
                          let widthClass = "px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300 tracking-wider text-xs uppercase";
                          
                          if (childrenText.includes("分镜画面参考图")) {
                            // 第二步输出表格时“分镜画面参考图”这一项的空间调大
                            widthClass += " min-w-[340px] w-[40%] bg-blue-50/10 dark:bg-blue-905/5";
                          } else if (childrenText.includes("镜头参考图预览")) {
                            // 第三步的生成视频清单与播放预览中，镜头参考图预览空间调小
                            widthClass += " min-w-[120px] w-[12%] bg-gray-50/30 dark:bg-gray-900/20";
                          } else if (childrenText.includes("动态视频播放")) {
                            // 动态视频播放 这一项的空间调大
                            widthClass += " min-w-[380px] w-[48%] bg-blue-50/10 dark:bg-blue-905/5";
                          } else if (childrenText.includes("镜头号") || childrenText.includes("镜头")) {
                            widthClass += " w-[8%] text-center";
                          } else if (childrenText.includes("画面视觉描述")) {
                            widthClass += " min-w-[200px] w-[25%]";
                          } else if (childrenText.includes("运镜设计")) {
                            widthClass += " min-w-[150px] w-[18%]";
                          } else if (childrenText.includes("画面原文字句")) {
                            widthClass += " min-w-[150px] w-[18%]";
                          } else {
                            widthClass += " min-w-[140px]";
                          }
                          
                          return (
                            <th className={widthClass} {...props} />
                          );
                        },
                        td: ({node, ...props}) => (
                          <td className="px-4 py-3.5 text-gray-800 dark:text-gray-200 align-middle leading-relaxed text-sm break-words" {...props} />
                        ),
                        img: ({node, src, alt, ...props}) => {
                          const newSrc = rewriteLocalUrl(src);
                          const altText = alt || '';
                          
                          if (altText.startsWith('参考图')) {
                            // 第三步：镜头参考图预览空间调小（让图变得精致小巧，节省布局）
                            return (
                              <div className="flex flex-col items-center justify-center space-y-1">
                                <img 
                                  src={newSrc} 
                                  alt={alt}
                                  className="w-24 h-24 object-cover rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 transition-all hover:scale-105 hover:shadow-md duration-200 cursor-zoom-in" 
                                  {...props} 
                                />
                              </div>
                            );
                          } else if (altText.startsWith('镜头')) {
                            // 第二步：“分镜画面参考图”这一项的空间调大（高清展示原画）
                            return (
                              <div className="w-full flex flex-col space-y-2">
                                <img 
                                  src={newSrc} 
                                  alt={alt}
                                  className="w-full max-w-sm h-auto object-cover rounded-xl shadow-md border border-gray-150 dark:border-gray-800 transition-all hover:scale-[1.02] hover:shadow-lg duration-300 cursor-zoom-in" 
                                  {...props} 
                                />
                              </div>
                            );
                          }
                          
                          return <img src={newSrc} alt={alt} className="max-w-full rounded-lg shadow-sm my-2 border border-gray-200 dark:border-gray-800" {...props} />;
                        },
                        video: ({node, src, ...props}) => {
                          const newSrc = rewriteLocalUrl(src);
                          return (
                            <div className="w-full flex flex-col space-y-2 my-1">
                              <video 
                                src={newSrc} 
                                controls 
                                className="w-full max-w-md rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 transition-all hover:shadow-xl duration-300" 
                                style={{ maxHeight: '260px' }}
                                {...props} 
                              />
                            </div>
                          );
                        },
                        a: ({node, href, ...props}) => {
                          const childrenText = getChildrenText(props.children);
                          if (
                            childrenText.includes('打开工作区文件夹') ||
                            childrenText.includes('查看大图') ||
                            childrenText.includes('外部播放')
                          ) {
                            return null;
                          }
                          const newHref = rewriteLocalUrl(href);
                          return (
                            <a 
                              href={newHref} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium" 
                              {...props} 
                            />
                          );
                        }
                      }}
                    >
                      {cleanWorkflowContent(message.content)}
                    </ReactMarkdown>
                  ) : (
                    <div className="flex items-center space-x-2 text-zinc-400 py-1">
                      <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                      <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  )}
                </div>
              )}
              {/* File Attachments Area (Like ChatGPT / Claude file chips) */}
              {message.files && message.files.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2.5 w-full">
                  {message.files.map((file, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center space-x-3 px-3.5 py-2.5 bg-white dark:bg-[#090909] border border-zinc-300 dark:border-zinc-800 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all max-w-[280px] cursor-pointer group shadow-sm animate-fadeIn"
                      title={file.name}
                    >
                      <div className={cn(
                        "p-2 rounded-xl flex-shrink-0 transition-transform group-hover:scale-105 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      )}>
                        {file.name.endsWith('.docx') || file.name.endsWith('.doc') ? (
                          <FileText size={16} />
                        ) : file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv') ? (
                          <FileSpreadsheet size={16} />
                        ) : file.name.endsWith('.pdf') ? (
                          <FileText size={16} />
                        ) : (
                          <File size={16} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pr-1">
                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-300 truncate group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                          {file.name.split('/').pop() || file.name}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Workflow Paused - Interactive Parameters Form or Continue Button */}
              {isBookWorkflowStep1Pause ? (
                <div className="mt-4 p-5 rounded-2xl border border-zinc-300 dark:border-zinc-800 bg-white/90 dark:bg-[#090909] w-full max-w-xl space-y-4 shadow-sm backdrop-blur-sm animate-fadeIn text-zinc-850 dark:text-zinc-300">
                  <div className="flex items-center space-x-2 border-b border-zinc-200 dark:border-zinc-850 pb-3">
                    <div className="p-2 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-350 rounded-xl">
                      <Sparkles size={16} />
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">配置智能插图与排版参数</h4>
                        <p className="text-[11px] text-zinc-550 dark:text-zinc-500">
                          {isFormActive ? (
                            <>检测到参考模板包含插图：<span className="font-semibold text-zinc-900 dark:text-white">{message.templateImageCount}</span> 张</>
                          ) : (
                            <span>参数已应用至工作流排版阶段</span>
                          )}
                        </p>
                      </div>
                      {!isFormActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-medium border border-zinc-200 dark:border-zinc-800">
                          已生效
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Reference Mode Selection */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">配图方案参考方式</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          disabled={!isFormActive || message.templateImageCount === 0}
                          onClick={() => {
                            setUseTemplate(true);
                            setImageNum(message.templateImageCount || 3);
                          }}
                          className={cn(
                            "flex items-center justify-center space-x-2 px-3 py-2.5 text-xs font-medium rounded-xl border transition-all",
                            message.templateImageCount === 0
                              ? "opacity-50 cursor-not-allowed border-zinc-200 dark:border-zinc-900 text-zinc-400 dark:text-zinc-650 bg-transparent"
                              : useTemplate
                                ? "border-zinc-800 dark:border-zinc-500 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm font-semibold"
                                : "border-zinc-300 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 bg-white/40 dark:bg-zinc-950/40"
                          )}
                        >
                          <BookOpen size={13} />
                          <span>参考模板配图方案</span>
                        </button>
                        <button
                          type="button"
                          disabled={!isFormActive}
                          onClick={() => setUseTemplate(false)}
                          className={cn(
                            "flex items-center justify-center space-x-2 px-3 py-2.5 text-xs font-medium rounded-xl border transition-all",
                            !useTemplate
                              ? "border-zinc-800 dark:border-zinc-500 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm font-semibold"
                              : "border-zinc-300 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 bg-white/40 dark:bg-zinc-950/40"
                          )}
                        >
                          <Settings size={13} />
                          <span>自主规划配图 (不参考)</span>
                        </button>
                      </div>
                      {message.templateImageCount === 0 && (
                        <p className="text-[10px] text-zinc-500 mt-1">⚠️ 提示：模板无图，无法参考配图方案</p>
                      )}
                    </div>

                    {/* Form Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Chapter Target */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">待提取章节</label>
                        <input
                          type="text"
                          disabled={!isFormActive}
                          value={target}
                          onChange={(e) => setTarget(e.target.value)}
                          placeholder="项目案例"
                          className="w-full text-xs px-3 py-2 bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600"
                        />
                      </div>

                      {/* Truncation Marker */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">终止标记</label>
                        <input
                          type="text"
                          disabled={!isFormActive}
                          value={markers}
                          onChange={(e) => setMarkers(e.target.value)}
                          placeholder="学习结果评价"
                          className="w-full text-xs px-3 py-2 bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600"
                        />
                      </div>

                      {/* Image Number */}
                      <div className="space-y-1.5 col-span-1">
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">配图数量</label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={useTemplate ? '' : imageNum}
                          disabled={!isFormActive || useTemplate}
                          onChange={(e) => setImageNum(parseInt(e.target.value) || 3)}
                          className={cn(
                            "w-full text-xs px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-700 text-zinc-900 dark:text-zinc-100 transition-all",
                            useTemplate || !isFormActive
                              ? "bg-zinc-100 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 text-zinc-400 dark:text-zinc-650 cursor-not-allowed"
                              : "bg-zinc-100/80 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800"
                          )}
                        />
                      </div>

                      {/* Illustration Style */}
                      <div className="space-y-1.5 col-span-1">
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">插图风格</label>
                        <input
                          type="text"
                          disabled={!isFormActive}
                          value={imgStyle}
                          onChange={(e) => setImgStyle(e.target.value)}
                          placeholder="专业教学风"
                          className="w-full text-xs px-3 py-2 bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600"
                        />
                      </div>
                    </div>
                  </div>

                  {isFormActive && (
                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-200 dark:border-zinc-850">
                      <button
                        onClick={() => {
                          const paramStr = `继续，待提取章节是"${target}"，终止标记是"${markers}"，配图数量是${imageNum}，插图风格是"${imgStyle}"，${useTemplate ? '参考模板' : '不参考'}，直出`;
                          onContinueWorkflow(paramStr);
                        }}
                        className="flex items-center space-x-1.5 px-5 py-2.5 text-xs font-semibold text-white dark:text-black bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer active:scale-95"
                      >
                        <Play size={13} />
                        <span>确认并继续</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                message.workflowPaused && onContinueWorkflow && (
                  <div className="flex items-center pt-2">
                    <button
                      onClick={() => onContinueWorkflow()}
                      className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white dark:text-black bg-zinc-900 dark:bg-white hover:bg-zinc-850 dark:hover:bg-zinc-200 rounded-lg transition-all shadow-sm hover:shadow-md cursor-pointer"
                    >
                      <Play size={14} />
                      <span>继续执行</span>
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
