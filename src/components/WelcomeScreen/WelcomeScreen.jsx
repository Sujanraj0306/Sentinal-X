import React from 'react';

export default function WelcomeScreen({ cases, onSelectCase, onCreateCase }) {
     return (
          <div className="flex flex-col items-center justify-center h-full w-full bg-white text-black p-8">
               <div className="max-w-2xl w-full text-center space-y-8">

                    <h1 className="text-4xl font-serif font-bold tracking-tight border-b-4 border-black pb-4 inline-block px-8">
                         LEGAL WAR ROOM
                    </h1>

                    <p className="text-gray-500 font-mono tracking-widest text-sm uppercase">
                         Autonomous Strategic Defense System
                    </p>

                    <div className="pt-12 pb-8">
                         <button
                              onClick={onCreateCase}
                              className="px-12 py-4 bg-black text-white font-bold uppercase tracking-widest text-lg hover:bg-gray-800 transition-colors border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-2 active:translate-y-2"
                         >
                              Create New Case
                         </button>
                    </div>

                    {cases && cases.length > 0 && (
                         <div className="mt-16 text-left border-t-2 border-black pt-8">
                              <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-gray-400">
                                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                   Recent Cases
                              </h2>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   {cases.slice(0, 4).map(c => (
                                        <button
                                             key={c.id}
                                             onClick={() => onSelectCase(c)}
                                             className="text-left p-4 border-2 border-gray-200 hover:border-black transition-colors group relative overflow-hidden bg-gray-50 hover:bg-white"
                                        >
                                             <div className="font-bold text-lg mb-1 group-hover:underline decoration-2 underline-offset-4 truncate">
                                                  {c.victim} vs {c.accused}
                                             </div>
                                             <div className="text-xs font-mono text-gray-500 truncate">
                                                  ID: {c.id.split('-')[0]}
                                             </div>
                                        </button>
                                   ))}
                              </div>
                         </div>
                    )}

               </div>
          </div>
     );
}
