import React from 'react';

function CaseTypeSelector({ caseType, onCaseTypeChange }) {
     return (
          <div className="case-type-selector">
               <h2>SELECT CASE TYPE</h2>
               <div className="case-type-options">
                    <label className={`case-type-option ${caseType === 'litigation' ? 'selected' : ''}`}>
                         <input
                              type="radio"
                              name="caseType"
                              value="litigation"
                              checked={caseType === 'litigation'}
                              onChange={(e) => onCaseTypeChange(e.target.value)}
                         />
                         <div className="option-content">
                              <h3>LITIGATION CASE</h3>
                              <p>FIR-based case analysis with evidence extraction and legal section mapping</p>
                         </div>
                    </label>

                    <label className={`case-type-option ${caseType === 'advisory' ? 'selected' : ''}`}>
                         <input
                              type="radio"
                              name="caseType"
                              value="advisory"
                              checked={caseType === 'advisory'}
                              onChange={(e) => onCaseTypeChange(e.target.value)}
                         />
                         <div className="option-content">
                              <h3>PRE-LITIGATION ADVISORY</h3>
                              <p>Preventive legal guidance for property, business, immigration, and other matters</p>
                         </div>
                    </label>
               </div>
          </div>
     );
}

export default CaseTypeSelector;
