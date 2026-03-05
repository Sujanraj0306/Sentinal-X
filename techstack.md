# Technology Stack

## 1. Frontend
* **Framework:** Electron (desktop shell), React (UI), Vite (bundler).
* **Styling:** Tailwind CSS.
* **Components:** React Markdown (for `.md` rendering).

## 2. Backend & AI Orchestration
* **Environment:** Node.js.
* **AI Framework:** Google Agent Development Kit (ADK).
* **Models:** Gemini 3.1 Pro (Master Judge/Router), Gemini 3.1 Flash (Sub-Agent Debaters) using a single API key.
* **Communication:** WebSockets or Server-Sent Events (SSE) for streaming the live debate to the UI.

## 3. Data & Storage
* **Vector DB:** Local SQLite with pgvector (encrypted at rest) or local ChromaDB.
* **File Handling:** Custom Local File System Model Context Protocol (MCP) server.