import React, { useState } from 'react';
import { createPortal } from 'react-dom';

export default function CreateCaseModal({ folderPath, onConfirm, onCancel }) {
     const [caseName, setCaseName] = useState('');

     // Extract default name from folder path (e.g., /Users/name/Documents/MyCase -> MyCase)
     const defaultName = folderPath ? folderPath.split(/[/\\]/).pop() : 'Unknown Case';

     const handleSubmit = (e) => {
          e.preventDefault();
          onConfirm(caseName.trim() || defaultName);
     };

     return createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
               <div className="bg-white border-4 border-black w-[95vw] md:w-[500px] shrink-0 p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">

                    <h2 className="text-2xl font-serif font-bold tracking-tight uppercase border-b-2 border-black pb-4 mb-6">
                         Initialize Case Data
                    </h2>

                    <div className="mb-6">
                         <p className="text-sm font-mono text-gray-500 mb-2 uppercase tracking-widest">Selected Enclave:</p>
                         <div className="bg-gray-100 border-2 border-gray-300 p-3 text-xs font-mono truncate">
                              {folderPath}
                         </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                         <div className="mb-8">
                              <label className="block text-sm font-bold uppercase tracking-widest text-black mb-2">
                                   Assigned Case Name
                              </label>
                              <input
                                   type="text"
                                   autoFocus
                                   className="w-full p-4 border-2 border-black focus:outline-none focus:ring-4 focus:ring-black/20 font-sans text-lg transition-shadow"
                                   placeholder={`e.g. ${defaultName}`}
                                   value={caseName}
                                   onChange={(e) => setCaseName(e.target.value)}
                              />
                         </div>

                         <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 border-t-2 border-gray-200 pt-6 mt-4">
                              <button
                                   type="button"
                                   onClick={onCancel}
                                   className="px-6 py-3 font-bold uppercase tracking-widest text-sm text-gray-500 hover:text-black hover:bg-gray-100 transition-colors"
                              >
                                   Abort
                              </button>
                              <button
                                   type="submit"
                                   className="px-8 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-gray-800 transition-colors border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-1 active:translate-y-1"
                              >
                                   Confirm & Extract
                              </button>
                         </div>
                    </form>

               </div>
          </div>,
          document.body
     );
}
