import React from 'react';

function ProgressIndicator({ progress }) {
     const steps = [
          { id: 1, name: 'Upload' },
          { id: 2, name: 'Preprocess' },
          { id: 3, name: 'Classify' },
          { id: 4, name: 'Sections' },
          { id: 5, name: 'Evidence' },
          { id: 6, name: 'Analysis' },
          { id: 7, name: 'Report' }
     ];

     return (
          <div className="progress-indicator">
               <div className="progress-header">
                    <h3>STATUS: {progress.message.toUpperCase()}</h3>
               </div>

               <div className="progress-steps">
                    {steps.map(step => (
                         <div
                              key={step.id}
                              className={`progress-step ${step.id < progress.step ? 'completed' :
                                        step.id === progress.step ? 'active' :
                                             'pending'
                                   }`}
                         >
                              <div className="step-name">{step.name}</div>
                         </div>
                    ))}
               </div>
          </div>
     );
}

export default ProgressIndicator;
