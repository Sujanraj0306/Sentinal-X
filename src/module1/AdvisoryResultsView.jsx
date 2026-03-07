import React from 'react';

function AdvisoryResultsView({ results, onReset }) {
     const { caseId, domain, analysis, report, summary } = results;

     const handleOpenPDF = async () => {
          if (window.electron) {
               await window.electron.openPDF(report.pdf_path);
          } else {
               alert('PDF path: ' + report.pdf_path);
          }
     };

     const handleOpenFolder = async () => {
          if (window.electron) {
               await window.electron.openFolder(report.case_directory);
          } else {
               alert('Folder path: ' + report.case_directory);
          }
     };

     const renderFormattedAnalysis = (analysisText) => {
          if (!analysisText) return null;

          const lines = analysisText.split('\n');
          const blocks = [];

          lines.forEach(line => {
               const trimmed = line.trim();

               if (trimmed.startsWith('##')) {
                    const headingText = trimmed.replace(/^##\s*/, '').replace(/\*/g, '');
                    blocks.push({ type: 'heading', content: headingText });
               } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
                    blocks.push({ type: 'bullet', content: trimmed.replace(/^[\*\-•]\s*/, '') });
               } else if (trimmed === '') {
                    const lastBlock = blocks.length > 0 ? blocks[blocks.length - 1] : null;
                    if (lastBlock && lastBlock.type !== 'heading' && lastBlock.type !== 'break') {
                         blocks.push({ type: 'break' });
                    }
               } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                    blocks.push({ type: 'bold', content: trimmed.replace(/\*\*/g, '') });
               } else {
                    blocks.push({ type: 'text', content: line });
               }
          });

          return blocks.map((block, index) => {
               switch (block.type) {
                    case 'heading':
                         return <div key={index} className="analysis-heading">{block.content}</div>;
                    case 'bullet':
                         return <div key={index} className="analysis-bullet">• {block.content}</div>;
                    case 'break':
                         return <br key={index} />;
                    case 'bold':
                         return <div key={index} className="analysis-bold">{block.content}</div>;
                    case 'text':
                         return <div key={index} className="analysis-text">{block.content}</div>;
                    default:
                         return null;
               }
          });
     };

     return (
          <div className="results-view">
               <h2>ADVISORY REPORT GENERATED</h2>

               <div className="results-section">
                    <h3>CASE INFORMATION</h3>
                    <div className="info-grid">
                         <div className="info-item">
                              <span className="info-label">CASE ID:</span>
                              <span className="info-value">{caseId}</span>
                         </div>
                         <div className="info-item">
                              <span className="info-label">ADVISORY DOMAIN:</span>
                              <span className="info-value">{domain}</span>
                         </div>
                         <div className="info-item">
                              <span className="info-label">CONFIDENCE:</span>
                              <span className="info-value">{(summary?.confidence * 100 || 0).toFixed(1)}%</span>
                         </div>
                         {summary?.documents_processed > 0 && (
                              <div className="info-item">
                                   <span className="info-label">DOCUMENTS REVIEWED:</span>
                                   <span className="info-value">{summary.documents_processed}</span>
                              </div>
                         )}
                    </div>
               </div>

               <div className="results-section">
                    <h3>ADVISORY ANALYSIS</h3>
                    <div className="analysis-content">
                         {renderFormattedAnalysis(analysis)}
                    </div>
               </div>

               <div className="results-actions">
                    <button onClick={handleOpenPDF} className="action-button primary">
                         OPEN ADVISORY REPORT (PDF)
                    </button>
                    <button onClick={handleOpenFolder} className="action-button">
                         OPEN DIRECTORY
                    </button>
                    <button onClick={onReset} className="action-button">
                         NEW ADVISORY
                    </button>
               </div>
          </div>
     );
}

export default AdvisoryResultsView;
