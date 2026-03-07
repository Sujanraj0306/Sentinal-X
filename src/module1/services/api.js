import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
     baseURL: API_BASE_URL,
     headers: {
          'Content-Type': 'application/json',
     },
});

export const uploadFiles = async (formData) => {
     return api.post('/upload', formData, {
          headers: {
               'Content-Type': 'multipart/form-data',
          },
     });
};

export const preprocessText = async (text, translate = false, clean = true) => {
     return api.post('/preprocess', {
          text,
          translate,
          clean,
     });
};

export const classifyIssues = async (text, useEmbeddings = false) => {
     return api.post('/classify-issues', {
          text,
          use_embeddings: useEmbeddings,
     });
};

export const mapSections = async (domain, primaryIssue, secondaryIssues = null) => {
     return api.post('/map-sections', {
          domain,
          primary_issue: primaryIssue,
          secondary_issues: secondaryIssues,
     });
};

export const extractEvidence = async (text) => {
     return api.post('/extract-evidence', {
          text,
     });
};

export const analyzeLegal = async (facts, sections, domain = null, evidence = null) => {
     return api.post('/legal-analysis', {
          facts,
          sections,
          domain,
          evidence,
     });
};

export const generateReport = async (caseId, caseData, saveMarkdown = true) => {
     return api.post('/generate-report', {
          case_id: caseId,
          case_data: caseData,
          save_markdown: saveMarkdown,
     });
};

export const analyzeAdvisory = async (clientObjective, background, files, caseTitle) => {
     const formData = new FormData();
     formData.append('client_objective', clientObjective);
     if (background) formData.append('background', background);
     if (caseTitle) formData.append('case_title', caseTitle);
     if (files && files.length > 0) {
          files.forEach(file => {
               formData.append('files', file);
          });
     }

     return api.post('/analyze-advisory', formData, {
          headers: {
               'Content-Type': 'multipart/form-data',
          },
     });
};

export default api;
