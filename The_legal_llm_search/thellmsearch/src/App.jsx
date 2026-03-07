import React, { useState } from "react";
import { ThemeProvider, createTheme, Box } from "@mui/material";
// Router removed to prevent nested context hook crashes in the main War Room App
import Header from "./components/Header";
import SideMenu from "./components/SideMenu";
import WebsiteSetup from "./components/WebsiteSetup";
import Chat from "./components/Chat";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#131314",
      paper: "#1e1f20",
    },
    text: {
      primary: "#e8eaed",
      secondary: "#bdc1c6",
    },
  },
  typography: {
    fontFamily: "Google Sans, Arial, sans-serif",
  },
});

export default function App({ setCurrentView }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <ThemeProvider theme={darkTheme}>
      <Box
        sx={{
          bgcolor: "background.default",
          color: "text.primary",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Google Sans, Arial, sans-serif",
        }}
      >
        <Header />
        {setCurrentView && (
          <Box sx={{ position: 'absolute', top: 12, left: 16, zIndex: 99999 }}>
            <button
              onClick={() => setCurrentView('war-room')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc2626',
                color: '#fff',
                border: '2px solid #000',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: "'Inter', sans-serif"
              }}
            >
              ← Back to War Room
            </button>
          </Box>
        )}
        <Box sx={{ display: "flex", flexGrow: 1, position: 'relative' }}>
          <SideMenu isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
          <Box
            sx={{
              flexGrow: 1,
              transition: "margin-left 0.25s ease-in-out",
              ml: { md: isExpanded ? "60px" : "68px" },
              p: 2,
            }}
          >
            <WebsiteSetup />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
