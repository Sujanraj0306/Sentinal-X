# Design Specifications: Legal War Room

## 1. Theme & Typography
* **Strict Black-and-White Legal Theme:** The app must use a minimalist, high-contrast monochrome palette. Backgrounds are white or very light gray; text is black; borders are dark gray. NO vibrant colors. 
* **Typography:** Use a formal Serif font (e.g., Merriweather, Georgia) for the Case Document Viewer to mimic legal paperwork. Use a clean Sans-Serif font (e.g., Inter, Roboto) for UI controls, buttons, and the debate log.

## 2. Layout Structure & Features
* **Welcome Screen:** A minimalist landing page displaying only a friendly greeting, a prominent "Create Case" button, and a list of recently accessed case shortcuts.
* **Left Sidebar (Case & History):**
    * A ChatGPT-style layout with a persistent "Create Case" button at the top (triggers native OS folder selection).
    * A scrollable list of past cases/chats populated from the local SQLite database. Selecting a case restores its chat history.
* **Center Panel (Main Chat Interface):**
    * **Pinned Header:** Extracted metadata from the active case `.md` file, displaying Victim, Accused, Sections, and Summary.
    * **Chat Interface:** A back-and-forth conversational view with the Master LLM.
    * **Input Area:** Text area for queries. Includes an "Upload Evidence" button that opens a file picker, copies the file to the active case folder, and tells the Vector DB to ingest it.
* **Right Panel (Debate Arena):** * A dedicated space to visualize the parallel `gemini-3.1-flash` agents debating strategic decisions when triggered by the Center Panel.