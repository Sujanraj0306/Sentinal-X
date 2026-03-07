import React, { useState } from 'react';

function CaseForm({ onAnalyze }) {
     const [caseTitle, setCaseTitle] = useState('');

     // Statement inputs
     const [statementText, setStatementText] = useState('');
     const [statementFile, setStatementFile] = useState(null);

     // FIR inputs
     const [firText, setFirText] = useState('');
     const [firFile, setFirFile] = useState(null);

     // Other evidence
     const [otherFiles, setOtherFiles] = useState([]);

     const handleSubmit = (e) => {
          e.preventDefault();

          // Create FormData
          const formData = new FormData();
          formData.append('case_title', caseTitle);

          // Statement: Send text if present, otherwise file
          if (statementText.trim()) {
               formData.append('statement_text', statementText);
          }
          if (statementFile) {
               formData.append('statement_file', statementFile);
          }

          // FIR: Send text if present, otherwise file
          if (firText.trim()) {
               formData.append('fir_text', firText);
          }
          if (firFile) {
               formData.append('fir_file', firFile);
          }

          // Add other files
          otherFiles.forEach(file => {
               formData.append('other_files', file);
          });

          // Pass data to parent
          onAnalyze({
               files: formData,
               caseTitle
          });
     };

     const handleOtherFilesChange = (e) => {
          setOtherFiles(Array.from(e.target.files));
     };

     return (
          <div className="case-form">
               <div className="form-header">
                    <h2>CASE ENTRY</h2>
               </div>

               <form onSubmit={handleSubmit}>
                    {/* Case Title */}
                    <div className="form-section">
                         <div className="form-group">
                              <label htmlFor="caseTitle">CASE TITLE / REFERENCE NO.</label>
                              <input
                                   type="text"
                                   id="caseTitle"
                                   value={caseTitle}
                                   onChange={(e) => setCaseTitle(e.target.value)}
                                   placeholder="e.g. State vs. John Doe"
                                   required
                              />
                         </div>
                    </div>

                    {/* Statement Section */}
                    <div className="form-section">
                         <h3>I. STATEMENT OF FACTS</h3>
                         <div className="input-group-mixed">
                              <textarea
                                   id="statement"
                                   value={statementText}
                                   onChange={(e) => setStatementText(e.target.value)}
                                   placeholder="Enter text here..."
                                   rows="5"
                              />
                              <div className="file-upload-inline">
                                   <label htmlFor="statementFile" className="btn-file">
                                        {statementFile ? "CHANGE FILE" : "UPLOAD DOCUMENT"}
                                   </label>
                                   <span className="file-name">{statementFile ? statementFile.name : "No file selected"}</span>
                                   <input
                                        type="file"
                                        id="statementFile"
                                        onChange={(e) => setStatementFile(e.target.files[0])}
                                        accept=".pdf,.jpg,.jpeg,.png,.docx,.txt"
                                   />
                              </div>
                         </div>
                    </div>

                    {/* FIR Section */}
                    <div className="form-section">
                         <h3>II. FIRST INFORMATION REPORT (FIR)</h3>
                         <div className="input-group-mixed">
                              <textarea
                                   id="fir"
                                   value={firText}
                                   onChange={(e) => setFirText(e.target.value)}
                                   placeholder="Enter FIR details here..."
                                   rows="4"
                              />
                              <div className="file-upload-inline">
                                   <label htmlFor="firFile" className="btn-file">
                                        {firFile ? "CHANGE COPY" : "UPLOAD FIR COPY"}
                                   </label>
                                   <span className="file-name">{firFile ? firFile.name : "No file selected"}</span>
                                   <input
                                        type="file"
                                        id="firFile"
                                        onChange={(e) => setFirFile(e.target.files[0])}
                                        accept=".pdf,.jpg,.jpeg,.png,.docx,.txt"
                                   />
                              </div>
                         </div>
                    </div>

                    {/* Other Evidence Section */}
                    <div className="form-section">
                         <h3>III. ADDITIONAL EVIDENCE</h3>
                         <div className="file-upload-area">
                              <label htmlFor="otherFiles" className="file-drop-zone">
                                   <span>CLICK TO SELECT ADDITIONAL FILES</span>
                                   <small>(Witness statements, Medical reports, CCTV logs)</small>
                                   <input
                                        type="file"
                                        id="otherFiles"
                                        onChange={handleOtherFilesChange}
                                        accept=".pdf,.jpg,.jpeg,.png,.docx,.txt"
                                        multiple
                                   />
                              </label>

                              {otherFiles.length > 0 && (
                                   <div className="file-list-simple">
                                        <strong>Selected Files ({otherFiles.length}):</strong>
                                        <ul>
                                             {otherFiles.map((file, index) => (
                                                  <li key={index}>{file.name}</li>
                                             ))}
                                        </ul>
                                   </div>
                              )}
                         </div>
                    </div>

                    <div className="form-footer">
                         <button type="submit" className="btn-submit">
                              PROCEED TO ANALYSIS
                         </button>
                    </div>
               </form>
          </div>
     );
}

export default CaseForm;
