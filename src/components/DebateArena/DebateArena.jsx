import React, { useState, useEffect, useCallback, useMemo } from 'react';
import throttle from 'lodash.throttle';
import { ReactFlow, Background, Controls, MarkerType, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import MarkdownRenderer from '../MarkdownRenderer';

// ─── Static Graph Definition (Always visible) ─────────────────────────────
const GEMINI_AGENTS = [
     { id: 'Gemini Prosecution', label: 'Gemini Prosecution', model: 'gemini-2.5-flash', hasSearch: true },
     { id: 'Gemini Defense Strategist', label: 'Gemini Defense', model: 'gemini-2.5-flash', hasSearch: true },
     { id: 'Gemini Procedural Hawk', label: 'Gemini Procedural', model: 'gemini-2.5-flash', hasSearch: true }
];

const LOCAL_AGENTS = [
     { id: "Gemma2 Devil's Advocate", label: "Devil's Advocate", model: 'gemma2:9b', hasSearch: false },
     { id: 'Gemma Precedent Scholar', label: 'Precedent Scholar', model: 'gemma3:12b', hasSearch: false },
     { id: 'Mistral Negotiation Lead', label: 'Negotiation Lead', model: 'mistral:7b', hasSearch: false }
];

const buildStaticGraph = () => {
     const nodes = [
          {
               id: 'Ollama RAG', position: { x: 50, y: 175 },
               data: { label: 'Ollama RAG', sublabel: 'llama3:latest', statusLabel: 'IDLE', hasSearch: false, team: 'rag' },
               style: { backgroundColor: '#f8fafc', border: '2px solid #1e293b', fontWeight: 'bold', width: 160, padding: 14, borderRadius: 4 }
          },
          {
               id: 'Master Judge', position: { x: 800, y: 175 },
               data: { label: 'Master Judge', sublabel: 'gemini-2.5-pro', statusLabel: 'IDLE', hasSearch: true, team: 'judge' },
               style: { backgroundColor: '#0f172a', color: '#f8fafc', border: '3px solid #0f172a', width: 180, padding: 16, textAlign: 'center', fontWeight: 'bold', borderRadius: 4 }
          }
     ];

     const edges = [];

     GEMINI_AGENTS.forEach((agent, i) => {
          nodes.push({
               id: agent.id,
               position: { x: 280, y: 30 + i * 140 },
               data: { label: agent.label, sublabel: agent.model, statusLabel: 'IDLE', hasSearch: agent.hasSearch, team: 'gemini' },
               style: { border: '2px solid #1e293b', width: 170, padding: 12, borderRadius: 4 }
          });
          edges.push(
               { id: `e-rag-${agent.id}`, source: 'Ollama RAG', target: agent.id, animated: false, style: { stroke: '#94a3b8' } },
               { id: `e-${agent.id}-master`, source: agent.id, target: 'Master Judge', animated: false, style: { stroke: '#94a3b8' } }
          );
     });

     LOCAL_AGENTS.forEach((agent, i) => {
          nodes.push({
               id: agent.id,
               position: { x: 550, y: 30 + i * 140 },
               data: { label: agent.label, sublabel: agent.model, statusLabel: 'IDLE', hasSearch: agent.hasSearch, team: 'local' },
               style: { border: '2px dotted #475569', width: 170, padding: 12, borderRadius: 4 }
          });
          edges.push(
               { id: `e-rag-${agent.id}`, source: 'Ollama RAG', target: agent.id, animated: false, style: { stroke: '#94a3b8' } },
               { id: `e-${agent.id}-master`, source: agent.id, target: 'Master Judge', animated: false, style: { stroke: '#94a3b8' } }
          );
     });

     // Cross-edges: Local agents critique Gemini agents
     GEMINI_AGENTS.forEach((g, i) => {
          if (LOCAL_AGENTS[i]) {
               edges.push({
                    id: `e-cross-${LOCAL_AGENTS[i].id}-${g.id}`,
                    source: LOCAL_AGENTS[i].id, target: g.id,
                    animated: false,
                    style: { stroke: '#e2e8f0', strokeDasharray: '5 5' },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
               });
          }
     });

     return { nodes, edges };
};

const STATIC_GRAPH = buildStaticGraph();

// ─── Status Colors ─────────────────────────────────────────────────────────
function getStatusStyle(statusLabel) {
     if (!statusLabel || statusLabel === 'IDLE') return {};
     if (statusLabel.startsWith('Completed')) return { backgroundColor: '#dcfce7', borderColor: '#166534', boxShadow: '0 0 8px rgba(22,101,52,0.3)' };
     if (statusLabel.includes('Phase') || statusLabel.includes('Loading') || statusLabel.includes('Critiquing') || statusLabel.includes('Synthesizing')) {
          return { borderColor: '#2563eb', boxShadow: '0 0 12px rgba(37,99,235,0.4)' };
     }
     return {};
}

export default function DebateArena({ activeCase }) {
     const [nodes, setNodes] = useState(STATIC_GRAPH.nodes);
     const [edges, setEdges] = useState(STATIC_GRAPH.edges);
     const [stage, setStage] = useState('Standby');
     const [stream, setStream] = useState([]);
     const [selectedNodeData, setSelectedNodeData] = useState(null);
     const [playingNodeId, setPlayingNodeId] = useState(null);

     useEffect(() => {
          return () => window.speechSynthesis.cancel();
     }, []);

     const handleSpeak = (nodeId, text) => {
          if (playingNodeId === nodeId) {
               window.speechSynthesis.cancel();
               setPlayingNodeId(null);
               return;
          }
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          const voices = window.speechSynthesis.getVoices();
          const premiumVoice = voices.find(v => v.name.includes('Premium') || v.name.includes('Samantha') || v.name.includes('Siri') || v.name.includes('Google'));
          if (premiumVoice) utterance.voice = premiumVoice;

          utterance.rate = 1.05;
          utterance.onend = () => setPlayingNodeId(null);
          utterance.onerror = () => setPlayingNodeId(null);

          setPlayingNodeId(nodeId);
          window.speechSynthesis.speak(utterance);
     };

     const onNodesChange = useCallback(
          (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
          []
     );
     const onEdgesChange = useCallback(
          (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
          []
     );

     // Reset to static graph on case switch
     useEffect(() => {
          setStage('Standby');
          setNodes(STATIC_GRAPH.nodes);
          setEdges(STATIC_GRAPH.edges);
          setSelectedNodeData(null);
          setStream([]);
     }, [activeCase?.id]);

     useEffect(() => {
          if (!window.electronAPI) return;

          const resetGraph = (e, { agents }) => {
               // Re-map received agent names into the static graph, updating status to LIVE
               setNodes(nds => nds.map(n => {
                    if (agents.includes(n.id)) {
                         return { ...n, data: { ...n.data, statusLabel: 'READY' } };
                    }
                    return n;
               }));
          };

          const handleStage = (e, newStage) => {
               setStage(newStage);
               if (!newStage) return;

               if (newStage.includes('Phase 1')) {
                    setEdges(eds => eds.map(edge =>
                         edge.source === 'Ollama RAG' ? { ...edge, animated: true, style: { ...edge.style, stroke: '#2563eb' } } : edge
                    ));
               }
               if (newStage.includes('Phase 3') || newStage.includes('Final')) {
                    setEdges(eds => eds.map(edge => ({
                         ...edge,
                         animated: edge.target === 'Master Judge',
                         style: { ...edge.style, stroke: edge.target === 'Master Judge' ? '#f59e0b' : '#94a3b8' }
                    })));
               }
          };

          const handleNodeStatus = (e, { agent, status }) => {
               setNodes(nds => nds.map(n => {
                    if (n.id === agent) {
                         return { ...n, data: { ...n.data, statusLabel: status } };
                    }
                    return n;
               }));
          };

          const handleNodeResult = (e, { agent, content, phase }) => {
               setNodes(nds => nds.map(n => {
                    if (n.id === agent) {
                         return { ...n, data: { ...n.data, statusLabel: `Completed: ${phase}`, fullContent: content } };
                    }
                    return n;
               }));
          };

          const handleEdgeAnimate = (e, { source, target }) => {
               const edgeId = `e-dyn-${source}-${target}`;
               setEdges(eds => {
                    const temp = eds.filter(ed => !ed.id.startsWith('e-dyn-'));
                    return [
                         ...temp,
                         {
                              id: edgeId, source, target, animated: true,
                              style: { stroke: '#ef4444', strokeWidth: 2 },
                              markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' }
                         }
                    ];
               });
          };

          window.electronAPI.onDebateGraphInit(resetGraph);
          window.electronAPI.onDebateStage(handleStage);
          window.electronAPI.onDebateNodeStatus(handleNodeStatus);
          window.electronAPI.onDebateNodeResult(handleNodeResult);
          window.electronAPI.onDebateEdgeAnimate(handleEdgeAnimate);

          // Stream Throttling Buffer
          const streamBuffer = { current: [] };
          const flushStream = throttle(() => {
               if (streamBuffer.current.length > 0) {
                    setStream(prev => [...prev, ...streamBuffer.current]);
                    streamBuffer.current = [];
               }
          }, 200);

          const streamListener = (e, chunk) => {
               streamBuffer.current.push(chunk);
               flushStream();
          };
          window.electronAPI.onDebateStream(streamListener);
     }, []);

     const handleNodeClick = (event, node) => {
          setSelectedNodeData({
               id: node.id,
               label: node.data.label,
               sublabel: node.data.sublabel,
               content: node.data.fullContent || 'No data generated yet.'
          });
     };

     // Enhanced Node Rendering with status indicators and web badges
     const reactFlowNodes = useMemo(() => nodes.map(n => {
          const isCompleted = n.data.statusLabel?.startsWith('Completed');
          const isActive = n.data.statusLabel && !['IDLE', 'READY'].includes(n.data.statusLabel) && !isCompleted;
          const statusStyle = getStatusStyle(n.data.statusLabel);

          return {
               ...n,
               style: {
                    ...n.style,
                    ...statusStyle,
                    backgroundColor: isCompleted ? '#dcfce7'
                         : isActive ? '#eff6ff'
                              : n.data.team === 'judge' ? '#0f172a'
                                   : '#ffffff',
                    transition: 'all 0.3s ease'
               },
               data: {
                    ...n.data,
                    label: (
                         <div className="flex flex-col items-center gap-1">
                              <div className="whitespace-pre-wrap text-center text-xs font-bold">{n.data.label}</div>
                              <div className="text-[9px] font-mono opacity-60">{n.data.sublabel}</div>
                              {n.data.hasSearch && (
                                   <div className="text-[8px] font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-sm flex items-center gap-1 mt-0.5">
                                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                        Web Search
                                   </div>
                              )}
                              {n.data.statusLabel && n.data.statusLabel !== 'IDLE' && (
                                   <div className={`text-[9px] font-mono px-2 py-0.5 uppercase tracking-widest w-full text-center mt-1 ${isCompleted ? 'bg-green-100 text-green-800'
                                        : isActive ? 'bg-blue-100 text-blue-700 animate-pulse'
                                             : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {n.data.statusLabel}
                                   </div>
                              )}
                         </div>
                    )
               }
          };
     }), [nodes]);

     return (
          <div className="flex flex-col h-full bg-white border-l-2 border-black font-sans shadow-[-10px_0_30px_rgba(0,0,0,0.05)] relative">
               <div className="p-4 border-b-2 border-black bg-black text-white flex justify-between items-center z-10 shrink-0">
                    <h2 className="text-sm font-bold uppercase tracking-widest">Multi-Model Graph</h2>
                    <span className="flex items-center gap-2 text-xs font-mono">
                         <span className={`w-2 h-2 rounded-full ${stage !== 'Standby' ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></span>
                         {stage}
                    </span>
               </div>

               {/* TOP HALF: The Graph */}
               <div className="flex-1 w-full relative min-h-0 bg-gray-50">
                    <ReactFlow
                         nodes={reactFlowNodes}
                         edges={edges}
                         onNodesChange={onNodesChange}
                         onEdgesChange={onEdgesChange}
                         onNodeClick={handleNodeClick}
                         fitView
                         className="bg-gray-50"
                    >
                         <Background color="#e2e8f0" gap={20} size={1} />
                         <Controls />
                    </ReactFlow>
               </div>

               {/* BOTTOM HALF: Live Agent Logs */}
               <div className="flex-1 w-full border-t-4 border-black border-double flex flex-col bg-white overflow-hidden min-h-0">
                    <div className="p-3 border-b-2 border-black bg-gray-100 flex justify-between items-center shrink-0">
                         <h3 className="text-xs font-bold uppercase tracking-widest">Live Execution Stream</h3>
                         {stream.length > 0 && (
                              <button
                                   onClick={() => window.electronAPI?.exportExecutionLog(stream)}
                                   className="text-[10px] font-mono uppercase tracking-widest px-3 py-1 border-2 border-black bg-white hover:bg-black hover:text-white transition-all duration-150 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                              >
                                   Export Log (.txt)
                              </button>
                         )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                         {stream.length === 0 ? (
                              <div className="h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                                   <p className="text-xs font-mono uppercase tracking-widest">Awaiting Analysis...</p>
                              </div>
                         ) : (
                              stream.map((msg, idx) => {
                                   const safeContent = msg?.content || '';
                                   const isExecutingTool = safeContent.includes('Executing MCP Tool') || safeContent.includes('[Loading]');

                                   return (
                                        <div key={idx} className={`p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${getAgentStyle(msg?.agent)} slide-in-bottom`}>
                                             <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                                                  <div className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                                       <span className="w-2 h-2 bg-black block mt-px"></span>
                                                       {msg?.agent || 'SYSTEM'}
                                                  </div>
                                                  <div className="text-[10px] font-mono opacity-50">{new Date().toLocaleTimeString()}</div>
                                             </div>
                                             <div className="text-sm font-sans leading-relaxed whitespace-pre-wrap">
                                                  {!msg?.content ? (
                                                       <div className="bg-gray-200 text-gray-600 p-3 font-mono text-xs italic flex items-center gap-3">
                                                            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                                            Data stream interrupted or unavailable.
                                                       </div>
                                                  ) : isExecutingTool ? (
                                                       <div className="bg-black text-white p-3 font-mono text-xs shadow-inner flex items-center gap-3">
                                                            <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                                                            {safeContent}
                                                       </div>
                                                  ) : (
                                                       <MarkdownRenderer>{safeContent}</MarkdownRenderer>
                                                  )}
                                             </div>
                                        </div>
                                   );
                              })
                         )}
                    </div>
               </div>

               {/* Right Side Drawer for Node Data */}
               <div className={`absolute top-0 right-0 h-full w-80 bg-white border-l-2 border-black shadow-2xl transition-transform duration-300 transform ${selectedNodeData ? 'translate-x-0' : 'translate-x-full'} z-20 flex flex-col`}>
                    <div className="p-4 bg-gray-100 border-b-2 border-black flex justify-between items-center">
                         <div>
                              <h3 className="font-bold text-sm uppercase tracking-widest whitespace-pre-wrap">
                                   {selectedNodeData?.label}
                              </h3>
                              {selectedNodeData?.sublabel && (
                                   <p className="text-[10px] font-mono text-gray-500 mt-1">{selectedNodeData.sublabel}</p>
                              )}
                         </div>
                         <div className="flex items-center gap-2">
                              {selectedNodeData?.content && (
                                   <button
                                        onClick={() => handleSpeak(selectedNodeData.label, selectedNodeData.content)}
                                        className={`hover:text-black hover:bg-black hover:text-white border-2 border-transparent transition-colors p-1 text-xs font-bold uppercase tracking-widest flex items-center gap-1 ${playingNodeId === selectedNodeData.label ? 'bg-black text-white' : 'text-gray-500'}`}
                                        title="Read Aloud"
                                   >
                                        {playingNodeId === selectedNodeData.label ? (
                                             <>
                                                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                                                  Stop
                                             </>
                                        ) : (
                                             <>
                                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5 10v4a2 2 0 002 2h2.586l3.707 3.707a1 1 0 001.707-.707V5.707a1 1 0 00-1.707-.707L9.586 10H7a2 2 0 00-2 2z"></path></svg>
                                                  Read
                                             </>
                                        )}
                                   </button>
                              )}
                              <button
                                   onClick={() => setSelectedNodeData(null)}
                                   className="text-gray-500 hover:text-black hover:bg-black hover:text-white p-1 transition-colors border-l-2 border-gray-300 ml-2 pl-2"
                              >
                                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                              </button>
                         </div>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 font-serif text-sm leading-relaxed">
                         <MarkdownRenderer>{selectedNodeData?.content || ''}</MarkdownRenderer>
                    </div>
               </div>
          </div>
     );
}

function getAgentStyle(agentName) {
     if (!agentName) return 'bg-white border-black';
     if (agentName.startsWith('Gemini') || agentName === 'Master Judge') return 'bg-white border-black font-serif border-dashed';
     if (agentName.startsWith('Gemma2')) return 'bg-indigo-50 border-black font-bold';
     if (agentName.startsWith('Gemma')) return 'bg-amber-50 border-black font-bold';
     if (agentName.startsWith('Mistral')) return 'bg-emerald-50 border-black font-bold';
     return 'bg-white border-black';
}
