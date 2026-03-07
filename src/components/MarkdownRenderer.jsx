import React from 'react';
import ReactMarkdown from 'react-markdown';

/**
 * MarkdownRenderer — renders AI agent output cleanly.
 * Suppresses the double-spacing caused by react-markdown
 * wrapping <li> content inside <p> tags when blank lines exist.
 */
const components = {
     // Headings — bold, compact, sans-serif
     h1: ({ children }) => <p className="text-base font-bold mt-3 mb-0.5 uppercase tracking-wide">{children}</p>,
     h2: ({ children }) => <p className="text-sm font-bold mt-2.5 mb-0.5 uppercase tracking-wide">{children}</p>,
     h3: ({ children }) => <p className="text-xs font-bold mt-2 mb-0 uppercase tracking-widest opacity-80">{children}</p>,
     h4: ({ children }) => <p className="text-xs font-bold mt-1.5 mb-0">{children}</p>,

     // Paragraphs — remove excess bottom margin
     p: ({ children }) => <span className="block mb-1 leading-snug">{children}</span>,

     // Ordered lists — number and content inline, no gaps
     ol: ({ children }) => (
          <ol className="list-decimal pl-5 my-1 space-y-0.5">{children}</ol>
     ),

     // Unordered lists
     ul: ({ children }) => (
          <ul className="list-disc pl-5 my-1 space-y-0.5">{children}</ul>
     ),

     // List items — tight, inline content
     li: ({ children }) => (
          <li className="leading-snug pl-0.5">
               {/* Kill the gap from nested p tags by rendering children inline */}
               {children}
          </li>
     ),

     // Strong / Bold
     strong: ({ children }) => <strong className="font-bold">{children}</strong>,

     // Em / Italic
     em: ({ children }) => <em className="italic">{children}</em>,

     // Blockquote
     blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-gray-400 pl-3 my-1 italic text-gray-500">
               {children}
          </blockquote>
     ),

     // Horizontal rule
     hr: () => <hr className="border-t border-gray-300 my-2" />,
};

export default function MarkdownRenderer({ children, className = '' }) {
     return (
          <div className={`md-body text-sm leading-snug ${className}`}>
               <ReactMarkdown components={components}>
                    {children || ''}
               </ReactMarkdown>
          </div>
     );
}
