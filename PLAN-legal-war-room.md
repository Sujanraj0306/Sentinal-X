# Legal War Room Project Plan

## Overview
An autonomous, secure Electron-based desktop application acting as a legal strategy "War Room". It allows case management, local document analysis, and strategic recommendations using a multi-agent AI system (Gemini 3.1 Pro/Flash) with real-time debate visualization.

## Project Type
**DESKTOP (Electron + Web UI)** 
Primary Agents: `frontend-specialist`, `backend-specialist`, `security-auditor`

## Success Criteria
1. Desktop application launches natively via `npm start`.
2. Displays a strict black-and-white, 4-panel UI (Sidebar, Document Viewer, Debate Arena, Action Bar) with specified typography.
3. React UI is isolated; all LLM and vector DB logic runs securely in the Electron main process via IPC.
4. API keys and Vector DB keys are securely managed via Electron's `safeStorage`.

## Tech Stack
- **Desktop Shell**: Electron
- **Frontend**: React, Vite, Tailwind CSS (Strict Monochrome)
- **Backend/Main Process**: Node.js, Google Agent Development Kit (ADK)
- **AI Models**: Gemini 3.1 Pro (Master), Gemini 3.1 Flash (Debaters)
- **Vector DB**: Local SQLite + pgvector (or ChromaDB), encrypted at rest (safeStorage key)
- **Messaging**: IPC for localized Backend-to-Frontend events.

## File Structure
```text
.
├── electron/
│   ├── main.js        (Backend, AI Orchestration, DB connection, safeStorage)
│   ├── preload.js     (Context isolation bridge)
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── Sidebar/
│   │   ├── DocumentViewer/
│   │   ├── DebateArena/
│   │   └── ActionBar/
│   ├── App.jsx        (Main 4-panel layout)
│   ├── main.jsx
│   └── index.css      (Tailwind setup, strict monochrome theme)
├── public/
├── index.html
├── package.json
├── vite.config.js
└── .env               (Dev API keys - ignored in git)
```

## Task Breakdown

### Phase 1: Foundation & Security
- **Task ID**: `FND-1`
- **Name**: Initialize Vite + React + Electron setup
- **Agent**: `backend-specialist`
- **Skills**: nodejs-best-practices
- **Action**: Setup Vite React app, add Electron dependencies, configure `vite.config.js` and `electron/main.js` with IPC and contextIsolation. 
- **INPUT→OUTPUT→VERIFY**: Input: empty dir → Output: initialized project → Verify: `npm run dev` opens native window.

- **Task ID**: `FND-2`
- **Name**: Implement Security Measures (safeStorage & IPC)
- **Agent**: `security-auditor`
- **Skills**: clean-code
- **Action**: Configure `safeStorage` in `main.js` for API keys and DB encryption keys. Setup IPC handlers.
- **INPUT→OUTPUT→VERIFY**: Input: main.js → Output: Secure key storage → Verify: Keys are stored and retrieved successfully via safeStorage.

### Phase 2: User Interface Implementation
- **Task ID**: `UI-1`
- **Name**: Global Styling & Layout Architecture
- **Agent**: `frontend-specialist`
- **Skills**: tailwind-patterns, frontend-design
- **Action**: Implement Tailwind v4 config, define strict black/white theme, setup main 4-panel Grid layout (Sidebar, Center, Right, Bottom).
- **INPUT→OUTPUT→VERIFY**: Input: React app → Output: Skeleton layout → Verify: Layout reflects 4 panels correctly.

- **Task ID**: `UI-2`
- **Name**: Build Core Components
- **Agent**: `frontend-specialist`
- **Skills**: react-best-practices
- **Action**: Build `Sidebar`, `DocumentViewer` (React Markdown), `DebateArena` (visually differentiating parallel agents with stacked chat logs and agent labels), and `ActionBar` (with dedicated, bolded "Master Verdict" UI area). Use proper typography (Serif for docs, Sans-serif for UI).
- **INPUT→OUTPUT→VERIFY**: Input: Empty layout → Output: Filled components → Verify: Visual fidelity strictly adheres to monochrome legal theme and differentiates the 3 parallel agents dynamically.

### Phase 3: AI & Database Integration
- **Task ID**: `AI-1`
- **Name**: Integrate Local Vector DB
- **Agent**: `backend-specialist`
- **Skills**: database-design
- **Action**: Set up local SQLite/pgvector, encrypt with OS Keychain via `safeStorage`, build document ingestion pipeline.
- **INPUT→OUTPUT→VERIFY**: Input: local .md file → Output: Vector embeddings inside DB → Verify: Data is queryable and encrypted at rest.

- **Task ID**: `AI-2`
- **Name**: Build Debate Engine Orchestration (Smart Router)
- **Agent**: `backend-specialist`
- **Skills**: api-patterns
- **Action**: Integrate Google ADK in `main.js`. Implement Smart Router: informational queries go to Master LLM. Strategic queries trigger Debate Engine (3 parallel Flash agents: Defense Strategist, Procedural Critic, Devil's Advocate) which query DB, propose, and critique. Funnel parallel outputs to SequentialAgent (Master LLM) for final verdict. Stream all via IPC.
- **INPUT→OUTPUT→VERIFY**: Input: Strategic User prompt → Output: Streamed parallel debate & master verdict → Verify: UI updates in real-time, showing all 3 agents and final verdict via IPC.

- **Task ID**: `AI-3`
- **Name**: Autonomous Document Updater
- **Agent**: `backend-specialist`
- **Skills**: nodejs-best-practices
- **Action**: Build local file system handler in `main.js`. On "Hearing Update" input, Master LLM autonomously rewrites local `.md` Case Analysis Report (appending timestamp, updating facts, adjusting charges) while preserving Markdown formatting.
- **INPUT→OUTPUT→VERIFY**: Input: Hearing Update → Output: Modified `.md` file → Verify: Markdown formatting perfectly preserved with new timestamped content.

## Phase X: Verification
- [ ] Lint: `npm run lint` & Type checks
- [ ] Security: Verify `safeStorage` usage and `contextIsolation: true`
- [ ] Build: `npm run build` & package Electron app
- [ ] Runtime: Run `verify_all.py` (if applicable) and manual visual audit of "No Purple/Color" rule.
