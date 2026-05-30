import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Settings as SettingsIcon, X } from 'lucide-react';

export const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { 
    apiKey, apiBase, modelName, temperature, setApiConfig,
    videoScriptKey, videoScriptBase, videoScriptModel, videoScriptTemp,
    videoImageKey, videoImageBase, videoImageModel, videoImageSteps,
    videoVideoProvider, videoVideoKey, videoVideoBase, videoVideoModel,
    setVideoConfig,
    bookLlmKey, bookLlmBase, bookLlmModel, bookLlmTemp,
    bookImageKey, bookImageBase, bookImageModel, bookImageSize,
    bookDirectory, bookTemplate,
    setBookConfig
  } = useAppStore();

  // General Settings State
  const [tempKey, setTempKey] = useState(apiKey);
  const [tempBase, setTempBase] = useState(apiBase);
  const [tempModel, setTempModel] = useState(modelName);
  const [tempTemperature, setTempTemperature] = useState(temperature);

  // Video Script Settings State
  const [tempVideoScriptKey, setTempVideoScriptKey] = useState(videoScriptKey);
  const [tempVideoScriptBase, setTempVideoScriptBase] = useState(videoScriptBase);
  const [tempVideoScriptModel, setTempVideoScriptModel] = useState(videoScriptModel);
  const [tempVideoScriptTemp, setTempVideoScriptTemp] = useState(videoScriptTemp);

  // Video Image Settings State
  const [tempVideoImageKey, setTempVideoImageKey] = useState(videoImageKey);
  const [tempVideoImageBase, setTempVideoImageBase] = useState(videoImageBase);
  const [tempVideoImageModel, setTempVideoImageModel] = useState(videoImageModel);
  const [tempVideoImageSteps, setTempVideoImageSteps] = useState(videoImageSteps);

  // Video Generation Settings State
  const [tempVideoVideoProvider, setTempVideoVideoProvider] = useState(videoVideoProvider);
  const [tempVideoVideoKey, setTempVideoVideoKey] = useState(videoVideoKey);
  const [tempVideoVideoBase, setTempVideoVideoBase] = useState(videoVideoBase);
  const [tempVideoVideoModel, setTempVideoVideoModel] = useState(videoVideoModel);

  // Book Writing LLM Settings State
  const [tempBookLlmKey, setTempBookLlmKey] = useState(bookLlmKey);
  const [tempBookLlmBase, setTempBookLlmBase] = useState(bookLlmBase);
  const [tempBookLlmModel, setTempBookLlmModel] = useState(bookLlmModel);
  const [tempBookLlmTemp, setTempBookLlmTemp] = useState(bookLlmTemp);

  // Book Writing Image Settings State
  const [tempBookImageKey, setTempBookImageKey] = useState(bookImageKey);
  const [tempBookImageBase, setTempBookImageBase] = useState(bookImageBase);
  const [tempBookImageModel, setTempBookImageModel] = useState(bookImageModel);
  const [tempBookImageSize, setTempBookImageSize] = useState(bookImageSize);

  // Book Writing Directory & Template State
  const [tempBookDirectory, setTempBookDirectory] = useState(bookDirectory);
  const [tempBookTemplate, setTempBookTemplate] = useState(bookTemplate);

  // Sync local states when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempKey(apiKey);
      setTempBase(apiBase);
      setTempModel(modelName);
      setTempTemperature(temperature);

      setTempVideoScriptKey(videoScriptKey);
      setTempVideoScriptBase(videoScriptBase);
      setTempVideoScriptModel(videoScriptModel);
      setTempVideoScriptTemp(videoScriptTemp);

      setTempVideoImageKey(videoImageKey);
      setTempVideoImageBase(videoImageBase);
      setTempVideoImageModel(videoImageModel);
      setTempVideoImageSteps(videoImageSteps);

      setTempVideoVideoProvider(videoVideoProvider);
      setTempVideoVideoKey(videoVideoKey);
      setTempVideoVideoBase(videoVideoBase);
      setTempVideoVideoModel(videoVideoModel);

      setTempBookLlmKey(bookLlmKey);
      setTempBookLlmBase(bookLlmBase);
      setTempBookLlmModel(bookLlmModel);
      setTempBookLlmTemp(bookLlmTemp);

      setTempBookImageKey(bookImageKey);
      setTempBookImageBase(bookImageBase);
      setTempBookImageModel(bookImageModel);
      setTempBookImageSize(bookImageSize);
      
      setTempBookDirectory(bookDirectory);
      setTempBookTemplate(bookTemplate);
    }
  }, [
    isOpen, apiKey, apiBase, modelName, temperature,
    videoScriptKey, videoScriptBase, videoScriptModel, videoScriptTemp,
    videoImageKey, videoImageBase, videoImageModel, videoImageSteps,
    videoVideoProvider, videoVideoKey, videoVideoBase, videoVideoModel,
    bookLlmKey, bookLlmBase, bookLlmModel, bookLlmTemp,
    bookImageKey, bookImageBase, bookImageModel, bookImageSize,
    bookDirectory, bookTemplate
  ]);

  if (!isOpen) return null;

  const handleSave = () => {
    setApiConfig(tempKey, tempBase, tempModel, tempTemperature);
    setVideoConfig({
      videoScriptKey: tempVideoScriptKey,
      videoScriptBase: tempVideoScriptBase,
      videoScriptModel: tempVideoScriptModel,
      videoScriptTemp: tempVideoScriptTemp,
      videoImageKey: tempVideoImageKey,
      videoImageBase: tempVideoImageBase,
      videoImageModel: tempVideoImageModel,
      videoImageSteps: tempVideoImageSteps,
      videoVideoProvider: tempVideoVideoProvider,
      videoVideoKey: tempVideoVideoKey,
      videoVideoBase: tempVideoVideoBase,
      videoVideoModel: tempVideoVideoModel
    });
    setBookConfig({
      bookLlmKey: tempBookLlmKey,
      bookLlmBase: tempBookLlmBase,
      bookLlmModel: tempBookLlmModel,
      bookLlmTemp: tempBookLlmTemp,
      bookImageKey: tempBookImageKey,
      bookImageBase: tempBookImageBase,
      bookImageModel: tempBookImageModel,
      bookImageSize: tempBookImageSize,
      bookDirectory: tempBookDirectory,
      bookTemplate: tempBookTemplate
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 backdrop-blur-md transition-all duration-300">
      <div className="bg-[#EDF0F2] border border-zinc-300 dark:border-zinc-800 rounded-3xl w-[500px] max-h-[85vh] shadow-2xl overflow-hidden flex flex-col dark:bg-[#0a0a0a]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-300 dark:border-zinc-850 bg-white/80 dark:bg-[#060606]">
          <div className="flex items-center space-x-2.5 font-bold text-zinc-900 dark:text-white text-lg">
            <SettingsIcon size={20} className="text-zinc-650 dark:text-zinc-400" />
            <span>Settings Configuration</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-900 rounded-lg transition-colors">
            <X size={20} className="text-zinc-550 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white" />
          </button>
        </div>
 
        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-zinc-700 dark:text-zinc-300">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">API Key</label>
              <input 
                type="password"
                className="w-full border border-zinc-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-700 outline-none bg-zinc-100/80 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-655"
                placeholder="sk-..."
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
              />
              <p className="text-xs text-zinc-500 mt-1">Your API key is stored locally in your browser workspace.</p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">API Base URL</label>
              <input 
                type="text"
                className="w-full border border-zinc-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-700 outline-none bg-zinc-100/80 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-655"
                placeholder="https://api.openai.com/v1"
                value={tempBase}
                onChange={(e) => setTempBase(e.target.value)}
              />
            </div>
 
            <div>
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">Model Name</label>
              <input
                type="text"
                className="w-full border border-zinc-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-700 outline-none bg-zinc-100/80 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-655"
                placeholder="gpt-4-turbo"
                value={tempModel}
                onChange={(e) => setTempModel(e.target.value)}
              />
            </div>
 
            <div>
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                Temperature <span className="text-zinc-950 dark:text-white font-mono ml-1 font-bold">{tempTemperature.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={tempTemperature}
                onChange={(e) => setTempTemperature(parseFloat(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-zinc-300 dark:bg-zinc-800 accent-zinc-800 dark:accent-white"
              />
              <div className="flex justify-between text-xs text-zinc-500 mt-1 font-medium">
                <span>Precise (0.0)</span>
                <span>Creative (1.0)</span>
              </div>
            </div>
          </div>
        </div>
 
        {/* Footer */}
        <div className="flex justify-end p-4 bg-white/80 dark:bg-[#060606] space-x-3 border-t border-zinc-300 dark:border-zinc-855">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-5 py-2 text-sm font-semibold bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-98"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
