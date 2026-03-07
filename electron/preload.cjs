const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
     // Debate Engine Streams
     onDebateStream: (callback) => ipcRenderer.on('debate-stream-chunk', callback),
     onDebateGraphInit: (callback) => ipcRenderer.on('debate-graph-init', callback),
     onDebateNodeStatus: (callback) => ipcRenderer.on('debate-node-status', callback),
     onDebateNodeResult: (callback) => ipcRenderer.on('debate-node-result', callback),
     onDebateEdgeAnimate: (callback) => ipcRenderer.on('debate-edge-animate', callback),
     onDebateStage: (callback) => ipcRenderer.on('debate-stage', callback),
     onExternalDriveDisconnected: (callback) => ipcRenderer.on('external-drive-disconnected', callback),

     requestStrategicAnalysis: (data) => ipcRenderer.invoke('request-strategic-analysis', data),

     // Informational Queries
     requestCaseInfo: (query) => ipcRenderer.invoke('request-case-info', query),

     // Case Operations
     selectCaseFolder: () => ipcRenderer.invoke('select-case-folder'),
     createNewCase: (caseDetails) => ipcRenderer.invoke('create-new-case', caseDetails),
     submitHearingUpdate: (updateText) => ipcRenderer.invoke('submit-hearing-update', updateText),

     // Persistence & SQLite operations
     getCases: () => ipcRenderer.invoke('get-cases'),
     getMessages: (caseId) => ipcRenderer.invoke('get-messages', caseId),
     saveMessage: (data) => ipcRenderer.invoke('save-message', data),
     parseCaseMetadata: (data) => ipcRenderer.invoke('parse-case-metadata', data),
     uploadEvidence: (caseId, folderPath) => ipcRenderer.invoke('upload-evidence', caseId, folderPath),
     deleteCase: (caseId) => ipcRenderer.invoke('delete-case', caseId),
     exportExecutionLog: (logs) => ipcRenderer.invoke('export-execution-log', logs),
     triggerManualTool: (data) => ipcRenderer.invoke('manualToolTrigger', data),
     saveDocument: (filePath, defaultName) => ipcRenderer.invoke('save-document', filePath, defaultName),

     // App initialization signals (for setup modal)
     checkApiKeyStatus: () => ipcRenderer.invoke('check-api-key-status'),
     saveApiKey: (key) => ipcRenderer.invoke('save-api-key', key)
});
