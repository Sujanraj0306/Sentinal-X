import React from 'react';

function ResultsView({ results, onReset }) {
     const { caseId, classification, sections, evidence, analysis, report } = results;

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

     // Helper to process bold text (**bold**)
     const renderTextWithBold = (text) => {
          const parts = text.split(/(\*\*.*?\*\*)/g);
          return parts.map((part, i) => {
               if (part.startsWith('**') && part.endsWith('**')) {
                    return <b key={i}>{part.slice(2, -2)}</b>;
               }
               return part;
          });
     };

     const renderTable = (lines, key) => {
          // Filter rows
          const rows = lines.filter(l => l.trim().length > 0);
          if (rows.length < 2) return null;

          // Parse header
          const headerRow = rows[0];
          const headers = headerRow.split('|').map(c => c.trim()).filter(c => c);

          // Check for delimiter row (usually contains dashes)
          let bodyStartIndex = 1;
          if (rows[1].includes('---')) {
               bodyStartIndex = 2;
          }

          const bodyRows = rows.slice(bodyStartIndex);

          return (
               <div key={key} style={{ overflowX: 'auto' }}>
                    <table className="analysis-table">
                         <thead>
                              <tr>
                                   {headers.map((h, i) => <th key={i}>{renderTextWithBold(h)}</th>)}
                              </tr>
                         </thead>
                         <tbody>
                              {bodyRows.map((row, rIndex) => {
                                   const cells = row.split('|').map(c => c.trim()).filter((c, i, arr) => {
                                        // Remove empty first/last tokens if caused by leading/trailing pipes
                                        // Markdown | a | b | splits to ["", "a", "b", ""]
                                        if (i === 0 && c === '' && row.trim().startsWith('|')) return false;
                                        if (i === arr.length - 1 && c === '' && row.trim().endsWith('|')) return false;
                                        return true;
                                   });

                                   if (cells.length === 0) return null;

                                   return (
                                        <tr key={rIndex}>
                                             {cells.map((cell, cIndex) => (
                                                  <td key={cIndex}>{renderTextWithBold(cell)}</td>
                                             ))}
                                        </tr>
                                   );
                              })}
                         </tbody>
                    </table>
               </div>
          );
     };

     const renderFormattedAnalysis = (text) => {
          if (!text) return null;
          const lines = text.split('\n');
          const blocks = [];
          let tableBuffer = [];

          lines.forEach((line) => {
               const trimmed = line.trim();

               // Table detection
               if (trimmed.startsWith('|') && trimmed.includes('|')) {
                    tableBuffer.push(line);
               } else {
                    // Flush table if exists
                    if (tableBuffer.length > 0) {
                         blocks.push({ type: 'table', content: tableBuffer });
                         tableBuffer = [];
                    }

                    if (trimmed.startsWith('##')) {
                         blocks.push({ type: 'heading', content: trimmed.replace(/^#+\s*/, '') });
                    } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
                         blocks.push({ type: 'bullet', content: trimmed.replace(/^[\*\-•]\s*/, '') });
                    } else if (trimmed.startsWith('---') || trimmed.startsWith('___') || trimmed.match(/^[-*_]{3,}$/)) {
                         // Ignore horizontal rules as requested
                    } else if (trimmed === '') {
                         const lastBlock = blocks.length > 0 ? blocks[blocks.length - 1] : null;
                         if (lastBlock && lastBlock.type !== 'heading' && lastBlock.type !== 'break') {
                              blocks.push({ type: 'break' });
                         }
                    } else {
                         blocks.push({ type: 'text', content: line });
                    }
               }
          });
          // Flush remaining table
          if (tableBuffer.length > 0) {
               blocks.push({ type: 'table', content: tableBuffer });
          }

          return blocks.map((block, index) => {
               if (block.type === 'table') {
                    return renderTable(block.content, index);
               }
               if (block.type === 'heading') {
                    return <div key={index} className="analysis-heading">{block.content}</div>;
               }
               if (block.type === 'bullet') {
                    return <div key={index} className="analysis-bullet">• {renderTextWithBold(block.content)}</div>;
               }
               if (block.type === 'break') {
                    return <br key={index} />;
               }
               return (
                    <div key={index} style={{ marginBottom: '0.5rem' }}>
                         {renderTextWithBold(block.content)}
                    </div>
               );
          });
     };

     return (
          <div className="results-view">
               <div className="results-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2>ANALYSIS COMPLETE</h2>
                    <p className="case-id">REFERENCE ID: {caseId}</p>
               </div>

               {/* Report Generation Success */}
               <div className="result-card" style={{ border: '2px solid #000', background: '#f0f0f0' }}>
                    <h3>FINAL REPORT GENERATED</h3>
                    <div className="result-content">
                         <p><strong>PDF LOCATION:</strong> {report.pdf_path}</p>
                         <p><strong>GENERATED AT:</strong> {new Date(report.generated_at).toLocaleString()}</p>

                         <div className="report-actions" style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                              <button onClick={handleOpenPDF} className="btn-primary">
                                   OPEN REPORT (PDF)
                              </button>
                              <button onClick={handleOpenFolder} className="btn-secondary">
                                   OPEN DIRECTORY
                              </button>
                         </div>
                    </div>
               </div>

               <div className="results-grid">
                    {/* Classification */}
                    <div className="result-card">
                         <h3>LEGAL CLASSIFICATION</h3>
                         <div className="result-content">
                              <p><strong>DOMAIN:</strong> {classification.domain}</p>
                              <p><strong>PRIMARY ISSUE:</strong> {classification.primary_issue}</p>
                              {classification.secondary_issues && classification.secondary_issues.length > 0 && (
                                   <p><strong>SECONDARY ISSUES:</strong> {classification.secondary_issues.join(', ')}</p>
                              )}
                              <p><strong>CONFIDENCE SCORE:</strong> {(classification.domain_confidence * 100).toFixed(1)}%</p>
                         </div>
                    </div>

                    {/* Legal Sections */}
                    <div className="result-card">
                         <h3>APPLICABLE SECTIONS ({sections.length})</h3>
                         <div className="result-content">
                              <div className="sections-list">
                                   {sections.slice(0, 5).map((section, index) => (
                                        <div key={index} className="section-item">
                                             <strong>{section.act} Section {section.section}</strong>: {section.title}
                                        </div>
                                   ))}
                                   {sections.length > 5 && (
                                        <p className="more-info">... and {sections.length - 5} more</p>
                                   )}
                              </div>
                         </div>
                    </div>

                    {/* Evidence */}
                    <div className="result-card">
                         <h3>EVIDENCE SUMMARY</h3>
                         <div className="result-content">
                              {evidence.summary && (
                                   <>
                                        <p><strong>WITNESSES:</strong> {evidence.summary.confirmed_witnesses}</p>
                                        <p><strong>DOCUMENTS:</strong> {evidence.summary.total_documents}</p>
                                        <p><strong>DATES FOUND:</strong> {evidence.summary.total_dates}</p>
                                        <p><strong>LOCATIONS:</strong> {evidence.summary.total_locations}</p>
                                   </>
                              )}
                         </div>
                    </div>

                    {/* Analysis */}
                    <div className="result-card full-width">
                         <h3>LEGAL ANALYSIS</h3>
                         <div className="result-content">
                              <div className="analysis-text">
                                   {renderFormattedAnalysis(analysis)}
                              </div>
                         </div>
                    </div>
               </div>

               <div className="results-footer" style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <button onClick={onReset} className="btn-secondary">
                         NEW CASE ANALYSIS
                    </button>
               </div>
          </div>
     );
}

export default ResultsView;
