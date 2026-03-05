# Legal War Room — System Architecture

> **Hybrid AI Architecture**: Electron + React (Frontend) · Node.js Orchestrator (Backend) · Ollama REST (Local LLMs) · Google Gemini + Web Search (Cloud LLMs)

---

## 1. Architecture Overview

The **Legal War Room** is a multi-agent adversarial debate platform. A cloud Gemini team and a local Ollama team cross-critique each other's legal strategies over real FIR documents. A Master Judge (Gemini Pro + Web Search) synthesizes the debate into a final verdict.

### Component Breakdown

| Layer | Technology | Role |
|-------|-----------|------|
| **Frontend** | React + Electron + React Flow | Split-screen UI, live graph, throttled IPC stream |
| **Orchestrator** | Node.js (`electron/main.cjs`) | IPC handler, intent router, agent coordinator |
| **Cloud Team** | Google Gemini (`@google/genai`) | 3 Flash agents + Master Judge (Pro), all with Google Search |
| **Local Team** | Ollama REST (`localhost:11434`) | 3 local models via `ollama_helper.cjs` |
| **RAG Extraction** | Ollama `llama3:latest` | Parses FIR documents into structured JSON metadata |
| **Data Layer** | SQLite | Persistent chat history and case metadata |

---

## 2. Agent Lineup

| Agent | Model | Location | Web Search |
|-------|-------|----------|-----------|
| Ollama RAG | `llama3:latest` | Local | ❌ |
| Gemini Prosecution | `gemini-2.5-flash` | Cloud | ✅ |
| Gemini Defense Strategist | `gemini-2.5-flash` | Cloud | ✅ |
| Gemini Procedural Hawk | `gemini-2.5-flash` | Cloud | ✅ |
| Gemma2 Devil's Advocate | `gemma2:9b` | Local | ❌ |
| Gemma Precedent Scholar | `gemma3:12b` | Local | ❌ |
| Mistral Negotiation Lead | `mistral:7b` | Local | ❌ |
| **Master Judge** | `gemini-2.5-pro` | Cloud | ✅ |

---

## 3. Data Flow

```mermaid
graph TD
    User["User Input"] --> ReactUI["React UI (Electron Renderer)"]
    ReactUI --> IPC["Electron IPC Bridge"]

    IPC --> Router["Intent Router (gemini-2.5-flash)"]
    Router -- "INFO query" --> MasterDirect["Master Judge (Direct Answer)"]
    Router -- "STRATEGY query" --> Debate["Multi-Agent Debate"]

    Debate --> RAG["RAG Phase\nOllama llama3:latest\n(Document extraction)"]
    RAG --> P1["Phase 1 — Parallel Generation"]

    P1 --> G1["Gemini Prosecution 🔍"]
    P1 --> G2["Gemini Defense 🔍"]
    P1 --> G3["Gemini Procedural Hawk 🔍"]

    G1 --> P2["Phase 2 — Sequential Local Critique"]
    G2 --> P2
    G3 --> P2

    P2 --> L1["Gemma2 Devil's Advocate\n(gemma2:9b)"]
    P2 --> L2["Gemma Precedent Scholar\n(gemma3:12b)"]
    P2 --> L3["Mistral Negotiation Lead\n(mistral:7b)"]

    L1 --> Judge["Master Judge\ngemini-2.5-pro 🔍"]
    L2 --> Judge
    L3 --> Judge
    G1 --> Judge
    G2 --> Judge
    G3 --> Judge

    Judge --> Verdict["Final Verdict → SQLite + UI"]
```

---

## 4. Execution Sequence

```mermaid
sequenceDiagram
    participant User
    participant IPC as Electron IPC
    participant Router as Intent Router
    participant RAG as Ollama RAG (llama3)
    participant GCloud as Gemini Cloud Team (x3, parallel)
    participant OLocal as Ollama Local Team (x3, sequential)
    participant Judge as Master Judge (gemini-pro)

    User->>IPC: Submit query
    IPC->>Router: Classify: INFO or STRATEGY?

    alt INFO query
        Router->>Judge: Direct answer (no debate)
    else STRATEGY query
        IPC->>RAG: Extract metadata from FIR documents
        RAG-->>IPC: { victim, accused, sections, summary, dates }

        par Phase 1 — All 3 Gemini agents fire simultaneously
            IPC->>GCloud: Prosecution strategy (Flash + WebSearch)
            IPC->>GCloud: Defense strategy (Flash + WebSearch)
            IPC->>GCloud: Procedural analysis (Flash + WebSearch)
        end

        Note over OLocal: Phase 2 — Each local agent critiques its Gemini counterpart
        IPC->>OLocal: Devil's Advocate → gemma2:9b
        IPC->>OLocal: Precedent Scholar → gemma3:12b
        IPC->>OLocal: Negotiation Lead → mistral:7b

        Note over Judge: Phase 3 — Synthesis
        GCloud-->>Judge: All strategies
        OLocal-->>Judge: All critiques
        Judge->>Judge: Synthesize Master Verdict (Pro + WebSearch)
        Judge-->>IPC: Final Verdict
    end

    IPC-->>User: Stream results to React UI
```

---

## 5. Key File Reference

| File | Purpose |
|------|---------|
| `electron/main.cjs` | Main orchestrator — IPC handlers, agent runners, DB ops |
| `electron/ollama_helper.cjs` | Reusable Ollama REST client (native `http`, no deps) |
| `src/components/DebateArena/DebateArena.jsx` | Persistent React Flow graph with live status indicators |
| `src/components/ChatPanel/ChatPanel.jsx` | Chat UI with markdown rendering |
| `src/components/Sidebar/Sidebar.jsx` | Case history list |
| `src/index.css` | Global styles including `.markdown-body` typography |
| `.env` | `GEMINI_API_KEY` |

---

## 6. Critical Design Decisions

### ESM/CJS Compatibility
`@google/genai` is an ESM-only package. Since `main.cjs` runs in CommonJS mode, it uses a lazy dynamic `import()` wrapper instead of `require()`:
```js
async function getGoogleGenAIClass() {
    if (!_GoogleGenAI) {
        const mod = await import('@google/genai');
        _GoogleGenAI = mod.GoogleGenAI;
    }
    return _GoogleGenAI;
}
```

### IPC Sanitization
All data sent from Electron main → renderer is checked for object types before transmission to prevent React crashes (`Objects are not valid as a React child`). A universal `flatten()` helper ensures all Ollama outputs are strings before any DB save or IPC send.

### Parallel vs Sequential
- **Gemini agents** run in **parallel** via `Promise.all` (fastest path)
- **Local Ollama agents** run **sequentially** (single GPU, shared VRAM — avoids OOM)

### Google Search Integration
All Gemini agents receive `config: { tools: [{ googleSearch: {} }] }` so they autonomously retrieve real Indian case law and statutes during reasoning.

---

## 7. Environment Setup

```bash
# 1. Ensure Ollama is running
ollama serve

# 2. Required Ollama models
ollama pull llama3
ollama pull gemma2:9b
ollama pull gemma3:12b
ollama pull mistral:7b

# 3. Set API key
echo "GEMINI_API_KEY=your_key" > .env

# 4. Install dependencies
npm install

# 5. Start app
npm start
```
