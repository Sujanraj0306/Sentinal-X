import React, { useState } from 'react';
import CaseTypeSelector from './CaseTypeSelector';
import CaseForm from './CaseForm';
import AdvisoryForm from './AdvisoryForm';
import ProgressIndicator from './ProgressIndicator';
import ResultsView from './ResultsView';
import AdvisoryResultsView from './AdvisoryResultsView';
import './styles/App.css';
import * as api from './services/api';

function App({ onClose, onComplete }) {
     const [caseType, setCaseType] = useState('litigation'); // litigation or advisory
     const [currentStep, setCurrentStep] = useState('form'); // form, processing, results
     const [progress, setProgress] = useState({ step: 0, message: '' });
     const [results, setResults] = useState(null);
     const [error, setError] = useState(null);

     const handleAnalyze = async (data) => {
          try {
               setCurrentStep('processing');
               setError(null);

               const { files, caseTitle } = data;

               // Step 1: Upload files
               setProgress({ step: 1, message: 'Uploading and scanning documents...' });
               const uploadResponse = await api.uploadFiles(files);
               const uploadedData = uploadResponse.data;

               // Combine all text (Backend already combines text+file for statement/fir, we just join sections)
               // result["statement_text"], result["fir_text"]
               const allText = [
                    uploadedData.statement_text || '',
                    uploadedData.fir_text || '',
                    ...(uploadedData.other_docs_text?.map(doc => doc.text || '') || [])
               ].filter(Boolean).join('\n\n');

               if (!allText.trim()) {
                    throw new Error("No text could be extracted from inputs. Please provide text or valid documents.");
               }

               // Step 2: Preprocess text
               setProgress({ step: 2, message: 'Preprocessing and translating...' });
               const preprocessResponse = await api.preprocessText(allText, false, true);
               const cleanedText = preprocessResponse.data.cleaned_text || allText;

               // Step 3: Classify issues
               setProgress({ step: 3, message: 'Classifying legal issues...' });
               const classifyResponse = await api.classifyIssues(cleanedText);
               const classification = classifyResponse.data;

               // Step 4: Map sections
               setProgress({ step: 4, message: 'Mapping statutes and sections...' });
               const sectionsResponse = await api.mapSections(
                    classification.domain,
                    classification.primary_issue,
                    classification.secondary_issues
               );
               const sections = sectionsResponse.data.all_sections;

               // Step 5: Extract evidence
               setProgress({ step: 5, message: 'Extracting key evidence...' });
               const evidenceResponse = await api.extractEvidence(cleanedText);
               const evidence = evidenceResponse.data;

               // Step 6: Legal analysis
               setProgress({ step: 6, message: 'Generating legal reasoning...' });
               const analysisResponse = await api.analyzeLegal(
                    cleanedText,
                    sections,
                    classification.domain,
                    evidence
               );
               const analysis = analysisResponse.data.analysis;

               // Step 7: Generate report
               setProgress({ step: 7, message: 'Finalizing report...' });
               const caseId = caseTitle ?
                    caseTitle.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase() :
                    `CASE_${Date.now()}`;

               const caseData = {
                    facts: cleanedText,
                    domain: classification.domain,
                    primary_issue: classification.primary_issue,
                    secondary_issues: classification.secondary_issues,
                    sections: sections,
                    evidence: evidence,
                    analysis: analysis
               };

               const reportResponse = await api.generateReport(caseId, caseData);

               // Set results
               setResults({
                    caseId,
                    classification,
                    sections,
                    evidence,
                    analysis,
                    report: reportResponse.data
               });

               // Automate Data Handoff to War Room (Module 3)
               if (onComplete && reportResponse.data.case_directory) {
                    onComplete(caseTitle || caseId, reportResponse.data.case_directory);
               } else {
                    setCurrentStep('results');
               }

          } catch (err) {
               console.error('Analysis error:', err);
               setError(err.response?.data?.detail || err.message || 'An error occurred during analysis');
               setCurrentStep('form');
          }
     };

     const handleAnalyzeAdvisory = async (data) => {
          try {
               setCurrentStep('processing');
               setError(null);

               const { clientObjective, background, files, caseTitle } = data;

               // Step 1: Analyze advisory
               setProgress({ step: 1, message: 'Analyzing advisory request...' });
               const response = await api.analyzeAdvisory(clientObjective, background, files, caseTitle);
               const result = response.data;

               if (result.status === 'error') {
                    throw new Error(result.error || 'Advisory analysis failed');
               }

               // Extract results
               const classification = result.steps?.classification || {};
               const analysis = result.steps?.analysis?.analysis || '';
               const report = result.steps?.report || {};

               setResults({
                    caseId: result.case_id,
                    domain: classification.domain,
                    analysis: analysis,
                    report: report,
                    summary: result.summary
               });

               setCurrentStep('results');

          } catch (err) {
               console.error('Advisory analysis error:', err);
               setError(err.response?.data?.detail || err.message || 'An error occurred during advisory analysis');
               setCurrentStep('form');
          }
     };

     const handleReset = () => {
          setCurrentStep('form');
          setProgress({ step: 0, message: '' });
          setResults(null);
          setError(null);
     };

     const handleCaseTypeChange = (newCaseType) => {
          setCaseType(newCaseType);
          handleReset();
     };

     return (
          <div className="app">
               <header className="app-header">
                    <h1>LEGAL ANALYSIS SYSTEM</h1>
                    <p>AI-POWERED CASE CLASSIFICATION & REPORTING</p>
               </header>

               <main className="app-main">
                    {error && (
                         <div className="error-banner">
                              <strong>SYSTEM ERROR:</strong> {error}
                         </div>
                    )}

                    {currentStep === 'form' && (
                         <>
                              <CaseTypeSelector
                                   caseType={caseType}
                                   onCaseTypeChange={handleCaseTypeChange}
                              />

                              {caseType === 'litigation' && (
                                   <CaseForm onAnalyze={handleAnalyze} />
                              )}

                              {caseType === 'advisory' && (
                                   <AdvisoryForm onAnalyze={handleAnalyzeAdvisory} />
                              )}
                         </>
                    )}

                    {currentStep === 'processing' && (
                         <ProgressIndicator progress={progress} />
                    )}

                    {currentStep === 'results' && caseType === 'litigation' && (
                         <ResultsView results={results} onReset={handleReset} />
                    )}

                    {currentStep === 'results' && caseType === 'advisory' && (
                         <AdvisoryResultsView results={results} onReset={handleReset} />
                    )}
               </main>
          </div>
     );
}

export default App;
