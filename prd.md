# Product Requirements Document: Local Legal War Room

## 1. Overview
An autonomous, secure Electron-based desktop application that acts as a legal strategy "War Room." It allows users to manage legal cases, analyze evidence, and generate strategic recommendations using a multi-agent AI system.

## 2. Core Features
* **Conversational Interface & Welcome Screen:** A ChatGPT-style persistent chat interface with a minimalist landing page for accessing past cases or creating new ones.
* **Chat Persistence:** Local SQLite database integration (`chat_sessions`, `messages`) to store and retrieve past user-LLM conversations across sessions.
* **Case Initialization:** Automatically parses `.md` Case Analysis Reports upon loading, extracting core details (Victim, Accused, Sections, Case Facts) to pin to the UI.
* **Dynamic Evidence Uploading:** A UI feature to open native file pickers, copy evidence files into the active case directory, and autonomously trigger the local Vector DB to ingest/embed them into the RAG system.
* **Smart AI Routing & Master LLM:** Basic questions are handled directly by a Master LLM (Gemini 3.1 Pro) in a conversational format. Strategic/critical decisions trigger a Multi-Agent Debate.
* **Multi-Agent Debate Visualization:** Parallel sub-agents (Gemini 3.1 Flash) debate the best legal strategy within a dedicated visual panel, critiquing each other's suggestions.