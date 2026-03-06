import React, { useState } from 'react';
import { createPortal } from 'react-dom';

export default function Sidebar({ cases, activeCase, onSelectCase, onCreateCase, onDeleteCase }) {
     const [caseToDelete, setCaseToDelete] = useState(null);

     const confirmDelete = async () => {
          if (!caseToDelete) return;
          try {
               await onDeleteCase(caseToDelete);
          } finally {
               setCaseToDelete(null);
          }
     };

     return (
          <div className="flex flex-col h-full w-full bg-gray-50 border-r-2 border-border font-sans">

               {/* Top Action */}
               <div className="p-4 border-b-2 border-border bg-white sticky top-0 z-10">
                    <button
                         onClick={onCreateCase}
                         className="w-full py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-gray-800 transition-colors border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] active:shadow-none active:translate-x-1 active:translate-y-1 flex items-center justify-center gap-2"
                    >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                         New Case
                    </button>
               </div>

               {/* History List */}
               <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-2">History</h3>

                    {cases.length === 0 ? (
                         <p className="text-sm text-gray-500 italic px-2">No past cases found.</p>
                    ) : (
                         cases.map(c => (
                              <div
                                   key={c.id}
                                   onClick={() => onSelectCase(c)}
                                   className={`relative group w-full text-left p-3 border-2 transition-all cursor-pointer ${activeCase?.id === c.id
                                        ? 'border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]'
                                        : 'border-transparent hover:border-gray-300 hover:bg-gray-100'
                                        }`}
                              >
                                   <div className="font-bold text-sm truncate text-black pr-6">
                                        {typeof c.victim === 'object' ? JSON.stringify(c.victim) : (c.victim || 'Unknown')} vs {typeof c.accused === 'object' ? JSON.stringify(c.accused) : (c.accused || 'Unknown')}
                                   </div>
                                   <div className="text-xs text-gray-500 truncate mt-1 font-mono">
                                        {new Date(c.timestamp).toLocaleDateString()}
                                   </div>
                                   <button
                                        onClick={(e) => { e.stopPropagation(); setCaseToDelete(c); }}
                                        className="absolute top-3 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity p-1 bg-white border-2 border-transparent hover:border-red-600"
                                        title="Delete Case"
                                   >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                   </button>
                              </div>
                         ))
                    )}
               </div>

               {/* Delete Confirmation Modal - uses inline styles because portal escapes Tailwind v4 @layer scope */}
               {caseToDelete && createPortal(
                    <div style={{
                         position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                         zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                         backgroundColor: 'rgba(0,0,0,0.6)',
                         fontFamily: "'Inter', system-ui, sans-serif"
                    }}>
                         <div style={{
                              backgroundColor: '#fff', padding: '24px', border: '4px solid #000',
                              boxShadow: '8px 8px 0px 0px rgba(0,0,0,1)',
                              width: '100%', maxWidth: '400px', margin: '0 16px'
                         }}>
                              <h2 style={{
                                   fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase',
                                   letterSpacing: '0.1em', color: '#dc2626',
                                   borderLeft: '4px solid #dc2626', paddingLeft: '12px',
                                   marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'
                              }}>
                                   <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                   Are you sure?
                              </h2>
                              <p style={{
                                   color: '#000', marginBottom: '24px', fontSize: '14px',
                                   fontWeight: 'bold', lineHeight: '1.6'
                              }}>
                                   Are you sure? This will remove <span style={{ textDecoration: 'underline' }}>{caseToDelete.case_name || `${caseToDelete.victim} vs ${caseToDelete.accused}`}</span> and its chat history from the War Room. Your local evidence and case folders will <span style={{ color: '#16a34a' }}>NOT</span> be deleted from your computer.
                              </p>
                              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                   <button
                                        onClick={() => setCaseToDelete(null)}
                                        style={{
                                             padding: '8px 16px', border: '2px solid #000', backgroundColor: '#fff',
                                             color: '#000', fontWeight: 'bold', textTransform: 'uppercase',
                                             letterSpacing: '0.1em', fontSize: '12px', cursor: 'pointer'
                                        }}
                                   >
                                        Cancel
                                   </button>
                                   <button
                                        onClick={confirmDelete}
                                        style={{
                                             padding: '8px 16px', border: '2px solid #991b1b', backgroundColor: '#dc2626',
                                             color: '#fff', fontWeight: 'bold', textTransform: 'uppercase',
                                             letterSpacing: '0.1em', fontSize: '12px', cursor: 'pointer',
                                             boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.2)'
                                        }}
                                   >
                                        Confirm Delete
                                   </button>
                              </div>
                         </div>
                    </div>,
                    document.body
               )}

               {/* Bottom Settings / Info */}
               <div className="p-4 border-t-2 border-border bg-white text-xs font-mono text-gray-400 text-center uppercase tracking-widest">
                    Secure Enclave Active
               </div>
          </div>
     );
}
