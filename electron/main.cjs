const { app, BrowserWindow, ipcMain, dialog, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// --- Centralized File-Based Logger ---
const LOG_FILE = path.join(__dirname, '..', 'app.log');
function writeLog(message) {
     const timestamp = new Date().toISOString();
     const logEntry = `[${timestamp}] ${message}\n`;
     fs.appendFileSync(LOG_FILE, logEntry, 'utf8');
     console.log(logEntry.trim());
}
// -------------------------------------

process.on('uncaughtException', (err) => {
     console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
     console.error('UNHANDLED REJECTION:', reason);
});


// @google/genai is ESM-only — use dynamic import() from CJS
let _GoogleGenAI = null;
async function getGoogleGenAIClass() {
     if (!_GoogleGenAI) {
          const mod = await import('@google/genai');
          _GoogleGenAI = mod.GoogleGenAI;
     }
     return _GoogleGenAI;
}

const { z } = require('zod');
const { ollamaGenerate, ollamaHealthCheck } = require('./ollama_helper.cjs');

async function getDocumentContext(folderPath) {
     const files = fs.readdirSync(folderPath);
     const docFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.txt'));

     let combinedContent = "";
     for (const file of docFiles) {
          combinedContent += "\n--- Document: " + file + " ---\n";
          combinedContent += fs.readFileSync(path.join(folderPath, file), 'utf-8');
     }
     if (!combinedContent) combinedContent = "No documents found.";

     // Limit length purely by slicing since we have no text textSplitter
     return combinedContent.substring(0, 30000);
}

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

let mainWindow;
let mcpClient = null;

async function startMcpClient() {
     try {
          const pythonExecutable = path.join(__dirname, '..', 'mcp_server', 'venv', 'bin', 'python3');
          const scriptPath = path.join(__dirname, '..', 'mcp_server', 'server.py');

          const transport = new StdioClientTransport({
               command: pythonExecutable,
               args: [scriptPath]
          });

          mcpClient = new Client({
               name: "LegalWarRoomClient",
               version: "1.0.0"
          }, { capabilities: { tools: {} }, requestTimeoutMs: 600000 });

          await mcpClient.connect(transport);
          console.log("MCP Client successfully connected to Python Stdio Server.");
     } catch (e) {
          console.error("Failed to start MCP server:", e);
     }
}

// In Development, we load the Vite dev server URL. 
// In Production, we load the built React files.
const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

function createWindow() {
     mainWindow = new BrowserWindow({
          width: 1400,
          height: 900,
          webPreferences: {
               preload: path.join(__dirname, 'preload.cjs'),
               contextIsolation: true,
               nodeIntegration: false,
          },
          // Enforce strict styling, hidden title bar if necessary
          backgroundColor: '#ffffff'
     });

     if (isDev) {
          // Port 5173 is the default for Vite
          mainWindow.loadURL('http://127.0.0.1:5173');
          // mainWindow.webContents.openDevTools(); Disable DevTools popups for UI test reliability
     } else {
          mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
     }
}

app.whenReady().then(async () => {
     await startMcpClient();
     createWindow();

     app.on('activate', function () {
          if (BrowserWindow.getAllWindows().length === 0) createWindow();
     });
});

app.on('window-all-closed', function () {
     if (process.platform !== 'darwin') app.quit();
});

// ==========================================
// SECURE STORAGE (API KEYS & DB SECRETS)
// ==========================================
ipcMain.handle('check-api-key-status', async () => {
     try {
          // Dev bypass using .env
          if (isDev && process.env.GEMINI_API_KEY) {
               return true;
          }

          // Check safeStorage 
          const keyPath = path.join(app.getPath('userData'), 'secure_key.enc');
          if (fs.existsSync(keyPath)) {
               const encrypted = fs.readFileSync(keyPath);
               const decrypted = safeStorage.decryptString(encrypted);
               return !!decrypted;
          }
          return false;
     } catch (error) {
          console.error('Error checking API key:', error);
          return false;
     }
});

ipcMain.handle('save-api-key', async (event, keyString) => {
     try {
          if (!safeStorage.isEncryptionAvailable()) {
               throw new Error('OS-level encryption is not available on this system.');
          }
          const encrypted = safeStorage.encryptString(keyString);
          const keyPath = path.join(app.getPath('userData'), 'secure_key.enc');
          fs.writeFileSync(keyPath, encrypted);
          return { success: true };
     } catch (error) {
          console.error('Failed to save API Key:', error);
          return { success: false, error: error.message };
     }
});

// Helper to retrieve API key for backend processes
function getGeminiApiKey() {
     if (isDev && process.env.GEMINI_API_KEY) {
          return process.env.GEMINI_API_KEY;
     }
     const keyPath = path.join(app.getPath('userData'), 'secure_key.enc');
     if (fs.existsSync(keyPath)) {
          const encrypted = fs.readFileSync(keyPath);
          return safeStorage.decryptString(encrypted);
     }
     return null;
}


// ==========================================
// IPC HANDLERS FOR DEBATE ENGINE & FILESYSTEM
// ==========================================

ipcMain.handle('select-case-folder', async () => {
     const result = await dialog.showOpenDialog(mainWindow, {
          properties: ['openDirectory']
     });
     if (result.canceled) return null;
     return result.filePaths[0];
});

/* 
  AI & Filesystem Handlers
*/
// 1. Local Database setup (simulated secure local case store)
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.join(app.getPath('userData'), 'cases_v3.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
     // Re-create cases table with richer metadata for the welcome screen / sidebar
     db.run(`CREATE TABLE IF NOT EXISTS cases (
          id TEXT PRIMARY KEY,
          case_name TEXT,
          folder_path TEXT,
          victim TEXT,
          accused TEXT,
          critical_dates TEXT,
          status TEXT,
          domain TEXT,
          sections TEXT,
          summary TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
     )`);

     db.run(`CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          case_id TEXT,
          role TEXT,
          content TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(case_id) REFERENCES cases(id)
     )`);
});

// IPC: Get all cases for the sidebar
ipcMain.handle('get-cases', async () => {
     return new Promise((resolve, reject) => {
          db.all("SELECT * FROM cases ORDER BY timestamp DESC", [], (err, rows) => {
               if (err) reject(err);
               else resolve(rows);
          });
     });
});

// IPC: Get messages for a specific case
ipcMain.handle('get-messages', async (event, caseId) => {
     return new Promise((resolve, reject) => {
          db.all("SELECT * FROM messages WHERE case_id = ? ORDER BY timestamp ASC", [caseId], (err, rows) => {
               if (err) reject(err);
               else resolve(rows);
          });
     });
});

// IPC: Save a message
ipcMain.handle('save-message', async (event, data) => {
     // Accept both `caseId` and `case_id` key forms from the frontend
     const caseId = data.caseId || data.case_id;
     const { role, content } = data;
     return new Promise((resolve, reject) => {
          db.run("INSERT INTO messages (case_id, role, content) VALUES (?, ?, ?)", [caseId, role, content], function (err) {
               if (err) reject(err);
               else resolve({ success: true, id: this.lastID });
          });
     });
});

// IPC: Parse Case Metadata and save to DB
ipcMain.handle('parse-case-metadata', async (event, { caseId, folderPath, caseName }) => {
     try {
          // Read all text/md documents in the folder for RAG extraction
          const files = fs.readdirSync(folderPath);
          const docFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.txt') || f.endsWith('.pdf'));

          let combinedContent = "";
          let docsRead = 0;

          for (const file of docFiles) {
               if (docsRead >= 5) break; // Limit context window
               if (!file.endsWith('.pdf')) { // Simplistic handling, skip binary PDFs for basic parsing here
                    combinedContent += `\n--- Document: ${file} ---\n`;
                    combinedContent += fs.readFileSync(path.join(folderPath, file), 'utf-8').substring(0, 5000);
                    docsRead++;
               }
          }

          if (combinedContent.length === 0) {
               combinedContent = "No readable facts found. Awaiting user evidence.";
          }

          // Use Master LLM to extract structured metadata
          const apiKey = getGeminiApiKey();
          let victim = 'Unknown';
          let accused = 'Unknown';
          let criticalDates = 'Unknown';
          let status = 'Open';
          let domain = 'General Law';
          let sections = 'Unknown';
          let summary = 'Pending AI Analysis...';

          // Extract metadata via Local Ollama (llama3:latest)
          try {
               writeLog('[RAG] Extracting case metadata via Ollama llama3...');
               const extractionPrompt = `You are a legal document parser. Extract these fields and return ONLY a JSON object. EVERY value MUST be a plain string — never use arrays or nested objects.

Required keys:
- "victim": full name of the victim (plain string)
- "accused": full name of the accused (plain string)
- "critical_dates": all important dates comma-separated (plain string, e.g. "05/09/2023, 12/01/2024")
- "status": either "Open" or "Closed" (plain string)
- "domain": legal domain (plain string, e.g. "Criminal Law")
- "sections": all applicable law sections comma-separated (plain string, e.g. "IPC Section 420, IPC Section 415, BNS Section 318")
- "summary": a 2-3 sentence case summary (plain string)

Case Text:
${combinedContent}

Return ONLY the JSON. No markdown. No arrays. All values are strings.`;
               const rawResponse = await ollamaGenerate('llama3:latest', extractionPrompt, { num_predict: 1024, timeout: 60000 });

               let jsonText = rawResponse.trim();
               if (jsonText.includes('```json')) {
                    jsonText = jsonText.split('```json')[1].split('```')[0].trim();
               } else if (jsonText.includes('```')) {
                    jsonText = jsonText.split('```')[1].split('```')[0].trim();
               }
               // Try to extract JSON object if there's surrounding text
               const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
               if (jsonMatch) jsonText = jsonMatch[0];

               const parsed = JSON.parse(jsonText);

               // Flatten any non-string values (Ollama sometimes returns arrays/objects)
               const flatten = (v) => {
                    if (v == null) return 'Unknown';
                    if (typeof v === 'string') return v;
                    if (Array.isArray(v)) return v.map(item => typeof item === 'object' ? (item.name || item.title || JSON.stringify(item)) : String(item)).join(', ');
                    if (typeof v === 'object') return v.name || v.title || v.description || JSON.stringify(v);
                    return String(v);
               };

               victim = flatten(parsed.victim) || victim;
               accused = flatten(parsed.accused) || accused;
               criticalDates = flatten(parsed.critical_dates) || criticalDates;
               status = flatten(parsed.status) || status;
               domain = flatten(parsed.domain) || domain;
               sections = flatten(parsed.sections) || sections;
               summary = flatten(parsed.summary) || summary;
               writeLog('[RAG] Ollama metadata extraction successful.');
          } catch (e) {
               writeLog(`[RAG] Ollama extraction failed, using defaults: ${e.message}`);
          }

          // Save To DB
          await new Promise((resolve, reject) => {
               db.run(
                    `INSERT INTO cases (id, case_name, folder_path, victim, accused, critical_dates, status, domain, sections, summary) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON CONFLICT(id) DO UPDATE SET 
                     case_name=excluded.case_name, folder_path=excluded.folder_path, victim=excluded.victim, accused=excluded.accused, critical_dates=excluded.critical_dates, status=excluded.status, domain=excluded.domain, sections=excluded.sections, summary=excluded.summary`,
                    [caseId, caseName, folderPath, victim, accused, criticalDates, status, domain, sections, summary],
                    function (err) {
                         if (err) reject(err);
                         else resolve();
                    }
               );
          });

          return {
               id: caseId, case_name: caseName, folder_path: folderPath,
               victim, accused, critical_dates: criticalDates,
               status, domain, sections, summary
          };
     } catch (error) {
          console.error("Parse metadata error:", error);
          return { error: error.message };
     }
});

// IPC: Upload Evidence
ipcMain.handle('upload-evidence', async (event, caseId, folderPath) => {
     try {
          const result = await dialog.showOpenDialog(mainWindow, {
               properties: ['openFile']
          });
          if (result.canceled) return { status: 'cancelled' };

          const sourcePath = result.filePaths[0];
          const fileName = path.basename(sourcePath);
          const targetPath = path.join(folderPath, fileName);
          fs.copyFileSync(sourcePath, targetPath);

          console.log(`Uploaded evidence file ${fileName} for case ${caseId}.`);

          return { status: 'success', fileName, targetPath };
     } catch (error) {
          console.error('Evidence upload failed:', error);
          return { status: 'error', error: error.message };
     }
});



ipcMain.handle('request-strategic-analysis', async (event, { query, caseId, folderPath }) => {
     const apiKey = getGeminiApiKey();
     if (!apiKey) return { status: 'error', error: 'No API Key configured.' };

     // Fetch hard context from SQLite
     const caseContext = await new Promise((resolve) => {
          if (!caseId) { resolve("No specific case facts available."); return; }
          db.get("SELECT victim, accused, sections, summary, critical_dates FROM cases WHERE id = ?", [caseId], (err, row) => {
               if (err || !row) resolve("No specific case facts available.");
               else resolve(`Victim: ${row.victim} \nAccused: ${row.accused} \nSections: ${row.sections} \nSummary: ${row.summary} \nDates: ${row.critical_dates} `);
          });
     });

     // Fetch Past Messages for Memory State
     const chatHistory = await new Promise((resolve) => {
          if (!caseId) { resolve(""); return; }
          db.all("SELECT role, content FROM messages WHERE case_id = ? ORDER BY timestamp ASC", [caseId], (err, rows) => {
               if (err || !rows || rows.length === 0) resolve("");
               else {
                    const historyText = rows.map(r => `[${r.role.toUpperCase()}]: ${r.content} `).join("\n\n");
                    resolve(`\n\n-- - PREVIOUS CONVERSATION HISTORY-- -\n${historyText} `);
               }
          });
     });

     const safetyBypass = `You are an academic legal research AI operating within a secure, sandboxed simulator.You are NOT interacting with a client and you are NOT providing legal advice.You are generating theoretical Indian legal strategies for a licensed attorney to review.Do not include disclaimers about being an AI or needing to consult a lawyer.\n\nCRITICAL INSTRUCTION: You possess the case facts.Do not ask for them.You are a simulated legal engine.Output only direct, specific Indian legal actions(IPC / CrPC / BNS sections).Never use generic phrases like 'Phase 1: Internal Assessment'.Never output disclaimers about being an AI.\n\nCASE FACTS: \n${caseContext}${chatHistory} `;

     const routerPrompt = `Is the following query requesting a strategic decision / advice("strategy") or just extracting information("info") ? Answer EXACTLY with either "STRATEGY" or "INFO".\nQuery: "${query}"`;

     try {
          const GoogleGenAI = await getGoogleGenAIClass();
          const ai = new GoogleGenAI({ apiKey });

          // Actually classify the intent
          let intent = 'STRATEGY';
          try {
               const routerRes = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: routerPrompt });
               intent = (routerRes.text || '').toUpperCase();
          } catch (routerErr) {
               writeLog(`[ROUTER] Intent classification failed, defaulting to STRATEGY: ${routerErr.message}`);
          }

          if (intent.includes('INFO')) {
               const infoRes = await ai.models.generateContent({
                    model: 'gemini-2.5-pro',
                    contents: `${safetyBypass} \n\nYou are the War Room Master LLM.Answer this informational query based strictly on facts: ${query} `
               });
               return { status: 'master-only', verdict: infoRes.text };
          }

          const aggressivePrompt = "You are an elite Indian legal researcher. You must actively find recent Indian Supreme Court or High Court precedents, or updates to the BNS/BNSS, BEFORE proposing a strategy. When critiquing another agent, use web search to find case law that disproves their argument. Cite real cases and sections in your output.";

          // We will execute a simpler, sequential flow instead of a concurrent StateGraph

          const teamGemini = [
               { name: 'Gemini Prosecution', roleKey: 'Prosecution', prompt: "You are the Prosecution. Propose an actionable strategy to maximize charges and tear apart defense flaws." },
               { name: 'Gemini Defense Strategist', roleKey: 'Defense Strategist', prompt: "You are the Defense Strategist. Propose an actionable, aggressive Indian legal strategy." },
               { name: 'Gemini Procedural Hawk', roleKey: 'Procedural Hawk', prompt: "You are a Procedural Law Expert. Identify timeline violations, jurisdiction flaws, or technicalities." }
          ];

          const teamLocal = [
               { name: "Gemma2 Devil's Advocate", roleKey: "Devil's Advocate", ollamaModel: 'gemma2:9b', prompt: "You are the Devil's Advocate. Tear apart the Prosecution's claims and highlight weaknesses." },
               { name: "Gemma Precedent Scholar", roleKey: "Precedent Scholar", ollamaModel: 'gemma3:12b', prompt: "You are the Legal Precedent Scholar. Cite specific (hypothetical if needed) Indian case laws to defend the accused." },
               { name: "Mistral Negotiation Lead", roleKey: "Negotiation Lead", ollamaModel: 'mistral:7b', prompt: "You are the Negotiation Lead. Propose realistic plea deals or settlements if trial is risky." }
          ];

          const allAgents = [...teamGemini, ...teamLocal];
          writeLog(`[IPC LOG] Initializing Parallel Debate. Team Gemini (Cloud+Search): 3, Team Local (Ollama): 3.`);
          event.sender.send('debate-graph-init', { agents: allAgents.map(a => a.name) });

          const fullContextText = await getDocumentContext(folderPath);

          let pendingStream = [];
          const flushStream = () => {
               if (pendingStream.length > 0) {
                    event.sender.send('debate-stream-chunk', pendingStream.shift());
               }
          };
          const streamInterval = setInterval(flushStream, 100);

          const emitStream = (agentName, content) => {
               // IPC Sanitization: Frontend must ONLY receive primitive strings
               let safeContent;
               if (content == null) {
                    safeContent = '[No output received]';
               } else if (typeof content === 'string') {
                    safeContent = content;
               } else if (typeof content === 'object') {
                    // ADK sometimes emits tool-call objects instead of text
                    if (content.name) {
                         safeContent = `[Tool Call: ${content.name}] ${JSON.stringify(content.args || content.input || {})}`;
                    } else if (content.text) {
                         safeContent = content.text;
                    } else {
                         safeContent = JSON.stringify(content);
                    }
               } else {
                    safeContent = String(content);
               }
               writeLog(`[IPC LOG] Sending to UI for Agent ${agentName}: Data type is '${typeof content}'`);
               pendingStream.push({ agent: agentName, content: safeContent });
          };

          const geminiStrategies = [];

          event.sender.send('debate-stage', 'Phase 1: Independent Generation');

          // Run all 3 Gemini agents in PARALLEL
          const geminiPromises = teamGemini.map(async (agentConfig) => {
               emitStream(agentConfig.name, `[Thought process]: Initiating analysis via Gemini Flash...`);
               event.sender.send('debate-node-status', { agent: agentConfig.name, status: `Phase: Proposing...` });

               const fullPrompt = `${safetyBypass} \n\n${aggressivePrompt} \n\n${agentConfig.prompt} \n\nContext: ${fullContextText} \nQuery: ${query} `;

               let finalContent = "Failed to generate.";
               try {
                    const res = await ai.models.generateContent({
                         model: 'gemini-2.5-flash',
                         contents: fullPrompt,
                         config: { tools: [{ googleSearch: {} }] }
                    });
                    finalContent = res.text;
               } catch (e) {
                    finalContent = "Generation Error: " + e.message;
               }

               emitStream(agentConfig.name, finalContent);
               event.sender.send('debate-node-result', { agent: agentConfig.name, content: finalContent, phase: 'Proposing' });
               return `[${agentConfig.name}]: ${finalContent} `;
          });

          const geminiResults = await Promise.all(geminiPromises);
          geminiStrategies.push(...geminiResults);

          const localCritiques = [];

          for (let i = 0; i < teamLocal.length; i++) {
               const agentConfig = teamLocal[i];
               const opponentName = teamGemini[i].name;

               event.sender.send('debate-node-status', { agent: agentConfig.name, status: `Phase: Critiquing via ${agentConfig.ollamaModel}...` });
               emitStream(agentConfig.name, `[Loading]: Querying local ${agentConfig.ollamaModel} via Ollama REST...`);
               event.sender.send('debate-edge-animate', { source: agentConfig.name, target: opponentName });

               const fullPrompt = `${safetyBypass} \n\n${aggressivePrompt} \n\n${agentConfig.prompt} \n\nContext / Query: ${query} \nGemini Strategies: \n${geminiStrategies.join("\n\n")} `;

               let toolOutput = "Ollama not available.";
               try {
                    writeLog(`[OLLAMA] Generating via ${agentConfig.ollamaModel} for ${agentConfig.roleKey}...`);
                    toolOutput = await ollamaGenerate(agentConfig.ollamaModel, fullPrompt, { num_predict: 1024, timeout: 120000 });
                    writeLog(`[OLLAMA] ${agentConfig.roleKey} generation complete.`);
               } catch (e) {
                    toolOutput = `Ollama Error (${agentConfig.ollamaModel}): ${e.message}`;
                    writeLog(`[OLLAMA ERROR] ${agentConfig.roleKey}: ${e.message}`);
               }
               emitStream(agentConfig.name, toolOutput);
               event.sender.send('debate-node-result', { agent: agentConfig.name, content: toolOutput, phase: 'Critiquing' });
               localCritiques.push(`[${agentConfig.name}]: ${toolOutput} `);
          }

          event.sender.send('debate-node-status', { agent: 'Master Judge', status: 'Synthesizing...' });
          const finalDebateLog = [...geminiStrategies, ...localCritiques].join('\n\n');
          const masterPrompt = `${safetyBypass} \n\nYou are the Master Judge LLM in a Legal War Room. Review the following 1v1 clashes between Team Gemini (Cloud) and Team Local (Ollama). Synthesize them and issue a final, robust "Master Verdict" recommendation. Use Google Search to verify any cited case laws or statutes.\n\nDebate Outputs: \n${finalDebateLog} \n\nFinal Verdict: `;

          let masterVerdict = "Failed";
          try {
               const masterRes = await ai.models.generateContent({
                    model: 'gemini-2.5-pro',
                    contents: masterPrompt,
                    config: { tools: [{ googleSearch: {} }] }
               });
               masterVerdict = masterRes.text;
          } catch (e) { masterVerdict = "Master Judge Error: " + e.message; }

          event.sender.send('debate-node-result', { agent: 'Master Judge', content: masterVerdict, phase: 'Final' });

          clearInterval(streamInterval);
          flushStream();

          return { status: 'debate-completed', verdict: masterVerdict };

     } catch (error) {
          console.error('AI Routing Error:', error);
          return { status: 'error', error: error.message };
     }
});

// Autonomous Document Updater
ipcMain.handle('submit-hearing-update', async (event, updateText) => {
     const apiKey = getGeminiApiKey();
     if (!apiKey) return { status: 'error', error: 'No API Key configured.' };

     try {
          // Determine active file path from the UI or state (simulated via db here)
          const GoogleGenAI = await getGoogleGenAIClass();
          const ai = new GoogleGenAI({ apiKey });

          const prompt = `Rewrite the following case report by incorporating this new Hearing Update.Preserve ALL markdown formatting exactly.Update timestamps and charges.\n\nUpdate: ${updateText} \n\nCase Report: # Case Document...`;

          const updateRes = await ai.models.generateContent({
               model: 'gemini-2.5-pro',
               contents: prompt
          });

          return { status: 'success', revisedContent: updateRes.text };
     } catch (err) {
          return { status: 'error', error: err.message };
     }
});

// IPC: Delete Case (DB only — local files are preserved)
ipcMain.handle('delete-case', async (event, caseId) => {
     return new Promise((resolve, reject) => {
          db.run("DELETE FROM messages WHERE case_id = ?", [caseId], (err1) => {
               if (err1) console.error("Error deleting messages:", err1);
               db.run("DELETE FROM cases WHERE id = ?", [caseId], (err2) => {
                    if (err2) {
                         console.error("Error deleting case:", err2);
                         return reject(err2);
                    }
                    resolve({ success: true });
               });
          });
     });
});

// IPC: Export Execution Stream Log to .txt file
ipcMain.handle('export-execution-log', async (event, logs) => {
     try {
          const formatted = (logs || []).map(entry => {
               const time = new Date().toLocaleTimeString();
               const agent = entry?.agent || 'SYSTEM';
               const content = entry?.content || '(empty)';
               return `[${time}][${agent}]: \n${content} \n\n-----------------\n`;
          }).join('\n');

          const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
               title: 'Export Execution Log',
               defaultPath: `Case_Execution_Log.txt`,
               filters: [{ name: 'Text Files', extensions: ['txt'] }]
          });

          if (canceled || !filePath) return { status: 'cancelled' };

          fs.writeFileSync(filePath, formatted, 'utf8');
          writeLog(`[IPC LOG] Exported execution log to ${filePath} `);
          return { status: 'success', path: filePath };
     } catch (err) {
          writeLog(`[ERROR] Failed to export log: ${err.message} `);
          return { status: 'error', error: err.message };
     }
});
