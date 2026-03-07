import React, { useState, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Button,
  TextField,
  Chip,
  Grow,
  Fade,
  Divider,
} from "@mui/material";
import { Language as LanguageIcon } from "@mui/icons-material";

const initialWebsites = [
  { id: 1, name: "google.com" },
  { id: 2, name: "youtube.com" },
  { id: 3, name: "wikipedia.org" },
  { id: 4, name: "reddit.com" },
  { id: 5, name: "stackoverflow.com" },
  { id: 6, name: "github.com" },
  { id: 7, name: "medium.com" },
  { id: 8, name: "nytimes.com" },
  { id: 9, name: "bbc.com" },
  { id: 10, name: "cnn.com" },
  { id: 11, name: "amazon.com" },
  { id: 12, name: "ebay.com" },
  { id: 13, name: "walmart.com" },
];

const Favicon = ({ domain }) => {
  const [error, setError] = useState(false);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  return error ? (
    <LanguageIcon fontSize="small" sx={{ color: "#9e9e9e" }} />
  ) : (
    <img
      src={faviconUrl}
      alt={domain}
      width={20}
      height={20}
      style={{ borderRadius: "4px", paddingLeft: "5px" }}
      onError={() => setError(true)}
    />
  );
};

const WebsiteSetup = ({ onStart }) => {
  const [available, setAvailable] = useState(initialWebsites);
  const [selected, setSelected] = useState(initialWebsites.slice(0, 3));
  const [newSite, setNewSite] = useState("");
  const [longPressedId, setLongPressedId] = useState(null);

  const pressTimer = useRef(null);

  const toggleWebsite = (site) => {
    if (selected.find((s) => s.name === site.name)) {
      setSelected(selected.filter((s) => s.name !== site.name));
    } else {
      setSelected([...selected, site]);
    }
  };

  const handleAdd = () => {
    if (!newSite.trim()) return;
    const site = { id: Date.now(), name: newSite.trim() };
    setSelected([...selected, site]);
    setAvailable([...available, site]);
    setNewSite("");
  };

  const handleMouseDown = (id) => {
    pressTimer.current = setTimeout(() => {
      setLongPressedId(id);
    }, 600);
  };

  const handleMouseUp = () => {
    clearTimeout(pressTimer.current);
  };

  const handleDeleteAvailable = (id) => {
    setAvailable((prev) => prev.filter((site) => site.id !== id));
    setSelected((prev) => prev.filter((site) => site.id !== id));
    if (longPressedId === id) setLongPressedId(null);
  };

  return (
    <Box
      sx={{
        display: "flex",
        height: "80vh",
        p: 4,
        gap: 4,
        background: "linear-gradient(145deg, #000, #1c1c1c)",
      }}
    >
      {/* LEFT SIDE */}
      <Paper
        elevation={6}
        sx={{
          flex: 1.2,
          p: 3,
          borderRadius: "16px",
          backgroundColor: "#111",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 500, color: "#f5f5f5" }}>
          Selected Websites
        </Typography>
                <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            mb: 3,
            minHeight: "58px",
            maxHeight: 250,        // limit height
            overflowY: "auto",     // enable scroll
            p: 1,
            border: "1px solid #444",
            borderRadius: 2,
          }}
        >
          {selected.map((site) => (
            <Grow in key={site.id}>
              <Chip
                icon={<Favicon domain={site.name} />}
                label={site.name}
                onDelete={() => toggleWebsite(site)}
                sx={{
                  background: "#333",
                  color: "#f5f5f5",
                  fontWeight: 500,
                  "&:hover": { background: "#444" },
                  transition: "all 0.2s ease",
                }}
              />
            </Grow>
          ))}
        </Box>


        <Divider sx={{ mb: 2, backgroundColor: "#555" }} />

        <Typography variant="h6" sx={{ mb: 1, fontWeight: 500, color: "#f5f5f5" }}>
          Available Websites
        </Typography>
        <Paper
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            p: 1,
            borderRadius: "12px",
            backgroundColor: "#1c1c1c",
          }}
        >
          <List dense>
            {available.map((site) => {
              const isExpanded = longPressedId === site.id;
              return (
                <Fade in key={site.id}>
                  <ListItem disablePadding sx={{ mb: 1 }}>
                    <ListItemButton
                      onClick={() => toggleWebsite(site)}
                      onMouseDown={() => handleMouseDown(site.id)}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      sx={{
                        borderRadius: "8px",
                        minHeight: isExpanded ? 72 : 48,
                        backgroundColor: selected.find((s) => s.name === site.name)
                          ? "rgba(255,255,255,0.12)"
                          : "transparent",
                        "&:hover": { backgroundColor: "rgba(255,255,255,0.08)" },
                        transition: "all 0.2s ease",
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Favicon domain={site.name} />
                      </ListItemIcon>
                      <ListItemText
                        primary={site.name}
                        primaryTypographyProps={{
                          color: "#f5f5f5",
                          fontWeight: selected.find((s) => s.name === site.name)
                            ? 600
                            : 400,
                        }}
                      />
                      <Checkbox
                        edge="end"
                        checked={!!selected.find((s) => s.name === site.name)}
                        sx={{ color: "#f5f5f5" }}
                      />
                      {isExpanded && (
                        <Button
                          size="small"
                          color="error"
                          sx={{ ml: 2 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAvailable(site.id);
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </ListItemButton>
                  </ListItem>
                </Fade>
              );
            })}
          </List>
        </Paper>

        {/* Start Conversation */}
        <Button
          variant="contained"
          sx={{
            mt: 3,
            borderRadius: "12px",
            py: 1.2,
            fontWeight: 600,
            background: "#fff",
            color: "#000",
            "&:hover": { background: "#e0e0e0" },
          }}
          disabled={selected.length === 0}
          onClick={() => onStart(selected)}
        >
          Start Conversation
        </Button>
      </Paper>

      {/* RIGHT SIDE */}
      <Paper
        elevation={6}
        sx={{
          flex: 0.8,
          p: 3,
          borderRadius: "16px",
          backgroundColor: "#111",
          height: "fit-content",
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 500, color: "#f5f5f5" }}>
          Add New Website
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            fullWidth
            placeholder="Enter website domain (e.g. example.com)"
            value={newSite}
            onChange={(e) => setNewSite(e.target.value)}
            sx={{
              input: { color: "#f5f5f5" },
              backgroundColor: "#1c1c1c",
              borderRadius: "12px",
              "& fieldset": { border: "none" },
            }}
          />
          <Button
            variant="outlined"
            sx={{
              borderRadius: "12px",
              px: 3,
              color: "#f5f5f5",
              borderColor: "#555",
              "&:hover": {
                borderColor: "#aaa",
                backgroundColor: "rgba(255,255,255,0.08)",
              },
            }}
            onClick={handleAdd}
          >
            Add
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

const MainContent = ({ selectedSites, onBack }) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flexGrow: 1,
        width: "100%",
        maxWidth: "750px",
        mx: "auto",
        px: 2,
        mt: 10,
        color: "#f5f5f5",
      }}
    >
      <Typography variant="h3" sx={{ mb: 2, fontWeight: 600, mt: 10 }}>
        AI Mode
      </Typography>
      <Typography variant="body1" sx={{ mb: 4, color: "#bbb" }}>
        Ask questions for better responses
      </Typography>
      <Paper
        component="form"
        sx={{
          p: "16px 24px",
          display: "flex",
          alignItems: "center",
          width: "100%",
          borderRadius: "24px",
          backgroundColor: "#111",
          border: "1px solid #333",
        }}
      >
        <input
          placeholder="Ask anything..."
          style={{
            width: "100%",
            border: "none",
            outline: "none",
            background: "transparent",
            color: "#f5f5f5",
            fontSize: "16px",
          }}
        />
        <Button
          type="submit"
          sx={{
            ml: 2,
            borderRadius: "12px",
            px: 3,
            background: "#fff",
            color: "#000",
            "&:hover": { background: "#e0e0e0" },
          }}
          variant="contained"
        >
          Send
        </Button>
      </Paper>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 1,
          mt: 4,
          maxHeight: 80,
          overflowY: "auto",
          mb: 3,
          p: 1,
          border: "1px solid #444",
          borderRadius: 2,
        }}
      >
        {selectedSites.map((site) => (
          <Chip
            key={site.id}
            icon={<Favicon domain={site.name} />}
            label={site.name}
            onDelete={() => onBack(site)}
            sx={{
              background: "#333",
              color: "#f5f5f5",
              fontWeight: 500,
              "&:hover": { background: "#444" },
              transition: "all 0.2s ease",
              textAlign: "left",
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

// ✅ Parent Wrapper
export default function ChatApp() {
  const [selectedSites, setSelectedSites] = useState(null);

  return selectedSites ? (
    <MainContent
      selectedSites={selectedSites}
      onBack={(site) =>
        setSelectedSites((prev) => prev.filter((s) => s.id !== site.id))
      }
    />
  ) : (
    <WebsiteSetup onStart={(sites) => setSelectedSites(sites)} />
  );
}