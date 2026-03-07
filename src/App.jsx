import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import ChatPanel from './components/ChatPanel/ChatPanel';
import DebateArena from './components/DebateArena/DebateArena';
import WelcomeScreen from './components/WelcomeScreen/WelcomeScreen';
import CreateCaseModal from './components/CreateCaseModal/CreateCaseModal';
import Module1App from './module1/Module1App';
import ErrorBoundary from './components/ErrorBoundary';
import LLMSearchApp from '../The_legal_llm_search/thellmsearch/src/App';

function App() {
  const [cases, setCases] = useState([]);
  const [activeCase, setActiveCase] = useState(null);
  const [currentView, setCurrentView] = useState('war-room'); // 'war-room' or 'llm-search'

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [pendingFolder, setPendingFolder] = useState(null);
  const [ssdDisconnected, setSsdDisconnected] = useState(false);

  const refreshCases = async () => {
    if (window.electronAPI) {
      try {
        const loadedCases = await window.electronAPI.getCases();
        setCases(loadedCases || []);
      } catch (e) {
        console.error("Failed to load cases", e);
      }
    }
  };

  // Load cases on boot
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshCases();

    // Listen for External SSD Disconnection
    if (window.electronAPI && window.electronAPI.onExternalDriveDisconnected) {
      window.electronAPI.onExternalDriveDisconnected(() => {
        setSsdDisconnected(true);
      });
    }
  }, []);

  const handleCreateCaseRequest = () => {
    setIsUploadModalOpen(true);
  };

  const handleModalConfirm = async (caseName, folderPathOverride = null) => {
    setShowModal(false);

    const activeFolder = folderPathOverride || pendingFolder;

    // We immediately create an "optimistic" or "loading" case so the UI switches to ChatPanel immediately
    const tempCase = {
      id: `case-${Date.now()}`,
      case_name: caseName,
      folder_path: activeFolder,
      victim: '',
      accused: '',
      sections: '',
      summary: '',
      critical_dates: '',
      status: '',
      domain: '',
      isParsing: true // Custom UI flag
    };
    setCases(prev => [tempCase, ...prev]); // Add temp case to list
    setActiveCase(tempCase);

    if (window.electronAPI) {
      try {
        const newCase = await window.electronAPI.parseCaseMetadata({
          caseId: tempCase.id,
          folderPath: activeFolder,
          caseName: caseName
        });

        if (newCase && !newCase.error) {
          await refreshCases(); // Refresh to get the fully parsed case
          setActiveCase(newCase);
        } else {
          alert(`Error formatting case metadata: ${newCase?.error || 'Validation Failed'}`);
          // If there's an error, remove the temp case and set activeCase to null
          setCases(prev => prev.filter(c => c.id !== tempCase.id));
          setActiveCase(null);
        }
      } catch (error) {
        console.error('Extraction failed:', error);
        // If there's an error, remove the temp case and set activeCase to null
        setCases(prev => prev.filter(c => c.id !== tempCase.id));
        setActiveCase(null);
      }
    } else {
      // Mock Complete Extraction Output
      setTimeout(() => {
        const mockExtracted = {
          ...tempCase,
          victim: 'Mock Victim',
          accused: 'Mock Accused',
          sections: '123 IPC',
          summary: 'Mock Summary generated.',
          critical_dates: 'Jan 1, 2026',
          status: 'Active',
          domain: 'RAG MOCK',
          isParsing: false
        };
        setCases(prev => prev.map(c => c.id === tempCase.id ? mockExtracted : c));
        setActiveCase(mockExtracted);
      }, 3000);
    }

    setPendingFolder(null);
  };

  const handleModalCancel = () => {
    setShowModal(false);
    setPendingFolder(null);
  };

  const handleSelectCase = (c) => {
    setActiveCase(c);
  };

  const triggerDebateVisuals = () => {
    // This is passed to ChatPanel to inform App that a strategy was requested.
    // DebateArena automatically listens to 'debate-stream-chunk' via IPC,
    // so it handles its own internal state, but we might want to track it if App needs to react.
    // e.g. console.log('Debate verdict:', verdict);
  };

  const handleDeleteCase = async (caseToDelete) => {
    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.deleteCase(caseToDelete.id);
        if (res?.success || !res?.error) {
          setCases(prev => prev.filter(c => c.id !== caseToDelete.id));
          if (activeCase?.id === caseToDelete.id) {
            setActiveCase(null);
          }
        }
      } catch (err) {
        console.error("Failed to delete case:", err);
        alert("Delete failed: " + err.message);
      }
    } else {
      setCases(prev => prev.filter(c => c.id !== caseToDelete.id));
      if (activeCase?.id === caseToDelete.id) setActiveCase(null);
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-full bg-white text-black overflow-hidden font-sans">

        {/* External SSD Disconnected Alert */}
        {ssdDisconnected && (
          <div className="absolute inset-0 z-[99999] flex flex-col items-center justify-center bg-black bg-opacity-90 text-white p-8">
            <div className="border-4 border-red-600 p-8 max-w-xl text-center shadow-[16px_16px_0px_0px_rgba(220,38,38,1)] bg-black animate-pulse">
              <svg className="w-16 h-16 text-red-600 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              <h1 className="text-3xl font-bold uppercase tracking-widest text-red-600 mb-4">External AI Drive Disconnected</h1>
              <p className="font-mono text-gray-300 text-sm leading-relaxed mb-8">
                The Python Engine lost access to the external SSD mapped in your .env file.
                Massive Opposing models cannot load. Please plug in the SSD and restart the application immediately.
              </p>
              <button
                onClick={() => setSsdDisconnected(false)}
                className="px-6 py-3 border-2 border-red-600 text-red-600 font-bold uppercase tracking-widest text-xs hover:bg-red-600 hover:text-black transition-all"
              >
                Dismiss Warning
              </button>
            </div>
          </div>
        )}

        {/* 3-Pane ChatGPT Style Layout */}

        {/* Left Pane: Sidebar */}
        <div className="w-64 flex-shrink-0 border-r-2 border-black flex flex-col hidden md:flex">
          <Sidebar
            cases={cases}
            activeCase={activeCase}
            onSelectCase={handleSelectCase}
            onCreateCase={handleCreateCaseRequest}
            onDeleteCase={handleDeleteCase}
            currentView={currentView}
            setCurrentView={setCurrentView}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden relative">

          {/* New Module 1 Overlay (Fully imported UI) */}
          {isUploadModalOpen && (
            <div className="fixed inset-0 z-50 bg-white grid overflow-y-auto">
              <Module1App
                onClose={() => setIsUploadModalOpen(false)}
                onComplete={async (caseTitle, folderPath) => {
                  setIsUploadModalOpen(false);
                  await handleModalConfirm(caseTitle, folderPath);
                }}
              />
            </div>
          )}

          {/* Modal Overlay Layer */}
          {showModal && (
            <CreateCaseModal
              folderPath={pendingFolder}
              onConfirm={handleModalConfirm}
              onCancel={handleModalCancel}
            />
          )}

          {/* Conditional View Rendering */}
          {currentView === 'llm-search' ? (
            <div className="flex-1 h-full w-full overflow-hidden bg-[#131314]">
              <LLMSearchApp setCurrentView={setCurrentView} />
            </div>
          ) : (
            <>
              {!activeCase && !showModal ? (
                // Welcome Screen state
                <div className="flex-1 h-full w-full">
                  <WelcomeScreen
                    cases={cases}
                    onSelectCase={handleSelectCase}
                    onCreateCase={handleCreateCaseRequest}
                  />
                </div>
              ) : (
                // Active Chat Interface (2 panes)
                <>
                  {/* Center Pane: Chat & Evidence */}
                  <div className="flex-1 border-r-2 border-gray-200 h-full">
                    <ChatPanel
                      activeCase={activeCase}
                      onStrategyRequested={triggerDebateVisuals}
                    />
                  </div>

                  {/* Right Pane: War Arena Visualizer */}
                  <div className="w-1/3 min-w-[300px] h-full bg-gray-50">
                    <DebateArena activeCase={activeCase} />
                  </div>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
