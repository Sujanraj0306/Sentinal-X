import React, { useState } from "react";
import {
  Box,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteIcon from "@mui/icons-material/Delete";

const initialHistoryData = [
  { id: 1, title: "How to learn React?" },
  { id: 2, title: "Best practices for responsive CSS" },
  { id: 3, title: "JavaScript closures explained" },
  { id: 4, title: "Material-UI vs. Tailwind CSS" },
  { id: 5, title: "Creating a sidebar component" },
];

const SideMenu = ({ isExpanded, setIsExpanded }) => {
  const [historyData, setHistoryData] = useState(initialHistoryData);
  const [hoveredId, setHoveredId] = useState(null);

  const handleToggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const handleDelete = (id) => {
    setHistoryData((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <Box
      sx={{
        flexShrink: 0,
        pt: 8,
        height: "calc(100vh - 65px)",
        width: isExpanded ? 260 : 68,
        transition: "width 0.25s ease-in-out",
        bgcolor: "background.paper",
        borderRight: "1px solid",
        borderColor: "divider",
        overflowX: "hidden",
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
      }}
    >
      {/* Sidebar header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: isExpanded ? "space-between" : "center",
          flexDirection: isExpanded ? "row" : "column",
          gap: isExpanded ? 1 : 2,
          width: "100%",
          px: isExpanded ? 1 : 0,
        }}
      >
        {isExpanded ? (
          <>
            <IconButton onClick={handleToggleSidebar} color="default">
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <IconButton color="default">
                <EditOutlinedIcon />
              </IconButton>
              <IconButton color="default">
                <MoreVertIcon />
              </IconButton>
            </Box>
          </>
        ) : (
          <>
            <IconButton onClick={handleToggleSidebar} color="default">
              <HistoryIcon />
            </IconButton>
            <IconButton color="default">
              <EditOutlinedIcon />
            </IconButton>
          </>
        )}
      </Box>

      {/* Recent history */}
      <Box
        sx={{
          mt: 2,
          opacity: isExpanded ? 1 : 0,
          visibility: isExpanded ? "visible" : "hidden",
          transition:
            "opacity 0.25s 0.1s ease-in-out, visibility 0.25s 0.1s ease-in-out",
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: "bold", px: 2, mb: 1 }}
        >
          Recent
        </Typography>
        <List>
          {historyData.map((item) => (
            <ListItem
              key={item.id}
              disablePadding
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              secondaryAction={
                hoveredId === item.id && (
                  <IconButton
                    edge="end"
                    color="default"
                    onClick={() => handleDelete(item.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                )
              }
            >
              <ListItemButton sx={{ borderRadius: 2 }}>
                <ListItemText
                  primary={item.title}
                  primaryTypographyProps={{
                    noWrap: true,
                    sx: { fontSize: "0.875rem" },
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Box>
  );
};

export default SideMenu;
