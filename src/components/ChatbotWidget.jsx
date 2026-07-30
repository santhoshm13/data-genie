import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, Sidebar as SidebarIcon, Share, Copy, FileSpreadsheet, 
  Wand2, ArrowDown, RefreshCw, ExternalLink, Plus, Mic, ArrowUp, 
  AlertTriangle, Trash2, X, Square, Check
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { theme } from '../theme';
import DataQualityCard from './DataQualityCard';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function CopyMessageButton({ text }) {
  const [copied, setCopied] = React.useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy}
      className="mt-1.5 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors bg-white/5 hover:bg-white/10 w-7 h-7 rounded-md self-end border border-white/5"
      title="Copy message"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export function ChatbotWidget({
  sidebarOpen, setSidebarOpen,
  handleShare, copied,
  messages, loading,
  messagesEndRef,
  showScrollButton, scrollToBottom,
  datasets, fetchSheetData, removeDataset,
  fileInputRef, handleFileSelect, file,
  input, setInput,
  handleSend, handleStop,
  toggleListening, isListening,
  showQuotaModal, setShowQuotaModal,
  appAlert, setAppAlert,
  renderMessageContent,
  DataQualityCard
}) {
  
  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-bg-main font-sans relative">
      {/* Ambient Animated Particles / Wisps Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-[#6D28D9]/20 to-transparent opacity-60 blur-3xl rounded-full mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-accent-secondary/10 blur-[100px] rounded-full mix-blend-screen animate-blob" />
      </div>

      {/* Main Glass Panel floating above background */}
      <div className="relative z-10 flex-1 flex flex-col bg-bg-panel/80 backdrop-blur-xl border-l border-white/[0.08] shadow-2xl overflow-hidden">
        
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-bg-panel/50">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button aria-label="Open sidebar" onClick={() => setSidebarOpen(true)} className="p-2 text-gray-400 hover:text-white transition-colors hidden md:block">
                <SidebarIcon className="w-5 h-5" />
              </button>
            )}
            <button aria-label="Toggle sidebar" onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-gray-400 md:hover:text-white transition-colors md:hidden">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="text-sm font-bold text-gray-200 tracking-tight ml-2">DataGenie</h1>
          </div>
          
        </header>

        {/* Chat Feed */}
        <main className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar-dark relative" onScroll={(e) => {
          // If you have a handleScroll, you can pass it.
          // For now, let's keep it simple or implement a basic check for showScrollButton
        }}>
          <div className="max-w-3xl mx-auto flex flex-col gap-6">
            
            <AnimatePresence initial={false}>
              {messages.length === 0 ? (
                <motion.div 
                  key="empty-state"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  className="flex flex-col items-center justify-center h-full mt-12 text-center"
                >
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, type: "spring" }}
                    className="w-24 h-24 mb-6 relative animate-genie-float"
                  >
                    <img src="/logo_transparent.png" alt="DataGenie Logo" className="w-full h-full object-contain drop-shadow-[0_0_25px_rgba(139,92,246,0.8)]" draggable="false" />
                  </motion.div>
                  <h2 className="text-2xl md:text-3xl font-extrabold mb-3 tracking-tight flex items-center justify-center gap-2">
                    <span className="text-white">Heyy! I'm</span>
                    <span className="animate-shine" style={{
                      backgroundImage: 'linear-gradient(110deg, #8B5CF6 20%, #22D3EE 40%, #22D3EE 60%, #8B5CF6 80%)',
                      backgroundSize: '200% auto',
                      color: '#000',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      animation: 'shine 3s linear infinite'
                    }}>DataGenie ✨</span>
                  </h2>
                  <div className="text-[#9CA3AF] text-[15px] max-w-md leading-relaxed flex flex-col gap-2">
                    <p className="text-gray-300 font-medium text-center">Your personal, magical AI assistant for all things data.</p>
                    <ul className="text-sm text-left mx-auto space-y-2.5 mt-3 bg-white/5 border border-white/10 rounded-xl p-5 shadow-lg backdrop-blur-sm">
                      <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-gradient-to-r from-accent-primary to-[#6D28D9] shadow-[0_0_8px_#8B5CF6]" /> <span className="text-gray-200">Import seamlessly from <strong className="text-white">CSV, Excel, or Google Sheets</strong></span></li>
                      <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-gradient-to-r from-accent-secondary to-[#06B6D4] shadow-[0_0_8px_#22D3EE]" /> <span className="text-gray-200">Magically <strong className="text-white">clean, filter, and transform</strong> your messy datasets</span></li>
                      <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary shadow-[0_0_8px_#8B5CF6]" /> <span className="text-gray-200">Generate beautiful <strong className="text-white">interactive charts</strong> from plain English</span></li>
                    </ul>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="messages-list" className="w-full flex flex-col gap-6" exit={{ opacity: 0 }}>
                  {messages.map((msg, i) => (
                  <motion.div 
                    key={i} 
                    variants={theme.animations.genieSpring}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={theme.animations.genieSpring}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start w-full gap-3'}`}
                  >
                    {msg.role === 'ai' && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center flex-shrink-0 shadow-lg shadow-accent-primary/20 self-end mb-1">
                        <Wand2 className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {msg.role === 'system_component' ? (
                       msg.type === 'data_quality_report' ? (
                          <div className="w-full flex-1">
                            {DataQualityCard && <DataQualityCard report={msg.report} onAskFix={(prompt) => setInput(prompt)} />}
                          </div>
                       ) : null
                    ) : (
                      <div className={`flex flex-col gap-1 ${msg.role === 'user' ? 'max-w-[80%]' : 'min-w-0 max-w-[85%] w-fit'}`}>
                        <div className={cn(
                          "px-5 py-3.5 text-[14.5px] leading-relaxed whitespace-pre-wrap break-words shadow-sm",
                          msg.role === 'user' 
                            ? 'self-end text-white rounded-2xl rounded-br-sm' 
                            : 'bg-bg-card text-gray-200 border border-white/[0.05] rounded-2xl rounded-bl-sm w-full'
                        )}
                        style={msg.role === 'user' ? {
                          background: 'linear-gradient(135deg, #8B5CF6 0%, #22D3EE 100%)',
                          boxShadow: '0 4px 15px rgba(139, 92, 246, 0.2)'
                        } : {}}
                        >
                          {renderMessageContent(msg.content)}
                        </div>
                        {msg.role === 'ai' && <CopyMessageButton text={msg.content} />}
                      </div>
                    )}
                  </motion.div>
                ))}
                </motion.div>
              )}

              {loading && (
                <motion.div 
                  key="loading-dots"
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex gap-3 w-full mb-2"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center flex-shrink-0 shadow-lg shadow-accent-primary/20 self-end mb-1">
                    <Wand2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-bg-card border border-white/[0.05] rounded-2xl rounded-bl-sm px-4 py-4 shadow-sm flex items-center gap-1.5 h-[42px] self-end mb-1">
                    <motion.div 
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                      className="w-1.5 h-1.5 bg-accent-primary rounded-full" 
                    />
                    <motion.div 
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                      className="w-1.5 h-1.5 bg-accent-primary rounded-full" 
                    />
                    <motion.div 
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                      className="w-1.5 h-1.5 bg-accent-secondary rounded-full" 
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} className="h-4" />
          </div>
          
          {/* Scroll to Bottom Button */}
          <AnimatePresence>
            {showScrollButton && (
              <motion.button 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                onClick={scrollToBottom}
                className="fixed bottom-[100px] left-1/2 -translate-x-1/2 w-10 h-10 bg-bg-card border border-white/10 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center text-gray-400 hover:text-accent-secondary transition-colors z-20"
              >
                <ArrowDown className="w-5 h-5" />
              </motion.button>
            )}
          </AnimatePresence>
        </main>

        {/* Input Bar Area */}
        <div id="chatbox-input-area" className="p-3 md:p-4 bg-bg-panel/90 backdrop-blur-md border-t border-white/[0.05]">
          <div className="max-w-3xl mx-auto relative">
            <div className="relative flex items-end gap-2 bg-bg-main border border-white/10 shadow-inner rounded-[24px] px-2 py-2 focus-within:border-accent-primary focus-within:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all duration-300">
              
              {/* Dataset Pills removed from here to move to the sidebar */}

              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={(e) => handleFileSelect(e.target.files[0])} 
                accept=".csv,.xlsx,.xls" 
              />
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 flex items-center justify-center text-gray-400 bg-white/5 rounded-full transition-colors flex-shrink-0 mb-0.5 ml-1"
                title="Upload Dataset"
              >
                <Plus className="w-5 h-5" />
              </motion.button>
              
              <textarea 
                id="chatbot-textarea"
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  if (!e.target.value) {
                    e.target.style.height = '44px';
                  } else {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    if (!loading) {
                      handleSend();
                    }
                  }
                }}
                placeholder="Ask anything..."
                className="flex-1 min-w-0 bg-transparent border-none outline-none py-2.5 px-3 text-[14.5px] placeholder-gray-600 text-white resize-none custom-scrollbar-dark overflow-hidden"
                style={{ height: '44px', maxHeight: '120px' }}
                rows={1}
              />
              
              <div className="flex items-center gap-1.5 mr-1 flex-shrink-0 mb-0.5">
                <button 
                  aria-label="Toggle voice input"
                  onClick={toggleListening}
                  className={cn(
                    "w-9 h-9 flex items-center justify-center rounded-full transition-colors",
                    isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-gray-500 bg-white/5'
                  )}
                >
                  <Mic className="w-[18px] h-[18px]" />
                </button>
                <motion.button 
                  aria-label={loading ? "Stop generating" : "Send message"}
                  whileTap={{ scale: (!input.trim() && !file && !loading) ? 1 : 0.95 }}
                  onClick={loading ? handleStop : handleSend}
                  disabled={(!input.trim() && !file) && !loading}
                  className="w-9 h-9 flex items-center justify-center rounded-full shadow-lg disabled:opacity-50 disabled:grayscale transition-all relative overflow-hidden group"
                  style={{
                    background: loading ? 'rgba(239, 68, 68, 0.2)' : 'linear-gradient(135deg, #8B5CF6 0%, #22D3EE 100%)'
                  }}
                >
                  {loading ? (
                     <Square className="w-4 h-4 text-red-400 fill-current relative z-10" />
                  ) : (
                     <ArrowUp className="w-[18px] h-[18px] text-white relative z-10" />
                  )}
                </motion.button>
              </div>
            </div>
            <div className="text-center mt-2 text-[10px] text-gray-600 font-medium tracking-wide">
              DataGenie can make mistakes. Check important info.
            </div>
          </div>
        </div>

        {/* Modals remain structurally similar but styled darker */}
        <AnimatePresence>
          {showQuotaModal && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-bg-panel border border-white/10 w-full max-w-sm sm:max-w-md rounded-[24px] shadow-2xl p-8 flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-5 border-[2px] border-red-500/20">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2 tracking-tight">We're Taking a Breather</h2>
                <p className="text-gray-400 mb-8 text-sm leading-relaxed">
                  We've reached our API limits. Please try again in a few minutes!
                </p>
                <button 
                  onClick={() => setShowQuotaModal(false)}
                  className="w-full py-3.5 bg-white text-black hover:bg-gray-200 rounded-xl font-bold transition-all shadow-md"
                >
                  Okay, I understand
                </button>
              </motion.div>
            </motion.div>
          )}

          {appAlert && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="bg-bg-panel border border-white/10 rounded-[24px] w-full max-w-sm shadow-2xl p-6 text-center"
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border-[2px]",
                  appAlert.isConfirm ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                )}>
                  {appAlert.isConfirm ? <Trash2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{appAlert.title}</h3>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">{appAlert.message}</p>
                
                {appAlert.isConfirm ? (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setAppAlert(null)}
                      className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        if (appAlert.onConfirm) appAlert.onConfirm();
                        setAppAlert(null);
                      }}
                      className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-sm transition-colors"
                    >
                      {appAlert.confirmText || 'Confirm'}
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setAppAlert(null)}
                    className="w-full py-3 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-xl font-bold shadow-md transition-all"
                  >
                    OK
                  </button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
