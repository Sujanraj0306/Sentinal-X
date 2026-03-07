import React from 'react';

export default function UploadModal({ onClose }) {
     return (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center font-sans">
               <div className="bg-white p-8 border-4 border-black w-full max-w-2xl mx-4 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center relative animate-fade-in">
                    <button
                         onClick={onClose}
                         className="absolute top-4 right-4 text-black hover:text-red-600 transition-colors p-2"
                         title="Close"
                    >
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                         </svg>
                    </button>

                    <h2 className="text-2xl font-bold uppercase tracking-widest text-center mt-2 mb-6 border-b-4 border-black pb-4 w-full">
                         Upload Case Evidence & FIR
                    </h2>

                    <p className="text-gray-600 text-sm mb-8 text-center font-mono uppercase tracking-wider">
                         Module 1 ingestion skeleton overlay
                    </p>

                    {/* Placeholder for drag-and-drop or file input */}
                    <div className="w-full border-4 border-dashed border-gray-300 p-16 flex flex-col items-center justify-center text-gray-400 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-colors cursor-pointer mb-8">
                         <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                         </svg>
                         <span className="font-bold uppercase tracking-widest text-sm text-black">Drag & Drop Files Here</span>
                         <span className="text-xs mt-2">PDF, Images, Audio, Video</span>
                    </div>

                    <div className="flex justify-end w-full gap-4">
                         <button
                              onClick={onClose}
                              className="px-6 py-3 border-2 border-black text-black font-bold uppercase tracking-widest text-sm hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
                         >
                              Cancel
                         </button>
                    </div>
               </div>
          </div>
     );
}
