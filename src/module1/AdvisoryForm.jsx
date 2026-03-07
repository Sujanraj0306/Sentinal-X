import React, { useState } from 'react';

function AdvisoryForm({ onAnalyze }) {
     const [clientObjective, setClientObjective] = useState('');
     const [background, setBackground] = useState('');
     const [files, setFiles] = useState([]);
     const [caseTitle, setCaseTitle] = useState('');

     const handleSubmit = (e) => {
          e.preventDefault();

          if (!clientObjective.trim()) {
               alert('Please provide the client objective');
               return;
          }

          onAnalyze({
               clientObjective,
               background,
               files,
               caseTitle
          });
     };

     const handleFileChange = (e) => {
          setFiles(Array.from(e.target.files));
     };

     return (
          <div className="case-form">
               <h2>PRE-LITIGATION ADVISORY</h2>
               <p className="form-description">
                    Provide details for preventive legal guidance
               </p>

               <form onSubmit={handleSubmit}>
                    <div className="form-group">
                         <label htmlFor="caseTitle">CASE TITLE (Optional)</label>
                         <input
                              type="text"
                              id="caseTitle"
                              value={caseTitle}
                              onChange={(e) => setCaseTitle(e.target.value)}
                              placeholder="e.g., Property Purchase Advisory - Coimbatore"
                         />
                    </div>

                    <div className="form-group">
                         <label htmlFor="clientObjective">CLIENT OBJECTIVE *</label>
                         <textarea
                              id="clientObjective"
                              value={clientObjective}
                              onChange={(e) => setClientObjective(e.target.value)}
                              placeholder="Describe what the client wants to achieve (e.g., 'Client wants to purchase agricultural land in Tamil Nadu')"
                              rows="4"
                              required
                         />
                    </div>

                    <div className="form-group">
                         <label htmlFor="background">BACKGROUND DETAILS (Optional)</label>
                         <textarea
                              id="background"
                              value={background}
                              onChange={(e) => setBackground(e.target.value)}
                              placeholder="Provide additional context, history, or relevant information"
                              rows="6"
                         />
                    </div>

                    <div className="form-group">
                         <label htmlFor="files">SUPPORTING DOCUMENTS (Optional)</label>
                         <input
                              type="file"
                              id="files"
                              onChange={handleFileChange}
                              multiple
                              accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                         />
                         {files.length > 0 && (
                              <div className="file-list">
                                   <p>Selected files:</p>
                                   <ul>
                                        {files.map((file, index) => (
                                             <li key={index}>{file.name}</li>
                                        ))}
                                   </ul>
                              </div>
                         )}
                    </div>

                    <button type="submit" className="submit-button">
                         GENERATE ADVISORY
                    </button>
               </form>
          </div>
     );
}

export default AdvisoryForm;
