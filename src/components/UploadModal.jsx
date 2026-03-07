import React, { useState, useRef } from 'react';

export default function UploadModal({ onClose }) {
     const [files, setFiles] = useState([]);
     const [isDragging, setIsDragging] = useState(false);
     const fileInputRef = useRef(null);

     const handleDragOver = (e) => {
          e.preventDefault();
          setIsDragging(true);
     };

     const handleDragLeave = (e) => {
          e.preventDefault();
          setIsDragging(false);
     };

     const handleDrop = (e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
               const newFiles = Array.from(e.dataTransfer.files);
               setFiles(prev => [...prev, ...newFiles]);
               e.dataTransfer.clearData();
          }
     };

     const handleFileInput = (e) => {
          if (e.target.files && e.target.files.length > 0) {
               const newFiles = Array.from(e.target.files);
               setFiles(prev => [...prev, ...newFiles]);
          }
     };

     const removeFile = (indexToRemove) => {
          setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
     };

     const handleProcessFiles = () => {
          // Placeholder for future processing logic
          console.log("Processing files:", files);
     };

     return (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center font-sans">
               <div className="bg-white p-8 border-4 border-black w-full max-w-2xl mx-4 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center relative animate-fade-in max-h-[90vh] overflow-y-auto">
                    <button
                         onClick={onClose}
                         className="absolute top-4 right-4 text-black hover:text-red-600 transition-colors p-2"
                         title="Close"
                    >
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                         </svg>
                    </button>

                    <h2 className="text-2xl font-bold uppercase tracking-widest text-center mt-2 mb-6 border-b-4 border-black pb-4 w-full flex-shrink-0">
                         Upload Case Evidence & FIR
                    </h2>

                    <p className="text-gray-600 text-sm mb-6 text-center font-mono uppercase tracking-wider flex-shrink-0">
                         Module 1 ingestion skeleton overlay
                    </p>

                    <div
                         className={`w-full border-4 flex-shrink-0 border-dashed p-10 flex flex-col items-center justify-center transition-colors cursor-pointer mb-6 ${isDragging ? 'border-black bg-gray-100' : 'border-gray-300 text-gray-400 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'}`}
                         onDragOver={handleDragOver}
                         onDragLeave={handleDragLeave}
                         onDrop={handleDrop}
                         onClick={() => fileInputRef.current?.click()}
                    >
                         <input
                              type="file"
                              multiple
                              className="hidden"
                              ref={fileInputRef}
                              onChange={handleFileInput}
                         />
                         <svg className={`w-12 h-12 mb-4 ${isDragging ? 'text-black' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                         </svg>
                         <span className={`font-bold uppercase tracking-widest text-sm ${isDragging ? 'text-black' : 'text-black'}`}>
                              {isDragging ? 'Drop Files Now' : 'Drag & Drop Files Here'}
                         </span>
                         <span className="text-xs mt-2 text-gray-500">PDF, Images, Audio, Video (Or click to browse)</span>
                    </div>

                    {/* Render the File List */}
                    {files.length > 0 && (
                         <div className="w-full mb-6 flex-shrink-0 flex flex-col gap-2 max-h-40 overflow-y-auto px-2">
                              {files.map((file, idx) => (
                                   <div key={`${file.name}-${idx}`} className="flex items-center justify-between p-3 border-2 border-gray-200 bg-white shadow-sm hover:border-black transition-colors group">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                             <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                             <span className="font-mono text-sm truncate max-w-[250px] sm:max-w-xs">{file.name}</span>
                                             <span className="text-xs text-gray-400 shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                                        </div>
                                        <button
                                             type="button"
                                             onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                             className="p-2 text-gray-400 hover:text-red-600 transition-colors shrink-0 outline-none"
                                             title={`Remove ${file.name}`}
                                        >
                                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                             </svg>
                                        </button>
                                   </div>
                              ))}
                         </div>
                    )}

                    <div className="flex justify-end gap-4 flex-shrink-0 w-full mt-auto">
                         <button
                              onClick={onClose}
                              className="px-6 py-3 border-2 border-black text-black bg-white font-bold uppercase tracking-widest text-sm hover:bg-gray-100 transition-all active:translate-x-1 active:translate-y-1 outline-none"
                         >
                              Cancel
                         </button>
                         <button
                              onClick={handleProcessFiles}
                              disabled={files.length === 0}
                              className={`px-6 py-3 border-2 border-black font-bold uppercase tracking-widest text-sm transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 outline-none
                                   ${files.length > 0
                                        ? 'bg-black text-white hover:bg-gray-900 cursor-pointer'
                                        : 'bg-gray-300 text-gray-500 border-gray-400 shadow-none cursor-not-allowed transform-none'
                                   }`}
                         >
                              Process Files
                         </button>
                    </div>
               </div>
          </div>
     );
}
