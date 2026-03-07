import React, { useState, useEffect, useRef } from 'react';
import MarkdownRenderer from '../MarkdownRenderer';
import useWhisper from '../../hooks/useWhisper';
import { Wrench, FileText, Download, Loader2, Scale, MailWarning } from 'lucide-react';

export default function ChatPanel({ activeCase, onStrategyRequested }) {
     const [messages, setMessages] = useState([]);
     const [input, setInput] = useState('');
     const [isUploading, setIsUploading] = useState(false);
     const [isFetching, setIsFetching] = useState(false);
     const [playingMsgId, setPlayingMsgId] = useState(null);
     const messagesEndRef = useRef(null);

     const whisper = useWhisper();

     // Append whisper transcript to input
     useEffect(() => {
          if (whisper.transcript) {
               setInput(prev => prev ? `${prev} ${whisper.transcript}` : whisper.transcript);
               whisper.setTranscript(''); // Clear after consuming
          }
     }, [whisper.transcript, whisper]);

     // Cleanup speech on unmount
     useEffect(() => {
          return () => window.speechSynthesis.cancel();
     }, []);

     const handleSpeak = (msgId, text) => {
          if (playingMsgId === msgId) {
               window.speechSynthesis.cancel();
               setPlayingMsgId(null);
               return;
          }
          window.speechSynthesis.cancel();

          const utterance = new SpeechSynthesisUtterance(text);
          const voices = window.speechSynthesis.getVoices();
          // Try to select a high-quality local voice if available (macOS Siri/Samantha)
          const premiumVoice = voices.find(v => v.name.includes('Premium') || v.name.includes('Samantha') || v.name.includes('Siri'));
          if (premiumVoice) utterance.voice = premiumVoice;

          utterance.rate = 1.05;
          utterance.onend = () => setPlayingMsgId(null);
          utterance.onerror = () => setPlayingMsgId(null);

          setPlayingMsgId(msgId);
          window.speechSynthesis.speak(utterance);
     };

     // Load messages when case changes
     useEffect(() => {
          if (activeCase && !activeCase.isParsing && window.electronAPI && activeCase.id) {
               setIsFetching(true);
               window.electronAPI.getMessages(activeCase.id).then(msgs => {
                    setMessages(Array.isArray(msgs) ? msgs : []);
               }).catch(err => {
                    console.error("Failed to load messages:", err);
                    setMessages([]);
               }).finally(() => setIsFetching(false));
          } else {
               setMessages([]); // Clear while loading new case
               setIsFetching(false);
          }
     }, [activeCase]);

     // Auto-scroll to bottom
     useEffect(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
     }, [messages]);

     const [isToolsOpen, setIsToolsOpen] = useState(false);

     const handleSend = async (e) => {
          e.preventDefault();
          if (!input.trim() || !activeCase) return;

          const query = input;
          setInput('');

          // Optimistically add user message
          const userMsg = { case_id: activeCase.id, role: 'user', content: query, timestamp: new Date().toISOString() };
          setMessages(prev => [...prev, userMsg]);

          if (window.electronAPI) {
               await window.electronAPI.saveMessage(userMsg);

               // Request strategic analysis from backend Smart Router
               const response = await window.electronAPI.requestStrategicAnalysis({ query, caseId: activeCase.id, folderPath: activeCase.folder_path });

               if (response.status === 'master-only' || response.status === 'debate-completed') {
                    const aiMsg = { case_id: activeCase.id, role: 'master', content: response.verdict, file_path: response.file_path, timestamp: new Date().toISOString() };
                    setMessages(prev => [...prev, aiMsg]);
                    await window.electronAPI.saveMessage(aiMsg);

                    // If it was a debate, we signal the parent to show the debate stream UI if necessary
                    // (The DebateArena already listens to the channel independently, but we can notify state here)
                    if (response.status === 'debate-completed' && onStrategyRequested) {
                         onStrategyRequested(response.verdict);
                    }
               } else if (response.status === 'error') {
                    const errMsg = { case_id: activeCase.id, role: 'system', content: `[ERROR]: ${response.error}`, timestamp: new Date().toISOString() };
                    setMessages(prev => [...prev, errMsg]);
                    await window.electronAPI.saveMessage(errMsg);
               }
          }
     };

     const handleManualTool = async (toolName) => {
          if (!activeCase || !window.electronAPI) return;
          setIsToolsOpen(false);

          const loadingMsgId = `loading_${Date.now()}`;
          const loadingMsg = { id: loadingMsgId, role: 'system', isGenerating: true, step: 0, timestamp: new Date().toISOString() };
          setMessages(prev => [...prev, loadingMsg]);

          const steps = ["1. Analyzing Case Facts...", "2. Drafting Legal Arguments...", "3. Formatting PDF..."];
          let stepInterval = null;
          let currentStep = 0;

          stepInterval = setInterval(() => {
               currentStep++;
               if (currentStep < steps.length) {
                    setMessages(prev => prev.map(m => m.id === loadingMsgId ? { ...m, step: currentStep } : m));
               }
          }, 3500);

          try {
               // gather full RAG context roughly (for the petition)
               const chatHistoryText = messages.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join("\n");
               const context = `Victim: ${activeCase.victim}\nAccused: ${activeCase.accused}\nSections: ${activeCase.sections}\nSummary: ${activeCase.summary}\nChat History:\n${chatHistoryText}`;

               const response = await window.electronAPI.triggerManualTool({ tool: toolName, context });

               clearInterval(stepInterval);
               setMessages(prev => prev.filter(m => m.id !== loadingMsgId)); // Remove loading

               if (response.status === 'success') {
                    const docName = toolName === 'bail_application' ? 'Bail Application' : toolName === 'legal_notice' ? 'Legal Notice' : 'Petition';
                    const sysMsg = { case_id: activeCase.id, role: 'system', content: `${docName} Generated Successfully.`, markdown: response.markdown, file_path: response.file_path, timestamp: new Date().toISOString() };
                    setMessages(prev => [...prev, sysMsg]);
                    await window.electronAPI.saveMessage(sysMsg);
               } else {
                    const errMsg = { case_id: activeCase.id, role: 'system', content: `[ERROR]: ${response.error}`, timestamp: new Date().toISOString() };
                    setMessages(prev => [...prev, errMsg]);
                    await window.electronAPI.saveMessage(errMsg);
               }
          } catch (err) {
               clearInterval(stepInterval);
               setMessages(prev => prev.filter(m => m.id !== loadingMsgId));
               console.error(err);
          }
     };

     const handleDownload = async (filePath) => {
          if (!window.electronAPI || !filePath) return;
          try {
               const result = await window.electronAPI.saveDocument(filePath, `Petition_${activeCase.id}.pdf`);
               if (result.status === 'error') {
                    console.error("Failed to save:", result.error);
               }
          } catch (err) {
               console.error(err);
          }
     };

     const handleUploadEvidence = async () => {
          if (!activeCase || !window.electronAPI) return;
          setIsUploading(true);

          try {
               const res = await window.electronAPI.uploadEvidence(activeCase.id, activeCase.folder_path);
               if (res.status === 'success') {
                    const sysMsg = { case_id: activeCase.id, role: 'system', content: `[EVIDENCE INGESTED]: ${res.fileName} successfully vectorized into RAG.`, timestamp: new Date().toISOString() };
                    setMessages(prev => [...prev, sysMsg]);
                    await window.electronAPI.saveMessage(sysMsg);
               } else if (res.status === 'error') {
                    alert("Upload failed: " + res.error);
               }
          } catch (err) {
               console.error(err);
          } finally {
               setIsUploading(false);
          }
     };

     const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);

     const renderHeader = () => {
          if (activeCase.isParsing) {
               return (
                    <div className="sticky top-0 z-10 bg-white border-b-2 border-black p-6 shadow-sm flex items-center gap-4">
                         <div className="w-6 h-6 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
                         <div>
                              <h2 className="text-xl font-serif font-bold uppercase tracking-widest text-black">
                                   Initializing {activeCase.case_name}...
                              </h2>
                              <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mt-1">
                                   Master LLM is actively extracting case metadata from local datastore.
                              </p>
                         </div>
                    </div>
               );
          }

          return (
               <div className="sticky top-0 z-10 bg-white border-b-2 border-black p-4 md:p-6 shadow-sm transition-all duration-300">
                    <div className="flex justify-between items-center mb-2">
                         <div className="flex-1 flex items-center gap-4">
                              <h2 className="text-xl md:text-2xl font-serif font-bold uppercase tracking-widest border-l-4 border-black pl-4 leading-tight truncate">
                                   {activeCase.case_name}
                              </h2>
                              <span className="hidden md:inline-block bg-black text-white px-3 py-1 font-mono text-[10px] tracking-[0.2em] uppercase">
                                   ID: {activeCase.id?.split('-')[1]}
                              </span>
                         </div>

                         <button
                              onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
                              className="ml-4 p-2 bg-gray-100 hover:bg-gray-200 border-2 border-black text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap"
                         >
                              {isHeaderExpanded ? 'Hide Details' : 'Show Details'}
                              <svg className={`w-4 h-4 transition-transform ${isHeaderExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                         </button>
                    </div>

                    {isHeaderExpanded && (
                         <div className="mt-4 pt-4 border-t-2 border-black grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono animate-fade-in">
                              <div className="col-span-1 md:col-span-2 mb-2 flex gap-4">
                                   <span className="flex items-center gap-1 bg-gray-100 px-3 py-1">
                                        <span className="w-2 h-2 rounded-full bg-black block mt-px"></span>
                                        {typeof activeCase.domain === 'object' ? JSON.stringify(activeCase.domain) : (activeCase.domain || 'Unknown Domain')}
                                   </span>
                                   <span className="flex items-center gap-1 bg-gray-100 px-3 py-1">
                                        <span className="w-2 h-2 rounded-full border border-black block mt-px"></span>
                                        {typeof activeCase.status === 'object' ? JSON.stringify(activeCase.status) : (activeCase.status || 'Active')}
                                   </span>
                              </div>

                              <div>
                                   <span className="font-bold uppercase text-gray-400 tracking-widest block mb-1 text-[10px]">Parties:</span>
                                   <p className="text-black bg-gray-50 p-2 border-l-2 border-gray-200 truncate">
                                        <span className="font-bold mr-2">V:</span>{typeof activeCase.victim === 'object' ? JSON.stringify(activeCase.victim) : activeCase.victim} <br />
                                        <span className="font-bold mr-2">A:</span>{typeof activeCase.accused === 'object' ? JSON.stringify(activeCase.accused) : activeCase.accused}
                                   </p>
                              </div>
                              <div>
                                   <span className="font-bold uppercase text-gray-400 tracking-widest block mb-1 text-[10px]">Critical Dates:</span>
                                   <p className="text-black bg-gray-50 p-2 border-l-2 border-gray-200 truncate">{typeof activeCase.critical_dates === 'object' ? JSON.stringify(activeCase.critical_dates) : activeCase.critical_dates}</p>
                              </div>
                              <div className="col-span-1 md:col-span-2">
                                   <span className="font-bold uppercase text-gray-400 tracking-widest block mb-1 text-[10px]">Statutes / Sections:</span>
                                   <p className="border-l-2 border-gray-200 pl-3 mt-1 bg-gray-50 p-2 text-black line-clamp-2 hover:line-clamp-none transition-all">{typeof activeCase.sections === 'object' ? JSON.stringify(activeCase.sections) : activeCase.sections}</p>
                              </div>
                              <div className="col-span-1 md:col-span-2">
                                   <span className="font-bold uppercase text-gray-400 tracking-widest block mb-1 text-[10px]">Case Summary:</span>
                                   <p className="border-l-2 border-gray-200 pl-3 mt-1 bg-gray-50 p-2 text-black line-clamp-3 hover:line-clamp-none transition-all leading-relaxed">{typeof activeCase.summary === 'object' ? JSON.stringify(activeCase.summary) : activeCase.summary}</p>
                              </div>
                         </div>
                    )}
               </div>
          );
     };

     if (!activeCase) return null;

     return (
          <div className="flex flex-col h-full w-full bg-white relative">

               {/* Pinned Case Header */}
               {renderHeader()}

               {/* Chat History */}
               <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gray-50">
                    {isFetching ? (
                         <div className="h-full flex flex-col items-center justify-center text-gray-400 font-mono text-sm uppercase tracking-widest gap-4">
                              <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
                              Loading Case History...
                         </div>
                    ) : messages.length === 0 ? (
                         <div className="h-full flex items-center justify-center text-gray-400 font-mono text-sm uppercase tracking-widest">
                              -- System Ready: Awaiting Query --
                         </div>
                    ) : (
                         messages.map((msg, idx) => (
                              <div key={msg.id || idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                   <div className={`max-w-[80%] p-4 border-2 ${msg.role === 'user'
                                        ? 'bg-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]'
                                        : msg.role === 'system'
                                             ? 'bg-gray-200 border-gray-400 font-mono text-xs uppercase'
                                             : 'bg-black text-white border-black font-serif'
                                        }`}>
                                        {msg.role !== 'system' && (
                                             <div className={`text-xs font-bold uppercase tracking-widest mb-2 flex justify-between items-center ${msg.role === 'user' ? 'text-gray-400' : 'text-gray-300'}`}>
                                                  <span>{msg.role === 'user' ? 'Lead Counsel' : 'Master LLM'}</span>
                                                  <button
                                                       type="button"
                                                       onClick={() => handleSpeak(msg.id || idx, msg.content)}
                                                       className={`hover:text-black transition-colors ${playingMsgId === (msg.id || idx) ? 'text-black inline-flex items-center gap-1' : ''}`}
                                                       title="Read Aloud"
                                                  >
                                                       {playingMsgId === (msg.id || idx) ? (
                                                            <>
                                                                 <span className="w-1.5 h-1.5 bg-black rounded-full animate-ping pr-1"></span>
                                                                 Stop
                                                            </>
                                                       ) : (
                                                            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5 10v4a2 2 0 002 2h2.586l3.707 3.707a1 1 0 001.707-.707V5.707a1 1 0 00-1.707-.707L9.586 10H7a2 2 0 00-2 2z"></path></svg>
                                                       )}
                                                  </button>
                                             </div>
                                        )}
                                        <div className="whitespace-pre-wrap leading-relaxed markdown-body">
                                             {msg.isGenerating ? (
                                                  <div className="flex flex-col gap-3 p-4 bg-gray-50 border-2 border-black border-dashed font-sans">
                                                       <div className="flex items-center gap-3 font-mono text-sm uppercase tracking-widest font-bold text-black">
                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                            Processing Petition...
                                                       </div>
                                                       <div className="flex flex-col gap-1 text-xs font-mono pl-8 pt-2">
                                                            {["1. Analyzing Case Facts...", "2. Drafting Legal Arguments...", "3. Formatting PDF..."].map((stepLabel, i) => (
                                                                 <span key={i} className={`${msg.step >= i ? 'text-black font-bold' : 'text-gray-400 opacity-50'} transition-all flex items-center gap-2`}>
                                                                      {msg.step === i && <span className="w-1.5 h-1.5 bg-black rounded-full animate-ping"></span>}
                                                                      {msg.step > i && <span className="w-1.5 h-1.5 bg-black rounded-full"></span>}
                                                                      {msg.step < i && <span className="w-1.5 h-1.5 border border-gray-400 rounded-full"></span>}
                                                                      {stepLabel}
                                                                 </span>
                                                            ))}
                                                       </div>
                                                  </div>
                                             ) : (
                                                  <MarkdownRenderer>{msg.content}</MarkdownRenderer>
                                             )}
                                             {msg.markdown && (
                                                  <div className="mt-4 border-2 border-black/10 bg-gray-50/50 text-black max-h-96 overflow-y-auto custom-scrollbar p-6 font-serif shadow-inner">
                                                       <MarkdownRenderer>{msg.markdown}</MarkdownRenderer>
                                                  </div>
                                             )}
                                             {msg.file_path && (
                                                  <div className="mt-6 pt-4 border-t-2 border-black/20 text-center">
                                                       <button
                                                            onClick={() => handleDownload(msg.file_path)}
                                                            className="inline-flex items-center gap-3 px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors shadow-[2px_2px_0px_0px_rgba(100,100,100,0.5)] active:shadow-none active:translate-y-0.5 active:translate-x-0.5"
                                                       >
                                                            <Download className="w-4 h-4" />
                                                            Download Petition (PDF)
                                                       </button>
                                                  </div>
                                             )}
                                        </div>
                                   </div>
                              </div>
                         ))
                    )}
                    <div ref={messagesEndRef} />
               </div>

               {/* Input Area */}
               <div className="p-4 bg-white border-t-2 border-black flex flex-col gap-2 relative">
                    <form onSubmit={handleSend} className="relative flex items-center">
                         <div className="absolute left-3 z-20 flex flex-row gap-2">
                              <button
                                   type="button"
                                   onClick={handleUploadEvidence}
                                   disabled={isUploading || activeCase.isParsing}
                                   className="p-2 bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 transition-colors text-xs font-bold uppercase tracking-widest disabled:opacity-50 flex items-center gap-2"
                                   title="Upload Evidence"
                              >
                                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                                   <span className="hidden md:inline">{isUploading ? 'Ingesting...' : 'Evidence'}</span>
                              </button>

                              <div className="relative flex items-stretch">
                                   <button
                                        type="button"
                                        onClick={() => setIsToolsOpen(!isToolsOpen)}
                                        disabled={activeCase.isParsing}
                                        className="p-2 bg-gray-100 hover:bg-gray-200 transition-colors text-xs font-bold uppercase tracking-widest disabled:opacity-50 flex items-center gap-2 border-l-2 border-r-2 border-gray-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:shadow-none translate-x-[2px] active:translate-y-[2px]"
                                        title="Tools"
                                   >
                                        <Wrench className="w-4 h-4" />
                                        <span className="hidden xl:inline">Tools</span>
                                   </button>
                                   {isToolsOpen && (
                                        <div className="absolute bottom-full left-0 mb-3 w-56 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] z-30 flex flex-col overflow-hidden animate-fade-in">
                                             <button
                                                  type="button"
                                                  onClick={() => handleManualTool('petition')}
                                                  className="flex items-center gap-3 px-4 py-4 text-left text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors border-b border-gray-100"
                                             >
                                                  <FileText className="w-4 h-4" />
                                                  Generate Petition
                                             </button>
                                             <button
                                                  type="button"
                                                  onClick={() => handleManualTool('bail_application')}
                                                  className="flex items-center gap-3 px-4 py-4 text-left text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors border-b border-gray-100"
                                             >
                                                  <Scale className="w-4 h-4" />
                                                  Bail Application Generator
                                             </button>
                                             <button
                                                  type="button"
                                                  onClick={() => handleManualTool('legal_notice')}
                                                  className="flex items-center gap-3 px-4 py-4 text-left text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors border-b border-gray-100"
                                             >
                                                  <MailWarning className="w-4 h-4" />
                                                  Legal Notice Generator
                                             </button>
                                        </div>
                                   )}
                              </div>
                         </div>

                         <button
                              type="button"
                              onClick={whisper.isRecording ? whisper.stopRecording : whisper.startRecording}
                              disabled={activeCase.isParsing || whisper.isLoading || whisper.isTranscribing}
                              className={`absolute right-28 p-2 rounded-full transition-colors z-10 flex items-center justify-center ${whisper.isRecording
                                   ? 'bg-red-100 text-red-600 hover:bg-red-200 animate-pulse'
                                   : whisper.isTranscribing
                                        ? 'bg-gray-100 text-gray-400'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                   }`}
                              title="Dictate with local AI"
                         >
                              {whisper.isTranscribing ? (
                                   <div className="w-5 h-5 border-2 border-gray-400 border-t-black rounded-full animate-spin"></div>
                              ) : whisper.isRecording ? (
                                   <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
                              ) : (
                                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                              )}
                         </button>

                         <input
                              className="w-full pl-32 md:pl-56 pr-40 py-5 bg-white border-2 border-black focus:outline-none focus:ring-4 focus:ring-black/20 font-mono text-sm transition-shadow shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] placeholder-gray-400 disabled:opacity-50 disabled:bg-gray-50"
                              placeholder={
                                   whisper.isLoading ? "Loading local Whisper AI..."
                                        : whisper.isRecording ? "Listening..."
                                             : whisper.isTranscribing ? "Transcribing local audio..."
                                                  : activeCase.isParsing ? "Awaiting Extraction Phase..."
                                                       : "Interrogate Master LLM or Request Strategy..."
                              }
                              value={input}
                              disabled={activeCase.isParsing || whisper.isLoading || whisper.isRecording || whisper.isTranscribing}
                              onChange={(e) => setInput(e.target.value)}
                         />

                         <button
                              type="submit"
                              disabled={!input.trim() || activeCase.isParsing}
                              className="absolute right-3 px-6 py-2 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-gray-800 transition-colors border-2 border-black disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                              Send
                         </button>
                    </form>
               </div>

          </div>
     );
}
